import { browser } from "$app/environment"
import type { FlatHeading } from "$lib/pdf"
import { vfsStore } from "./vfsStore.svelte"
import type { FileNode } from "./vfsStore.types"

export interface Book {
    id: string
    url: string
    name: string
    updatedAt: number
    pageNumber: number
    pdfDest?: string
    isLocked?: boolean
    previewDataUrl?: string
    totalPages?: number
    author?: string | null
}

export function fileNodeToBook(node: FileNode): Book {
    return {
        id: node.id,
        name: node.name,
        updatedAt: node.updatedAt,
        url: node.url || "",
        isLocked: node.isLocked || false,
        previewDataUrl: node.previewDataUrl,
        pageNumber: node.metadata.pageNumber || 1,
        pdfDest: node.metadata.pdfDest,
        totalPages: node.metadata.totalPages,
        author: node.metadata.author,
    }
}

class ViewerStore {
    private book = $state<Book | null>(null)
    private outlineList = $state<FlatHeading[] | null>(null)
    private totalPages = $state<number>(0)
    private goToPageCallback = $state<((page: number) => void) | null>(null)

    constructor() {
        if (browser) {
            const savedBook = localStorage.getItem("book")
            if (savedBook) {
                try {
                    const parsed = JSON.parse(savedBook) as Book
                    if (parsed && parsed.url && parsed.url.startsWith("blob:")) {
                        parsed.url = ""
                    }
                    if (
                        parsed &&
                        parsed.previewDataUrl &&
                        parsed.previewDataUrl.startsWith("blob:")
                    ) {
                        parsed.previewDataUrl = ""
                    }
                    this.book = parsed
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e)
                }
            }

            const flush = () => this.persistToLocalStorage(true)
            window.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "hidden") {
                    flush()
                }
            })
            window.addEventListener("beforeunload", flush)
        }
    }

    get activeOutline() {
        return this.outlineList
    }
    set activeOutline(list: FlatHeading[] | null) {
        this.outlineList = list
    }

    get activeTotalPages() {
        return this.totalPages
    }
    set activeTotalPages(pages: number) {
        this.totalPages = pages
    }

    get goToPage() {
        return this.goToPageCallback
    }
    set goToPage(callback: ((page: number) => void) | null) {
        this.goToPageCallback = callback
    }

    syncWithBooks() {
        if (this.book) {
            const matchingNode = vfsStore.nodes[this.book.id]
            if (matchingNode && matchingNode.type === "file") {
                this.book = fileNodeToBook(matchingNode)
            }
        }
    }

    private saveTimeout: ReturnType<typeof setTimeout> | null = null

    private persistToLocalStorage(immediate = false) {
        if (!browser) return

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout)
            this.saveTimeout = null
        }

        const save = () => {
            if (this.book) {
                const clean = { ...this.book }
                if (clean.previewDataUrl && clean.previewDataUrl.startsWith("blob:")) {
                    clean.previewDataUrl = ""
                }
                localStorage.setItem("book", JSON.stringify(clean))
            } else {
                localStorage.removeItem("book")
            }
        }

        if (immediate) {
            save()
        } else {
            this.saveTimeout = setTimeout(save, 500)
        }
    }

    setCurrentBook(newBook: Book | null) {
        this.book = newBook
        this.persistToLocalStorage(true)
    }

    getCurrentBook(): Book | null {
        return this.book
    }

    async updateBook(book: Book) {
        // Persist metadata & url changes to vfsStore
        await vfsStore.updateFile(book.id, {
            name: book.name,
            previewDataUrl: book.previewDataUrl,
            url: book.url,
            isLocked: book.isLocked,
            metadata: {
                pageNumber: book.pageNumber,
                pdfDest: book.pdfDest,
                totalPages: book.totalPages,
                author: book.author,
            },
        })

        if (this.book && this.book.id === book.id) {
            this.book = book
            this.persistToLocalStorage(false)
        }
    }
}

export const viewerStore = new ViewerStore()
