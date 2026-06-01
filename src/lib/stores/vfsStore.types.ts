export type FileType = "folder" | "file"

export interface BaseNode {
    id: string
    name: string
    type: FileType
    parentId: string | null
    createdAt: number
    updatedAt: number
}

export interface BookPreview {
    id: string
    data: Blob
}

export interface FileContent {
    id: string
    file?: File
    handle?: FileSystemFileHandle
}

export interface FolderNode extends BaseNode {
    type: "folder"
    childrenIds: string[]
}

export type BookMetadata = {
    pageNumber: number
    pdfDest?: string
    totalPages?: number
    author?: string | null
}

export interface FileNode extends BaseNode {
    type: "file"
    isLocked?: boolean
    size: number
    metadata: BookMetadata
}

export type VFSNode = FolderNode | FileNode
export type VFSNodes = Record<string, VFSNode>

export interface VFS {
    nodes: VFSNodes
    rootIds: string[]
    activeNodeId: string | null
}
