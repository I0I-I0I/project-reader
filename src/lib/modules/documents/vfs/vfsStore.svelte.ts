import { browser } from "$app/environment"
import { SvelteSet } from "svelte/reactivity"
import type {
    FolderNode,
    FileNode,
    VFSNodes,
    VFSNode,
    BookMetadata,
    FileContent,
    ImportCallbacks,
    ImportInput,
    ImportJob,
    ImportResult,
} from "./vfsStore.types"
import { FolderNameError } from "./vfsStore.types"
import { Database } from "../db/db"
import { PDFDocument } from "$lib/modules/pdf"
import pLimit from "p-limit"

export class VFSStore {
    nodes = $state<VFSNodes>({})
    rootIds = $state<string[]>([])
    selectedId = $state<string | null>(null)
    selectedIds = new SvelteSet<string>()
    activeFileId = $state<string | null>(null)
    currentFolderId = $state<string | null>(null)
    forwardHistory = $state<string[]>([])
    initialized = $state<boolean>(false)
    db = new Database()
    importJobs = $state<ImportJob[]>([])

    activeImportCount = $derived(this.importJobs.filter((job) => job.stage !== "failed").length)

    // Compatibility alias for status/UI call sites while the import-job model is adopted.
    uploadingFiles = $derived(this.importJobs.filter((job) => job.stage !== "failed"))

    // Transient Object URLs managed lazily
    previewUrls = $state<Record<string, string>>({})
    fileUrls = $state<Record<string, string>>({})
    isLockedMap = $state<Record<string, boolean>>({})

    allFiles = $derived(
        Object.values(this.nodes).filter((node) => node.type === "file") as FileNode[],
    )

    currentFolderDescendantIds = $derived.by(() => {
        const targetFolderId = this.currentFolderId
        if (targetFolderId === null) return new Set<string>()

        const descendantIds = new Set<string>()
        const stack = [targetFolderId]
        while (stack.length > 0) {
            const id = stack.pop()!
            const node = this.nodes[id]
            if (node && node.type === "folder") {
                for (const childId of node.childrenIds) {
                    descendantIds.add(childId)
                    stack.push(childId)
                }
            }
        }
        return descendantIds
    })

    private nativeFiles = new Map<string, File | Blob>()
    private nativeHandles = new Map<string, FileSystemFileHandle>()
    private importSources = new Map<string, File | FileSystemFileHandle>()
    private previewUrlRefs: Record<string, number> = {}
    private previewUrlRequests = new Map<string, Promise<string>>()
    private persistenceQueue = pLimit(1)
    metadataQueue = pLimit(1)
    private initializationPromise: Promise<void> | null = null
    private metadataEnrichmentOwners = 0
    private metadataEnrichmentController: AbortController | null = null
    private metadataEnrichmentTask: Promise<void> | null = null
    private metadataEnrichmentIdleId: number | null = null
    private activeMetadataDocument: PDFDocument | null = null
    private readonly handleMetadataVisibilityChange = () => {
        if (document.visibilityState === "hidden") this.pauseMetadataEnrichment()
        else if (this.metadataEnrichmentOwners > 0) this.scheduleMetadataEnrichment()
    }

    constructor(initialNodes: VFSNodes = {}) {
        this.nodes = initialNodes
        this.rootIds = Object.values(initialNodes)
            .filter((node) => node.parentId === null)
            .map((node) => node.id)
    }

    pushForwardHistory(id: string | null) {
        if (id) {
            this.forwardHistory.push(id)
        }
    }

    popForwardHistory(): string | undefined {
        return this.forwardHistory.pop()
    }

    clearForwardHistory() {
        this.forwardHistory = []
    }

    currentNodes = $derived.by(() => {
        const ids =
            this.currentFolderId === null
                ? this.rootIds
                : (this.nodes[this.currentFolderId] as FolderNode)?.childrenIds || []
        return ids.map((id) => this.nodes[id]).filter(Boolean)
    })

    sortedCurrentNodes = $derived.by(() => {
        return [...this.currentNodes].sort((a, b) => {
            if (a.type === "folder" && b.type !== "folder") return -1
            if (a.type !== "folder" && b.type === "folder") return 1
            return b.updatedAt - a.updatedAt
        })
    })

