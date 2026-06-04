import { browser } from "$app/environment"
import { SvelteSet } from "svelte/reactivity"
import type {
    FolderNode,
    FileNode,
    VFSNodes,
    VFSNode,
    BookMetadata,
    FileContent,
} from "./vfsStore.types"
import { Database } from "$lib/stores/db"
import PDFDocument from "$lib/pdf"
import { settingsStore } from "$lib/stores/settingsStore.svelte"
import pLimit from "p-limit"

class VFSStore {
    nodes = $state<VFSNodes>({})
    rootIds = $state<string[]>([])
    selectedId = $state<string | null>(null)
    selectedIds = new SvelteSet<string>()
    activeFileId = $state<string | null>(null)
    currentFolderId = $state<string | null>(null)
    forwardHistory = $state<string[]>([])
    initialized = $state<boolean>(false)
    db = new Database()

    // Transient Object URLs managed lazily
    previewUrls = $state<Record<string, string>>({})
    fileUrls = $state<Record<string, string>>({})
    isLockedMap = $state<Record<string, boolean>>({})

    private nativeFiles = new Map<string, File>()
    private nativeHandles = new Map<string, FileSystemFileHandle>()
    private previewUrlRefs: Record<string, number> = {}
    metadataQueue = pLimit(2)

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

    get currentNodes() {
        return Object.values(this.nodes).filter((node) => node.parentId === this.currentFolderId)
    }

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

    async init() {
        if (!browser) return

        try {
            // PHASE 2 OPTIMIZATION: Only load metadata on startup.
            // No N+1 queries for previews, no eager Object URLs.
            const [allFolders, allFiles, allContents] = await Promise.all([
                this.db.folders.getAll(),
                this.db.files.getAll(),
                this.db.fileContents.getAll(),
            ])

            for (const c of allContents) {
                if (c.file) this.nativeFiles.set(c.id, c.file)
                if (c.handle) this.nativeHandles.set(c.id, c.handle)
            }

            const newNodes: VFSNodes = {}
            for (const f of allFolders) {
                newNodes[f.id] = f
            }

            for (const fileNode of allFiles) {
                newNodes[fileNode.id] = fileNode
                this.isLockedMap[fileNode.id] = !this.nativeFiles.has(fileNode.id)
            }

            this.nodes = newNodes
            this.rootIds = Object.values(newNodes)
                .filter((node) => node.parentId === null)
                .map((node) => node.id)
        } catch (err) {
            console.error("VFS initialization failed:", err)
        } finally {
            this.initialized = true
        }
    }

