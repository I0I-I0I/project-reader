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
    file?: File | Blob
    handle?: FileSystemFileHandle
}

export interface FolderNode extends BaseNode {
    type: "folder"
    childrenIds: string[]
}

export type BookMetadata = {
    pageNumber: number
    scrollPosition?: number
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

export interface IndexedText {
    id: string
    bookId: string
    pageNumber: number
    text: string
}

export interface UserNote {
    id: string
    bookId: string
    pageNumber: number
    start: number
    end: number
    text: string
    noteContent: string
    color: "yellow" | "green" | "blue" | "pink" | "purple"
    createdAt: number
}

export interface Bookmark {
    id: string
    bookId: string
    pageNumber: number
    name: string
    createdAt: number
}