    toggleSelection(id: string) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id)
        } else {
            this.selectedIds.add(id)
        }
    }

    clearSelection() {
        this.selectedIds.clear()
    }

    selectAll(ids: string[]) {
        for (const id of ids) {
            this.selectedIds.add(id)
        }
    }

    init(): Promise<void> {
        if (!browser || this.initialized) return Promise.resolve()
        if (this.initializationPromise) return this.initializationPromise

        const initialization = (async () => {
            try {
                // Only load metadata on startup; previews and Object URLs remain lazy.
                const [allFolders, allFiles] = await Promise.all([
                    this.db.folders.getAll(),
                    this.db.files.getAll(),
                ])

                const newNodes: VFSNodes = {}
                const lockedMap: Record<string, boolean> = {}
                for (const folder of allFolders) newNodes[folder.id] = folder
                for (const fileNode of allFiles) {
                    newNodes[fileNode.id] = fileNode
                    lockedMap[fileNode.id] = fileNode.isLocked ?? true
                }

                this.nodes = newNodes
                this.isLockedMap = lockedMap
                this.rootIds = Object.values(newNodes)
                    .filter((node) => node.parentId === null)
                    .map((node) => node.id)
                this.initialized = true
            } catch (err) {
                this.initialized = false
                console.error("VFS initialization failed:", err)
            }
        })()

        this.initializationPromise = initialization
        void initialization.finally(() => {
            if (this.initializationPromise === initialization) {
                this.initializationPromise = null
            }
        })
        return initialization
    }

    acquireMetadataEnrichment(): () => void {
        if (!browser) return () => undefined
        this.metadataEnrichmentOwners += 1
        if (this.metadataEnrichmentOwners === 1) {
            document.addEventListener("visibilitychange", this.handleMetadataVisibilityChange)
            this.scheduleMetadataEnrichment()
        }

        let released = false
        return () => {
            if (released) return
            released = true
            this.metadataEnrichmentOwners = Math.max(0, this.metadataEnrichmentOwners - 1)
            if (this.metadataEnrichmentOwners === 0) {
                document.removeEventListener(
                    "visibilitychange",
                    this.handleMetadataVisibilityChange,
                )
                this.pauseMetadataEnrichment()
            }
        }
    }

    private scheduleMetadataEnrichment() {
        if (
            this.metadataEnrichmentOwners === 0 ||
            document.visibilityState === "hidden" ||
            this.metadataEnrichmentTask ||
            this.metadataEnrichmentIdleId !== null
        ) {
            return
        }

        const start = () => {
            this.metadataEnrichmentIdleId = null
            if (this.metadataEnrichmentOwners === 0 || document.visibilityState === "hidden") return
            const controller = new AbortController()
            this.metadataEnrichmentController = controller
            const task = this.runMetadataEnrichment(controller.signal)
            this.metadataEnrichmentTask = task
            void task.finally(() => {
                if (this.metadataEnrichmentTask === task) this.metadataEnrichmentTask = null
                if (this.metadataEnrichmentController === controller) {
                    this.metadataEnrichmentController = null
                }
                if (
                    controller.signal.aborted &&
                    this.metadataEnrichmentOwners > 0 &&
                    document.visibilityState === "visible"
                ) {
                    this.scheduleMetadataEnrichment()
                }
            })
        }

        if (typeof requestIdleCallback !== "undefined") {
            this.metadataEnrichmentIdleId = requestIdleCallback(start, { timeout: 2000 })
        } else {
            this.metadataEnrichmentIdleId = window.setTimeout(start, 250)
        }
    }

    private async runMetadataEnrichment(signal: AbortSignal) {
        await this.init()
        const candidates = this.allFiles.filter((file) => !file.metadata.totalPages)
        for (const candidate of candidates) {
            if (signal.aborted || document.visibilityState === "hidden") return
            await this.enrichLegacyMetadata(candidate.id, signal)
            if (signal.aborted) return
            await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
        }
    }

    private async enrichLegacyMetadata(id: string, signal: AbortSignal) {
        const node = this.nodes[id]
        if (!node || node.type !== "file" || node.metadata.totalPages) return
        const url = await this.getFileUrl(id)
        if (!url || signal.aborted) return

        const doc = new PDFDocument(url)
        this.activeMetadataDocument = doc
        try {
            await doc.load()
            if (signal.aborted) return
            const [totalPages, author] = await Promise.all([doc.getPageNumber(), doc.getAuthor()])
            if (signal.aborted) return
            await this.updateFile(id, { metadata: { totalPages, author: author ?? null } }, true)
        } catch (error) {
            if (!signal.aborted) {
                console.warn(`[VFSStore] Failed to enrich metadata for node ${id}:`, error)
            }
        } finally {
            if (this.activeMetadataDocument === doc) this.activeMetadataDocument = null
            await doc.close()
            if (this.isLockedMap[id]) this.revokeFileUrl(id)
        }
    }

    private pauseMetadataEnrichment() {
        if (this.metadataEnrichmentIdleId !== null) {
            if (typeof cancelIdleCallback !== "undefined") {
                cancelIdleCallback(this.metadataEnrichmentIdleId)
            } else {
                clearTimeout(this.metadataEnrichmentIdleId)
            }
            this.metadataEnrichmentIdleId = null
        }
        this.metadataEnrichmentController?.abort()
        this.metadataEnrichmentController = null
        void this.activeMetadataDocument?.close()
    }

    async dispose() {
        this.metadataEnrichmentOwners = 0
        if (browser) {
            document.removeEventListener("visibilitychange", this.handleMetadataVisibilityChange)
        }
        this.pauseMetadataEnrichment()
        await this.metadataEnrichmentTask?.catch(() => undefined)
        this.metadataEnrichmentTask = null
        for (const id of Object.keys(this.fileUrls)) this.revokeFileUrl(id)
        for (const id of Object.keys(this.previewUrls)) this.revokePreviewUrl(id, true)
        const close = (this.db as unknown as { close?: () => void }).close
        close?.call(this.db)
    }

    /**
     * Lazily fetches and creates an Object URL for a node's preview.
     */
    async getPreviewUrl(id: string): Promise<string> {
        this.previewUrlRefs[id] = (this.previewUrlRefs[id] || 0) + 1
        if (this.previewUrls[id]) return this.previewUrls[id]

        const pending = this.previewUrlRequests.get(id)
        if (pending) return pending

        const request = this.loadPreviewUrl(id)
        this.previewUrlRequests.set(id, request)
        try {
            return await request
        } finally {
            if (this.previewUrlRequests.get(id) === request) this.previewUrlRequests.delete(id)
        }
    }

    private async loadPreviewUrl(id: string): Promise<string> {
        try {
            const cachedPreview = await this.db.previews.get(id)
            if (cachedPreview) {
                return this.publishPreviewUrl(id, URL.createObjectURL(cachedPreview.data))
            }

            const fileUrl = await this.getFileUrl(id)
            if (fileUrl) {
                const doc = new PDFDocument(fileUrl)
                try {
                    await doc.load()
                    const page = await doc.getPage(1)
                    const pageUrl = await doc.getCanvasPage(page)
                    if (pageUrl) {
                        await this.savePreview(id, pageUrl)
                        URL.revokeObjectURL(pageUrl)

                        const newCachedPreview = await this.db.previews.get(id)
                        if (newCachedPreview) {
                            return this.publishPreviewUrl(
                                id,
                                URL.createObjectURL(newCachedPreview.data),
                            )
                        }
                    }
                } catch (err) {
                    console.warn(
                        `[VFSStore] Failed to dynamically generate preview for node ${id}:`,
                        err,
                    )
                } finally {
                    await doc.close()
                    if (this.isLockedMap[id]) {
                        this.revokeFileUrl(id)
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to load preview for node ${id}:`, e)
        }
        return ""
    }

    private publishPreviewUrl(id: string, url: string): string {
        if (!this.previewUrlRefs[id]) {
            URL.revokeObjectURL(url)
            return ""
        }
        this.previewUrls[id] = url
        return url
    }

    async invalidatePreview(id: string) {
        await this.db.previews.delete(id)
        const url = this.previewUrls[id]
        if (url) URL.revokeObjectURL(url)
        delete this.previewUrls[id]
    }

    revokePreviewUrl(id: string, force = false) {
        if (force) {
            delete this.previewUrlRefs[id]
        } else {
            if (!this.previewUrlRefs[id]) return
            this.previewUrlRefs[id]--
        }

        if (force || !this.previewUrlRefs[id] || this.previewUrlRefs[id] <= 0) {
            const url = this.previewUrls[id]
            if (url) {
                URL.revokeObjectURL(url)
                delete this.previewUrls[id]
            }
            delete this.previewUrlRefs[id]
        }
    }

    /**
     * Lazily fetches and creates an Object URL for a file's content.
     */
    async getFileUrl(id: string, requestPermission = false): Promise<string> {
        if (this.fileUrls[id]) return this.fileUrls[id]

        const node = this.nodes[id]
        if (!node || node.type !== "file") return ""

        try {
            let nativeFile = this.nativeFiles.get(id)
            let nativeHandle = this.nativeHandles.get(id)

            if (!nativeFile && !nativeHandle) {
                const content = await this.db.fileContents.get(id)
                if (content) {
                    if (content.file) {
                        nativeFile = content.file
                        this.nativeFiles.set(id, nativeFile)
                    }
                    if (content.handle) {
                        nativeHandle = content.handle
                        this.nativeHandles.set(id, nativeHandle)
                    }
                }
            }

            if (nativeFile) {
                const url = URL.createObjectURL(nativeFile)
                this.fileUrls[id] = url
                this.isLockedMap[id] = false
                return url
            } else if (nativeHandle) {
                let status = await nativeHandle.queryPermission({ mode: "read" })
                if (status !== "granted" && requestPermission) {
                    status = await nativeHandle.requestPermission({ mode: "read" })
                }
                if (status === "granted") {
                    const fileObj = await nativeHandle.getFile()
                    const url = URL.createObjectURL(fileObj)
                    this.fileUrls[id] = url
                    this.isLockedMap[id] = false
                    return url
                }
            }
        } catch (e) {
            console.error(`Failed to create file URL for node ${id}:`, e)
        }

        this.isLockedMap[id] = true
        return ""
    }

    revokeFileUrl(id: string) {
        const url = this.fileUrls[id]
        if (url) {
            URL.revokeObjectURL(url)
            delete this.fileUrls[id]
        }
    }

    importFiles(
        inputs: ImportInput[],
        parentId: string | null,
        callbacks: ImportCallbacks = {},
    ): Promise<ImportResult[]> {
        const rejected = new Map<number, ImportResult>()
        const acceptedIndexes: number[] = []
        const accepted = inputs.flatMap((input, inputIndex) => {
            const isPdf =
                input.name.toLowerCase().endsWith(".pdf") ||
                (this.isFileSource(input.source) && input.source.type === "application/pdf")
            if (!isPdf) {
                const result: ImportResult = {
                    id: crypto.randomUUID(),
                    name: input.name,
                    status: "rejected",
                }
                rejected.set(inputIndex, result)
                callbacks.onFailure?.(result, "validation")
                return []
            }
            const job: ImportJob = {
                id: crypto.randomUUID(),
                name: input.name,
                parentId,
                stage: "queued",
            }
            this.importSources.set(job.id, input.source)
            acceptedIndexes.push(inputIndex)
            return [job]
        })

        // One assignment makes the complete batch observable before any persistence starts.
        this.importJobs = [...this.importJobs, ...accepted]

        const saveTasks = accepted.map((job) =>
            this.persistenceQueue(() => this.persistImport(job, callbacks)),
        )
        const completionTasks = accepted.map((job, index) =>
            this.metadataQueue(async () => {
                const persisted = await saveTasks[index]
                if (!persisted) {
                    return { id: job.id, name: job.name, status: "failed" } as ImportResult
                }
                return this.enrichImport(job, callbacks)
            }),
        )

        return Promise.all(completionTasks).then((results) => {
            const imported = new Map(
                acceptedIndexes.map((inputIndex, resultIndex) => [
                    inputIndex,
                    results[resultIndex],
                ]),
            )
            return inputs.map(
                (_, inputIndex) => rejected.get(inputIndex) ?? imported.get(inputIndex)!,
            )
        })
    }

    private isFileSource(source: File | FileSystemFileHandle): source is File {
        return typeof File !== "undefined" && source instanceof File
    }

    private updateImportJob(id: string, updates: Partial<ImportJob>) {
        this.importJobs = this.importJobs.map((job) =>
            job.id === id ? { ...job, ...updates } : job,
        )
    }

    private removeImportJob(id: string) {
        this.importJobs = this.importJobs.filter((job) => job.id !== id)
        this.importSources.delete(id)
    }

    clearFailedImports() {
        const failedIds = new Set(
            this.importJobs.filter((job) => job.stage === "failed").map((job) => job.id),
        )
        this.importJobs = this.importJobs.filter((job) => job.stage !== "failed")
        for (const id of failedIds) this.importSources.delete(id)
    }

    private async persistImport(job: ImportJob, callbacks: ImportCallbacks): Promise<boolean> {
        this.updateImportJob(job.id, { stage: "saving" })
        const source = this.importSources.get(job.id)
        if (!source) return false

        try {
            const isFile = this.isFileSource(source)
            const file = isFile ? source : await source.getFile()
            const now = Date.now()
            const siblingTimestamps = Object.values(this.nodes)
                .filter((node) => node.parentId === job.parentId && node.type === "file")
                .map((node) => node.updatedAt)
            const displayTimestamp = Math.min(now, ...siblingTimestamps) - 1
            const node: FileNode = {
                id: job.id,
                name: job.name,
                type: "file",
                parentId: job.parentId,
                size: file.size,
                createdAt: now,
                updatedAt: displayTimestamp,
                metadata: { pageNumber: 1 },
                isLocked: !isFile,
            }
            const content: FileContent = isFile
                ? { id: job.id, file: new Blob([file], { type: file.type }) }
                : { id: job.id, handle: source }

            await this.db.transaction("rw", ["books", "folders", "fileContents"], async () => {
                await this.db.files.put(node)
                await this.db.fileContents.put(content)
                if (job.parentId !== null) {
                    const parent = this.nodes[job.parentId]
                    if (parent?.type === "folder") {
                        await this.db.folders.put(
                            $state.snapshot({
                                ...parent,
                                childrenIds: [...parent.childrenIds, job.id],
                                updatedAt: now,
                            }) as FolderNode,
                        )
                    }
                }
            })

            if (isFile) this.nativeFiles.set(job.id, content.file!)
            else this.nativeHandles.set(job.id, source)
            this.nodes[job.id] = node
            this.isLockedMap[job.id] = !isFile
            if (job.parentId === null) {
                this.rootIds.push(job.id)
            } else {
                const parent = this.nodes[job.parentId]
                if (parent?.type === "folder") {
                    parent.childrenIds.push(job.id)
                    parent.updatedAt = now
                }
            }
            this.updateImportJob(job.id, { stage: "metadata" })
            return true
        } catch (error) {
            console.error(`[VFSStore] Failed to persist import ${job.name}:`, error)
            this.updateImportJob(job.id, { stage: "failed", failure: "persistence" })
            callbacks.onFailure?.({ id: job.id, name: job.name, status: "failed" }, "persistence")
            return false
        }
    }

    private async enrichImport(job: ImportJob, callbacks: ImportCallbacks): Promise<ImportResult> {
        const source = this.importSources.get(job.id)
        let tempUrl = ""
        let doc: PDFDocument | null = null
        let previewUrl = ""
        let failed = false
        try {
            if (!source) throw new Error("Import source is unavailable")
            const file = this.isFileSource(source) ? source : await source.getFile()
            tempUrl = URL.createObjectURL(file)
            doc = new PDFDocument(tempUrl)
            await doc.load()

            const [totalPages, author, pdfTitle] = await Promise.all([
                doc.getPageNumber(),
                doc.getAuthor(),
                doc.getTitle(),
            ])
            await this.updateFile(
                job.id,
                {
                    metadata: {
                        pageNumber: 1,
                        totalPages,
                        author,
                        pdfTitle: pdfTitle?.trim() || null,
                    },
                },
                true,
            )

            const page = await doc.getPage(1)
            previewUrl = await doc.getCanvasPage(page)
            if (previewUrl) await this.savePreview(job.id, previewUrl, true)
        } catch (error) {
            failed = true
            console.error(`[VFSStore] Failed to enrich import ${job.name}:`, error)
            callbacks.onFailure?.({ id: job.id, name: job.name, status: "imported" }, "metadata")
        } finally {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            await doc?.close()
            if (tempUrl) URL.revokeObjectURL(tempUrl)
            this.removeImportJob(job.id)
        }

        const result: ImportResult = { id: job.id, name: job.name, status: "imported" }
        await callbacks.onImported?.(result)
        if (failed && this.isLockedMap[job.id]) this.revokeFileUrl(job.id)
        return result
    }

    async createFile(
        name: string,
        parentId: string | null,
        fileSource: File | FileSystemFileHandle,
        metadata: Partial<BookMetadata> = {},
    ): Promise<string> {
        const [result] = await this.importFiles([{ name, source: fileSource }], parentId)
        if (!result || result.status !== "imported") throw new Error(`Failed to import ${name}`)
        if (Object.keys(metadata).length > 0) await this.updateFile(result.id, { metadata })
        return result.id
    }

    normalizeFolderName(
        requestedName: string,
        parentId: string | null,
        excludeFolderId?: string,
    ): string {
        const name = requestedName.trim()
        if (!name) throw new FolderNameError("empty")
        if (name.includes("/")) throw new FolderNameError("slash")
        const duplicate = Object.values(this.nodes).some(
            (node) =>
                node.type === "folder" &&
                node.parentId === parentId &&
                node.id !== excludeFolderId &&
                node.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
        if (duplicate) throw new FolderNameError("duplicate")
        return name
    }

    async renameFolder(id: string, requestedName: string): Promise<void> {
        const node = this.nodes[id]
        if (!node || node.type !== "folder") return
        const name = this.normalizeFolderName(requestedName, node.parentId, id)
        if (name === node.name) return

        const updated: FolderNode = { ...$state.snapshot(node), name, updatedAt: Date.now() }
        await this.db.folders.put(updated)
        this.nodes[id] = updated
    }

    async createFolder(name: string, parentId: string | null): Promise<string> {
        const normalizedName = this.normalizeFolderName(name, parentId)
        const id = crypto.randomUUID()
        const now = Date.now()
        const newFolder: FolderNode = {
            id,
            name: normalizedName,
            type: "folder",
            parentId,
            childrenIds: [],
            createdAt: now,
            updatedAt: now,
        }

        await this.db.transaction("rw", ["folders"], async () => {
            await this.db.folders.put(newFolder)
            if (parentId !== null) {
                const parent = this.nodes[parentId]
                if (parent && parent.type === "folder") {
                    const updatedParent = {
                        ...parent,
                        childrenIds: [...parent.childrenIds, id],
                        updatedAt: now,
                    }
                    await this.db.folders.put($state.snapshot(updatedParent) as FolderNode)
                }
            }
        })

        this.nodes[id] = newFolder
        if (parentId === null) {
            this.rootIds.push(id)
        } else {
            const parent = this.nodes[parentId]
            if (parent && parent.type === "folder") {
                parent.childrenIds.push(id)
                parent.updatedAt = now
            }
        }

        return id
    }

    async deleteNode(id: string) {
        const rootNode = this.nodes[id]
        if (!rootNode) return

        const nodesToDelete: VFSNode[] = []
        const collect = (nodeId: string) => {
            const node = this.nodes[nodeId]
            if (!node) return
            nodesToDelete.push(node)
            if (node.type === "folder") {
                for (const cid of node.childrenIds) {
                    collect(cid)
                }
            }
        }
        collect(id)

        const fileIds = nodesToDelete.filter((n) => n.type === "file").map((n) => n.id)
        const folderIds = nodesToDelete.filter((n) => n.type === "folder").map((n) => n.id)
        const now = Date.now()

        // PHASE 4 OPTIMIZATION: Use bulkDelete for efficient batch removal
        await this.db.transaction(
            "rw",
            [
                "books",
                "folders",
                "previews",
                "fileContents",
                "indexedTexts",
                "userNotes",
                "bookmarks",
            ],
            async () => {
                if (fileIds.length > 0) {
                    await this.db.files.bulkDelete(fileIds)
                    await this.db.previews.bulkDelete(fileIds)
                    await this.db.fileContents.bulkDelete(fileIds)
                    await Promise.all([
                        ...fileIds.map((fid) => this.db.indexedTexts.deleteByBookId(fid)),
                        ...fileIds.map((fid) => this.db.userNotes.deleteByBookId(fid)),
                        ...fileIds.map((fid) => this.db.bookmarks.deleteByBookId(fid)),
                    ])
                }
                if (folderIds.length > 0) {
                    await this.db.folders.bulkDelete(folderIds)
                }

                if (rootNode.parentId !== null) {
                    const parent = this.nodes[rootNode.parentId]
                    if (parent && parent.type === "folder") {
                        const updatedParent = {
                            ...parent,
                            childrenIds: parent.childrenIds.filter((cid) => cid !== id),
                            updatedAt: now,
                        }
                        await this.db.folders.put($state.snapshot(updatedParent) as FolderNode)
                    }
                }
            },
        )

        for (const node of nodesToDelete) {
            if (node.type === "file") {
                this.nativeFiles.delete(node.id)
                this.nativeHandles.delete(node.id)
                this.revokeFileUrl(node.id)
                this.revokePreviewUrl(node.id, true)
                delete this.isLockedMap[node.id]
            }
            if (this.selectedId === node.id) this.selectedId = null
            if (this.activeFileId === node.id) this.activeFileId = null
            this.selectedIds.delete(node.id)

            delete this.nodes[node.id]
        }

        if (rootNode.parentId === null) {
            this.rootIds = this.rootIds.filter((rid) => rid !== id)
        } else {
            const parent = this.nodes[rootNode.parentId]
            if (parent && parent.type === "folder") {
                parent.childrenIds = parent.childrenIds.filter((cid) => cid !== id)
                parent.updatedAt = now
            }
        }
    }

    async updateFile(
        id: string,
        updates: Omit<Partial<FileNode>, "metadata"> & { metadata?: Partial<BookMetadata> },
        preserveUpdatedAt = false,
    ) {
        const node = this.nodes[id]
        if (node && node.type === "file") {
            if (updates.name !== undefined) node.name = updates.name
            if (updates.metadata !== undefined) {
                node.metadata = { ...node.metadata, ...updates.metadata }
            }
            if (updates.isLocked !== undefined) this.isLockedMap[id] = updates.isLocked

            if (!preserveUpdatedAt) node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }
    }

    async updateNode(id: string, updates: Partial<VFSNode>) {
        const node = this.nodes[id]
        if (!node) return

        if (node.type === "file") {
            await this.updateFile(id, updates as Partial<FileNode>)
        } else {
            const folderUpdates = updates as Partial<FolderNode>
            if (folderUpdates.name !== undefined) node.name = folderUpdates.name
            if (folderUpdates.childrenIds !== undefined)
                node.childrenIds = folderUpdates.childrenIds

            node.updatedAt = Date.now()
            await this.db.folders.put($state.snapshot(node) as FolderNode)
        }
    }

    async savePreview(
        id: string,
        previewDataUrl: string,
        preserveUpdatedAt = false,
    ): Promise<void> {
        let blob: Blob
        if (previewDataUrl.startsWith("blob:") || previewDataUrl.startsWith("data:")) {
            try {
                const response = await fetch(previewDataUrl)
                blob = await response.blob()
            } catch (e) {
                console.error("Failed to fetch blob for preview", e)
                return
            }
        } else {
            return
        }

        await this.db.previews.put({ id, data: blob })

        const node = this.nodes[id]
        if (node && node.type === "file") {
            const existingUrl = this.previewUrls[id]
            if (existingUrl) URL.revokeObjectURL(existingUrl)
            delete this.previewUrls[id]
            if (!preserveUpdatedAt) node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }
    }

    async restoreFileAccess(id: string): Promise<string> {
        this.revokeFileUrl(id)
        const url = await this.getFileUrl(id, true)
        if (!url) throw new Error("Failed to restore file access")

        const node = this.nodes[id]
        if (node && node.type === "file") {
            node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }

        return url
    }

    async relinkFile(id: string, fileSource: File | FileSystemFileHandle): Promise<void> {
        const isFile = fileSource instanceof File
        let fileObj: File | null = null
        try {
            fileObj = isFile
                ? (fileSource as File)
                : await (fileSource as FileSystemFileHandle).getFile()
        } catch (e) {
            console.error("Failed to retrieve file object during VFS relinking:", e)
        }

        const fileContent: FileContent = { id }
        if (isFile) {
            const file = fileObj || (fileSource as File)
            fileContent.file = new Blob([file], { type: file.type })
        } else {
            fileContent.handle = fileSource as FileSystemFileHandle
        }

        await this.db.fileContents.put(fileContent)

        if (isFile) {
            this.nativeFiles.set(id, fileContent.file!)
            this.nativeHandles.delete(id)
        } else {
            this.nativeHandles.set(id, fileContent.handle!)
            this.nativeFiles.delete(id)
        }

        const node = this.nodes[id]
        if (node && node.type === "file") {
            node.isLocked = false
            this.isLockedMap[id] = false
            node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }
    }

    private async saveFileToDb(node: FileNode): Promise<void> {
        const plainNode = $state.snapshot(node)
        plainNode.isLocked = this.isLockedMap[node.id]
        if (plainNode.metadata) {
            plainNode.metadata.pageNumber = plainNode.metadata.pageNumber || 1
        }
        await this.db.files.put(plainNode)
    }

    async moveNode(id: string, newParentId: string | null) {
        const node = this.nodes[id]
        if (!node) return

        if (node.type === "folder" && newParentId !== null) {
            let currentId: string | null = newParentId
            while (currentId) {
                if (currentId === id) {
                    throw new Error("Cannot move a folder into itself or its descendants")
                }
                const current: VFSNode | undefined = this.nodes[currentId]
                currentId = current ? current.parentId : null
            }
        }

        const oldParentId = node.parentId
        if (oldParentId === newParentId) return

        const now = Date.now()
        node.parentId = newParentId
        node.updatedAt = now

        await this.db.transaction("rw", ["books", "folders"], async () => {
            if (node.type === "file") {
                await this.saveFileToDb(node as FileNode)
            } else {
                await this.db.folders.put($state.snapshot(node) as FolderNode)
            }

            if (oldParentId !== null) {
                const oldParent = this.nodes[oldParentId]
                if (oldParent && oldParent.type === "folder") {
                    const updatedOldParent = {
                        ...oldParent,
                        childrenIds: oldParent.childrenIds.filter((cid) => cid !== id),
                        updatedAt: now,
                    }
                    await this.db.folders.put($state.snapshot(updatedOldParent) as FolderNode)
                }
            }

            if (newParentId !== null) {
                const newParent = this.nodes[newParentId]
                if (newParent && newParent.type === "folder") {
                    const updatedNewParent = {
                        ...newParent,
                        childrenIds: [...newParent.childrenIds, id],
                        updatedAt: now,
                    }
                    await this.db.folders.put($state.snapshot(updatedNewParent) as FolderNode)
                }
            }
        })

        if (oldParentId === null) {
            this.rootIds = this.rootIds.filter((rid) => rid !== id)
        } else {
            const oldParent = this.nodes[oldParentId]
            if (oldParent && oldParent.type === "folder") {
                oldParent.childrenIds = oldParent.childrenIds.filter((cid) => cid !== id)
                oldParent.updatedAt = now
            }
        }

        if (newParentId === null) {
            this.rootIds.push(id)
        } else {
            const newParent = this.nodes[newParentId]
            if (newParent && newParent.type === "folder") {
                newParent.childrenIds.push(id)
                newParent.updatedAt = now
            }
        }
    }

    selectNode(id: string | null) {
        this.selectedId = id
        if (id && this.nodes[id]?.type === "file") {
            this.activeFileId = id
        }
    }

    getNodePath(id: string): string {
        const node = this.nodes[id]
        if (!node) return ""

        const path: string[] = [node.name]
        let currentParentId = node.parentId

        while (currentParentId) {
            const parent = this.nodes[currentParentId]
            if (parent) {
                path.unshift(parent.name)
                currentParentId = parent.parentId
            } else {
                break
            }
        }

        return path.join(" / ")
    }

    getFolderPath(id: string | null): string {
        if (!id) return ""
        const node = this.nodes[id]
        if (!node) return ""

        const path: string[] = [node.name]
        let currentParentId = node.parentId

        while (currentParentId) {
            const parent = this.nodes[currentParentId]
            if (parent) {
                path.unshift(parent.name)
                currentParentId = parent.parentId
            } else {
                break
            }
        }

        return "/" + path.join("/")
    }

    getFolderIdByPath(path: string | null): string | null {
        if (!path) return null
        const cleanPath = path.startsWith("/") ? path.slice(1) : path
        if (!cleanPath) return null

        const segments = cleanPath
            .split("/")
            .map((s) => s.trim())
            .filter(Boolean)
        if (segments.length === 0) return null

        const folders = Object.values(this.nodes).filter(
            (node) => node.type === "folder",
        ) as FolderNode[]

        let currentId: string | null = null
        for (const segment of segments) {
            const nextNode = folders.find(
                (node) =>
                    node.parentId === currentId &&
                    node.name.toLowerCase() === segment.toLowerCase(),
            )
            if (!nextNode) {
                return null
            }
            currentId = nextNode.id
        }

        return currentId
    }
}

export const vfsStore = new VFSStore()

if (import.meta.hot) {
    import.meta.hot.dispose(() => vfsStore.dispose())
}

export function usePreviewUrl(nodeId: () => string) {
    let url = $state("")
    $effect(() => {
        const id = nodeId()
        if (!id) return
        let active = true
        vfsStore.getPreviewUrl(id).then((val) => {
            if (active) url = val
        })
        return () => {
            active = false
            vfsStore.revokePreviewUrl(id)
        }
    })
    return {
        get url() {
            return url
        },
        async regenerate() {
            const id = nodeId()
            if (!id) return
            await vfsStore.invalidatePreview(id)
            url = await vfsStore.getPreviewUrl(id)
            vfsStore.revokePreviewUrl(id)
        },
    }
}