    /**
     * Lazily fetches and creates an Object URL for a node's preview.
     */
    async getPreviewUrl(id: string): Promise<string> {
        this.previewUrlRefs[id] = (this.previewUrlRefs[id] || 0) + 1
        if (this.previewUrls[id]) return this.previewUrls[id]

        try {
            const cachedPreview = await this.db.previews.get(id)
            if (cachedPreview) {
                const url = URL.createObjectURL(cachedPreview.data)
                this.previewUrls[id] = url
                return url
            }
        } catch (e) {
            console.error(`Failed to load preview for node ${id}:`, e)
        }
        return ""
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
    async getFileUrl(id: string): Promise<string> {
        if (this.fileUrls[id]) return this.fileUrls[id]

        const node = this.nodes[id]
        if (!node || node.type !== "file") return ""

        try {
            const nativeFile = this.nativeFiles.get(id)
            const nativeHandle = this.nativeHandles.get(id)

            if (nativeFile) {
                const url = URL.createObjectURL(nativeFile)
                this.fileUrls[id] = url
                this.isLockedMap[id] = false
                return url
            } else if (nativeHandle) {
                const status = await nativeHandle.queryPermission({ mode: "read" })
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

    async createFile(
        name: string,
        parentId: string | null,
        fileSource: File | FileSystemFileHandle,
        metadata: Partial<BookMetadata> = {},
    ): Promise<string> {
        const id = crypto.randomUUID()
        const isFile = fileSource instanceof File

        let fileObj: File | null = null
        try {
            fileObj = isFile
                ? (fileSource as File)
                : await (fileSource as FileSystemFileHandle).getFile()
        } catch (e) {
            console.error("Failed to retrieve file object during VFS file creation:", e)
        }

        // No manual cloning to ArrayBuffer to avoid high memory pressure.
        // Dexie can store Blob/File objects directly.

        let previewBlob: Blob | null = null
        let totalPages: number | undefined = undefined
        let author: string | null | undefined = undefined

        if (fileObj) {
            const tempUrl = URL.createObjectURL(fileObj)
            const doc = new PDFDocument(tempUrl)
            try {
                await doc.load(settingsStore.scale)
                totalPages = await doc.getPageNumber()
                author = await doc.getAuthor()
                const page = await doc.getPage(1)
                const pageUrl = await doc.getCanvasPage(page)
                if (pageUrl) {
                    try {
                        const response = await fetch(pageUrl)
                        previewBlob = await response.blob()
                    } catch (e) {
                        console.error("Failed to save preview blob during creation:", e)
                    }
                    URL.revokeObjectURL(pageUrl)
                }
            } catch (err) {
                console.error("Failed to extract PDF preview during import:", err)
            } finally {
                await doc.close()
                URL.revokeObjectURL(tempUrl)
            }
        }

        const now = Date.now()

        const newFile: FileNode = {
            id,
            name,
            type: "file",
            parentId,
            size: isFile && fileObj ? fileObj.size : isFile ? (fileSource as File).size : 0,
            createdAt: now,
            updatedAt: now,
            metadata: {
                pageNumber: 1,
                totalPages,
                author,
                ...metadata,
            },
            isLocked: !isFile,
        }

        const fileContent: FileContent = { id }
        if (isFile) {
            fileContent.file = fileObj || (fileSource as File)
        } else {
            fileContent.handle = fileSource as FileSystemFileHandle
        }

        await this.db.transaction(
            "rw",
            ["books", "folders", "previews", "fileContents"],
            async () => {
                await this.db.files.put(newFile)
                await this.db.fileContents.put(fileContent)
                if (previewBlob) {
                    await this.db.previews.put({ id, data: previewBlob })
                }
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
            },
        )

        if (isFile) {
            this.nativeFiles.set(id, fileContent.file!)
        } else {
            this.nativeHandles.set(id, fileContent.handle!)
        }

        this.nodes[id] = newFile
        this.isLockedMap[id] = !isFile

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

    async createFolder(name: string, parentId: string | null): Promise<string> {
        const id = crypto.randomUUID()
        const now = Date.now()
        const newFolder: FolderNode = {
            id,
            name,
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
            ["books", "folders", "previews", "fileContents"],
            async () => {
                if (fileIds.length > 0) {
                    await this.db.files.bulkDelete(fileIds)
                    await this.db.previews.bulkDelete(fileIds)
                    await this.db.fileContents.bulkDelete(fileIds)
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

    async updateFile(id: string, updates: Partial<FileNode>) {
        const node = this.nodes[id]
        if (node && node.type === "file") {
            if (updates.name !== undefined) node.name = updates.name
            if (updates.metadata !== undefined) {
                node.metadata = { ...node.metadata, ...updates.metadata }
            }
            if (updates.isLocked !== undefined) this.isLockedMap[id] = updates.isLocked

            node.updatedAt = Date.now()
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

    async savePreview(id: string, previewDataUrl: string): Promise<void> {
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
            this.revokePreviewUrl(id, true)
            node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }
    }

    async restoreFileAccess(id: string): Promise<string> {
        this.revokeFileUrl(id)
        const url = await this.getFileUrl(id)
        if (!url) throw new Error("Failed to restore file access")

        const node = this.nodes[id]
        if (node && node.type === "file") {
            node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }

        return url
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

        let currentId: string | null = null
        for (const segment of segments) {
            const nextNode = Object.values(this.nodes).find(
                (node) =>
                    node.type === "folder" &&
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
            vfsStore.revokePreviewUrl(id)
            url = await vfsStore.getPreviewUrl(id)
        },
    }
}
