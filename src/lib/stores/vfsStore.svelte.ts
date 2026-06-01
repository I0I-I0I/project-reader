import { browser } from "$app/environment"
import type { FolderNode, FileNode, VFSNodes, VFSNode, BookMetadata } from "./vfsStore.types"
import { Database } from "$lib/stores/db"
import PDFDocument from "$lib/pdf"
import { settingsStore } from "$lib/stores/settingsStore.svelte"

class VFSStore {
    nodes = $state<VFSNodes>({})
    rootIds = $state<string[]>([])
    selectedId = $state<string | null>(null)
    activeFileId = $state<string | null>(null)
    currentFolderId = $state<string | null>(null)
    initialized = $state<boolean>(false)
    db = new Database()

    // Non-reactive storage for native File and FileSystemFileHandle objects
    // to prevent Svelte 5 from proxying them, which causes DataCloneError
    // and storage corruption on mobile Safari / iOS.
    private nativeFiles = new Map<string, File>()
    private nativeHandles = new Map<string, FileSystemFileHandle>()

    constructor(initialNodes: VFSNodes = {}) {
        this.nodes = initialNodes
        this.rootIds = Object.values(initialNodes)
            .filter((node) => node.parentId === null)
            .map((node) => node.id)
    }

    get currentNodes() {
        return Object.values(this.nodes).filter((node) => node.parentId === this.currentFolderId)
    }

    async init() {
        if (!browser) return

        try {
            const allFolders = await this.db.folders.getAll()
            const allFiles = await this.db.files.getAll()

            const newNodes: VFSNodes = {}
            for (const f of allFolders) {
                newNodes[f.id] = f
            }

            for (const fileNode of allFiles) {
                // Populate native non-reactive maps and delete from the node to avoid Svelte proxying
                if (fileNode.file) {
                    this.nativeFiles.set(fileNode.id, fileNode.file)
                    delete fileNode.file
                }
                if (fileNode.handle) {
                    this.nativeHandles.set(fileNode.id, fileNode.handle)
                    delete fileNode.handle
                }

                // Initialize runtime fields
                fileNode.url = ""
                fileNode.isLocked = true

                // Try to load cached preview
                try {
                    const cachedPreview = await this.db.previews.get(fileNode.id)
                    if (cachedPreview) {
                        fileNode.previewDataUrl = URL.createObjectURL(cachedPreview.data)
                    }
                } catch (e) {
                    console.error(`Failed to load preview for file ${fileNode.name}:`, e)
                }

                // Verify file access / recreate URL using non-reactive maps
                const nativeFile = this.nativeFiles.get(fileNode.id)
                const nativeHandle = this.nativeHandles.get(fileNode.id)

                if (nativeFile) {
                    try {
                        fileNode.url = URL.createObjectURL(nativeFile)
                        fileNode.isLocked = false
                    } catch (e) {
                        console.error(
                            `Failed to create Object URL for file blob ${fileNode.name}:`,
                            e,
                        )
                    }
                } else if (nativeHandle) {
                    try {
                        const status = await nativeHandle.queryPermission({ mode: "read" })
                        if (status === "granted") {
                            const fileObj = await nativeHandle.getFile()
                            fileNode.url = URL.createObjectURL(fileObj)
                            fileNode.isLocked = false
                        } else {
                            fileNode.url = ""
                            fileNode.isLocked = true
                        }
                    } catch (e) {
                        console.error(
                            `Failed to query permission for file handle ${fileNode.name}:`,
                            e,
                        )
                        fileNode.url = ""
                        fileNode.isLocked = true
                    }
                }

                newNodes[fileNode.id] = fileNode
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

        // On mobile/iOS Safari, File objects from file inputs are temporary file references.
        // Reading them into an ArrayBuffer and reconstructing a clean File object
        // forces the browser to serialize the actual bytes into IndexedDB,
        // preventing the file from becoming an "empty shell" or losing access on reload/close.
        if (fileObj && isFile) {
            try {
                const arrayBuffer = await fileObj.arrayBuffer()
                fileObj = new File([arrayBuffer], fileObj.name, {
                    type: fileObj.type || "application/pdf",
                    lastModified: fileObj.lastModified,
                })
            } catch (e) {
                console.error("Failed to serialize file to ArrayBuffer:", e)
            }
        }

        let previewDataUrl: string | undefined = undefined
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
                        previewDataUrl = URL.createObjectURL(previewBlob)
                    } catch (e) {
                        console.error("Failed to save preview blob during creation:", e)
                    }
                    try {
                        URL.revokeObjectURL(pageUrl)
                    } catch (e) {
                        console.error("Failed to revoke temp page URL:", e)
                    }
                }
            } catch (err) {
                console.error("Failed to extract PDF preview during import:", err)
            } finally {
                await doc.close()
                try {
                    URL.revokeObjectURL(tempUrl)
                } catch (e) {
                    console.error("Failed to revoke temp file URL:", e)
                }
            }
        }

        const newFile: FileNode = {
            id,
            name,
            type: "file",
            parentId,
            size: isFile && fileObj ? fileObj.size : isFile ? (fileSource as File).size : 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: {
                pageNumber: 1,
                totalPages,
                author,
                ...metadata,
            },
            url:
                isFile && fileObj
                    ? URL.createObjectURL(fileObj)
                    : isFile
                      ? URL.createObjectURL(fileSource as File)
                      : "",
            isLocked: !isFile,
            previewDataUrl,
        }

        if (isFile) {
            newFile.file = fileObj || (fileSource as File)
        } else {
            newFile.handle = fileSource as FileSystemFileHandle
        }

        await this.db.transaction("rw", ["books", "folders", "previews"], async () => {
            await this.db.files.put(newFile)
            if (previewBlob) {
                await this.db.previews.put({ id, data: previewBlob })
            }
            if (parentId !== null) {
                const parent = this.nodes[parentId]
                if (parent && parent.type === "folder") {
                    const updatedParent = {
                        ...parent,
                        childrenIds: [...parent.childrenIds, id],
                        updatedAt: Date.now(),
                    }
                    await this.db.folders.put($state.snapshot(updatedParent) as FolderNode)
                }
            }
        })

        // Store native references in non-reactive maps and delete from the node to avoid Svelte proxying
        if (isFile) {
            this.nativeFiles.set(id, newFile.file!)
            delete newFile.file
        } else {
            this.nativeHandles.set(id, newFile.handle!)
            delete newFile.handle
        }

        // Sync with reactive memory store on success
        this.nodes[id] = newFile
        if (parentId === null) {
            this.rootIds.push(id)
        } else {
            const parent = this.nodes[parentId]
            if (parent && parent.type === "folder") {
                parent.childrenIds.push(id)
                parent.updatedAt = Date.now()
            }
        }

        return id
    }

    async createFolder(name: string, parentId: string | null): Promise<string> {
        const id = crypto.randomUUID()
        const newFolder: FolderNode = {
            id,
            name,
            type: "folder",
            parentId,
            childrenIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        await this.db.transaction("rw", ["folders"], async () => {
            await this.db.folders.put(newFolder)
            if (parentId !== null) {
                const parent = this.nodes[parentId]
                if (parent && parent.type === "folder") {
                    const updatedParent = {
                        ...parent,
                        childrenIds: [...parent.childrenIds, id],
                        updatedAt: Date.now(),
                    }
                    await this.db.folders.put($state.snapshot(updatedParent) as FolderNode)
                }
            }
        })

        // On success, update in-memory state
        this.nodes[id] = newFolder
        if (parentId === null) {
            this.rootIds.push(id)
        } else {
            const parent = this.nodes[parentId]
            if (parent && parent.type === "folder") {
                parent.childrenIds.push(id)
                parent.updatedAt = Date.now()
            }
        }

        return id
    }

    async deleteNode(id: string) {
        const rootNode = this.nodes[id]
        if (!rootNode) return

        // 1. Gather all nodes to be deleted recursively
        const nodesToDelete: VFSNode[] = []
        const collect = (nodeId: string) => {
            const node = this.nodes[nodeId]
            if (!node) return
            nodesToDelete.push(node)
            if (node.type === "folder") {
                // Defensive copy or simple read-only loop is perfectly safe
                for (const cid of node.childrenIds) {
                    collect(cid)
                }
            }
        }
        collect(id)

        // 2. Perform database transaction
        await this.db.transaction("rw", ["books", "folders", "previews"], async () => {
            // Delete all collected nodes from DB
            for (const node of nodesToDelete) {
                if (node.type === "file") {
                    await this.db.files.delete(node.id)
                    await this.db.previews.delete(node.id)
                } else {
                    await this.db.folders.delete(node.id)
                }
            }

            // Update parent in DB
            if (rootNode.parentId !== null) {
                const parent = this.nodes[rootNode.parentId]
                if (parent && parent.type === "folder") {
                    const updatedParent = {
                        ...parent,
                        childrenIds: parent.childrenIds.filter((cid) => cid !== id),
                        updatedAt: Date.now(),
                    }
                    await this.db.folders.put($state.snapshot(updatedParent) as FolderNode)
                }
            }
        })

        // 3. On success, revoke URLs and update in-memory state
        for (const node of nodesToDelete) {
            if (node.type === "file") {
                this.nativeFiles.delete(node.id)
                this.nativeHandles.delete(node.id)
                if (node.url && node.url.startsWith("blob:")) {
                    try {
                        URL.revokeObjectURL(node.url)
                    } catch (e) {
                        console.error(e)
                    }
                }
                if (node.previewDataUrl && node.previewDataUrl.startsWith("blob:")) {
                    try {
                        URL.revokeObjectURL(node.previewDataUrl)
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
            if (this.selectedId === node.id) this.selectedId = null
            if (this.activeFileId === node.id) this.activeFileId = null

            delete this.nodes[node.id]
        }

        // Update rootIds or parent childrenIds in memory
        if (rootNode.parentId === null) {
            this.rootIds = this.rootIds.filter((rid) => rid !== id)
        } else {
            const parent = this.nodes[rootNode.parentId]
            if (parent && parent.type === "folder") {
                parent.childrenIds = parent.childrenIds.filter((cid) => cid !== id)
                parent.updatedAt = Date.now()
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
            if (updates.previewDataUrl !== undefined) {
                if (
                    node.previewDataUrl &&
                    node.previewDataUrl !== updates.previewDataUrl &&
                    node.previewDataUrl.startsWith("blob:")
                ) {
                    try {
                        URL.revokeObjectURL(node.previewDataUrl)
                    } catch (e) {
                        console.error("Failed to revoke preview URL:", e)
                    }
                }
                node.previewDataUrl = updates.previewDataUrl
            }
            if (updates.url !== undefined) {
                if (node.url && node.url !== updates.url && node.url.startsWith("blob:")) {
                    try {
                        URL.revokeObjectURL(node.url)
                    } catch (e) {
                        console.error("Failed to revoke object URL:", e)
                    }
                }
                node.url = updates.url
            }
            if (updates.isLocked !== undefined) node.isLocked = updates.isLocked

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
            if (folderUpdates.previewDataUrl !== undefined)
                node.previewDataUrl = folderUpdates.previewDataUrl

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
            if (
                node.previewDataUrl &&
                node.previewDataUrl !== previewDataUrl &&
                node.previewDataUrl.startsWith("blob:")
            ) {
                try {
                    URL.revokeObjectURL(node.previewDataUrl)
                } catch (e) {
                    console.error("Failed to revoke old preview URL:", e)
                }
            }
            node.previewDataUrl = previewDataUrl
            node.updatedAt = Date.now()
            await this.saveFileToDb(node)
        }
    }

    async restoreFileAccess(id: string): Promise<string> {
        const node = this.nodes[id]
        if (!node || node.type !== "file") {
            throw new Error("File not found or is not a file")
        }

        let fileObj: File
        const nativeFile = this.nativeFiles.get(id)
        const nativeHandle = this.nativeHandles.get(id)

        if (nativeFile) {
            fileObj = nativeFile
        } else if (nativeHandle) {
            const allowed = await this.verifyFileSystemPermission(nativeHandle)
            if (!allowed) {
                throw new Error("Permission to read local file was denied")
            }
            fileObj = await nativeHandle.getFile()
        } else {
            throw new Error("No file content or handle available in database")
        }

        if (node.url && node.url.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(node.url)
            } catch (e) {
                console.error("Failed to revoke old object URL", e)
            }
        }

        const freshUrl = URL.createObjectURL(fileObj)
        node.url = freshUrl
        node.isLocked = false
        node.updatedAt = Date.now()
        await this.saveFileToDb(node)

        return freshUrl
    }

    private async verifyFileSystemPermission(handle: FileSystemFileHandle): Promise<boolean> {
        if (typeof handle.queryPermission !== "function") {
            return true
        }
        const options: { mode: "read" } = { mode: "read" }
        try {
            if ((await handle.queryPermission(options)) === "granted") {
                return true
            }
            if (typeof handle.requestPermission === "function") {
                if ((await handle.requestPermission(options)) === "granted") {
                    return true
                }
            }
        } catch (e) {
            console.error("Error verifying/requesting permission:", e)
        }
        return false
    }

    private async saveFileToDb(node: FileNode): Promise<void> {
        // Construct a clean, non-proxied object to save to IndexedDB.
        // This is crucial because passing Svelte 5 state proxies directly to Dexie/IndexedDB
        // can cause DataCloneError in some browsers (e.g. Safari on iOS),
        // and using $state.snapshot on the entire node recursively clones native
        // File/Blob/Handle objects which can fail or corrupt them on iOS.
        const plainNode: FileNode = {
            id: node.id,
            name: node.name,
            type: "file",
            parentId: node.parentId,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            size: node.size,
            metadata: {
                pageNumber: node.metadata.pageNumber || 1,
                pdfDest: node.metadata.pdfDest,
                totalPages: node.metadata.totalPages,
                author: node.metadata.author,
            },
            previewDataUrl: node.previewDataUrl,
            url: node.url,
            isLocked: node.isLocked,
            file: this.nativeFiles.get(node.id),
            handle: this.nativeHandles.get(node.id),
        }
        await this.db.files.put(plainNode)
    }

    selectNode(id: string | null) {
        this.selectedId = id
        if (id && this.nodes[id]?.type === "file") {
            this.activeFileId = id
        }
    }
}

export const vfsStore = new VFSStore()
