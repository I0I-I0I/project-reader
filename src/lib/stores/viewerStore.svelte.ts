import { browser } from "$app/environment"
import type { FlatHeading } from "$lib/pdf"
import { vfsStore } from "./vfsStore.svelte"
import type { FileNode } from "./vfsStore.types"

export interface Book {
    id: string
    name: string
    updatedAt: number
    pageNumber: number
    scrollPosition?: number
    url?: string
    pdfDest?: string
    isLocked?: boolean
    previewDataUrl?: string
    totalPages?: number
    author?: string | null
}

export interface Jump {
    bookId: string
    bookName: string
    pageNumber: number
    scrollPosition: number
}

export function fileNodeToBook(node: FileNode): Book {
    return {
        id: node.id,
        name: node.name,
        updatedAt: node.updatedAt,
        pageNumber: node.metadata.pageNumber || 1,
        scrollPosition: node.metadata.scrollPosition || 0,
        pdfDest: node.metadata.pdfDest,
        totalPages: node.metadata.totalPages,
        author: node.metadata.author,
    }
}

class ViewerStore {
    private book = $state<Book | null>(null)
    private outlineList = $state<FlatHeading[] | null>(null)
    private totalPages = $state<number>(0)
    private goToPageCallback = $state<
        ((page: number, options?: { scrollPosition?: number; isJump?: boolean }) => void) | null
    >(null)
    private jumplist = $state<Jump[]>([])
    private jumplistIndex = $state<number>(-1)

    constructor() {
        if (browser) {
            const savedBook = localStorage.getItem("book")
            if (savedBook) {
                try {
                    const parsed = JSON.parse(savedBook) as Book
                    // Clean up any stale blob URLs from storage
                    if (parsed.url?.startsWith("blob:")) parsed.url = ""
                    if (parsed.previewDataUrl?.startsWith("blob:")) parsed.previewDataUrl = ""
                    this.book = parsed
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e)
                }
            }

            const savedJumplist = localStorage.getItem("jumplist")
            if (savedJumplist) {
                try {
                    this.jumplist = JSON.parse(savedJumplist)
                } catch (e) {
                    console.error("Failed to parse jumplist from localStorage", e)
                }
            }
            const savedJumplistIndex = localStorage.getItem("jumplistIndex")
            if (savedJumplistIndex) {
                this.jumplistIndex = parseInt(savedJumplistIndex, 10)
            }

            const flush = () => {
                this.persistToLocalStorage(true)
                this.persistJumplist()
            }
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
        return (page: number, options?: { scrollPosition?: number; isJump?: boolean }) => {
            if (options?.isJump && this.book) {
                // Record current position before jumping
                this.pushJump({
                    bookId: this.book.id,
                    bookName: this.book.name,
                    pageNumber: this.book.pageNumber,
                    scrollPosition: this.book.scrollPosition || 0,
                })
            }
            this.goToPageCallback?.(page, options)
            if (options?.isJump && this.book) {
                // Record the landing position
                this.pushJump({
                    bookId: this.book.id,
                    bookName: this.book.name,
                    pageNumber: page,
                    scrollPosition:
                        options?.scrollPosition ??
                        (page === this.book.pageNumber ? this.book.scrollPosition || 0 : 0),
                })
            }
        }
    }
    set goToPage(
        callback:
            | ((page: number, options?: { scrollPosition?: number; isJump?: boolean }) => void)
            | null,
    ) {
        this.goToPageCallback = callback
    }

    get activeJumplist() {
        return this.jumplist
    }

    get activeJumplistIndex() {
        return this.jumplistIndex
    }

    pushJump(jump: Jump) {
        // Truncate forward history if we're in the middle of the list
        if (this.jumplistIndex < this.jumplist.length - 1) {
            this.jumplist = this.jumplist.slice(0, this.jumplistIndex + 1)
        }

        // Avoid duplicate jumps
        const lastJump = this.jumplist[this.jumplistIndex]
        if (
            lastJump &&
            lastJump.bookId === jump.bookId &&
            lastJump.pageNumber === jump.pageNumber &&
            Math.abs(lastJump.scrollPosition - jump.scrollPosition) < 0.01
        ) {
            return
        }

        this.jumplist.push(jump)
        if (this.jumplist.length > 100) {
            this.jumplist.shift()
        } else {
            this.jumplistIndex++
        }
        this.persistJumplist()
    }

    async jumpBack() {
        if (this.jumplistIndex > 0) {
            await this.jumpToIndex(this.jumplistIndex - 1)
        }
    }

    async jumpForward() {
        if (this.jumplistIndex < this.jumplist.length - 1) {
            await this.jumpToIndex(this.jumplistIndex + 1)
        }
    }

    async jumpToIndex(index: number) {
        if (index >= 0 && index < this.jumplist.length) {
            const jump = this.jumplist[index]

            if (this.book && this.book.id !== jump.bookId) {
                const node = vfsStore.nodes[jump.bookId]
                if (node && node.type === "file") {
                    const book = fileNodeToBook(node as FileNode)
                    // Update book with jump's position so it opens there
                    book.pageNumber = jump.pageNumber
                    book.scrollPosition = jump.scrollPosition
                    this.jumplistIndex = index
                    await this.setCurrentBook(book, { isJump: true })
                }
            } else {
                this.jumplistIndex = index
                this.goToPageCallback?.(jump.pageNumber, {
                    scrollPosition: jump.scrollPosition,
                    isJump: false,
                })
            }
            this.persistJumplist()
        }
    }

    async syncWithBooks() {
        if (this.book) {
            const matchingNode = vfsStore.nodes[this.book.id]
            if (matchingNode && matchingNode.type === "file") {
                let currentUrl = this.book.url
                let currentPreview = this.book.previewDataUrl

                if (!currentUrl) {
                    currentUrl = await vfsStore.getFileUrl(this.book.id)
                }
                if (!currentPreview) {
                    currentPreview = await vfsStore.getPreviewUrl(this.book.id)
                }

                this.book = {
                    ...fileNodeToBook(matchingNode),
                    url: currentUrl,
                    previewDataUrl: currentPreview,
                    isLocked: vfsStore.isLockedMap[matchingNode.id],
                }
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
                // Never persist blob URLs
                if (clean.url?.startsWith("blob:")) clean.url = ""
                if (clean.previewDataUrl?.startsWith("blob:")) clean.previewDataUrl = ""
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

    private persistJumplist() {
        if (!browser) return
        localStorage.setItem("jumplist", JSON.stringify(this.jumplist))
        localStorage.setItem("jumplistIndex", this.jumplistIndex.toString())
    }

    async setCurrentBook(newBook: Book | null, options?: { isJump?: boolean }) {
        // Record current position before switching
        if (!options?.isJump && this.book && newBook && this.book.id !== newBook.id) {
            this.pushJump({
                bookId: this.book.id,
                bookName: this.book.name,
                pageNumber: this.book.pageNumber,
                scrollPosition: this.book.scrollPosition || 0,
            })
        }

        // Revoke old URL if it was a blob URL created by us
        if (this.book && this.book.id !== newBook?.id) {
            vfsStore.revokeFileUrl(this.book.id)
            vfsStore.revokePreviewUrl(this.book.id)
        }

        if (newBook) {
            // Lazily fetch URLs if they are missing
            if (!newBook.url) {
                newBook.url = await vfsStore.getFileUrl(newBook.id)
            }
            if (!newBook.previewDataUrl) {
                newBook.previewDataUrl = await vfsStore.getPreviewUrl(newBook.id)
            }
            newBook.isLocked = vfsStore.isLockedMap[newBook.id]

            // Record initial position in new book
            if (!options?.isJump && this.book?.id !== newBook.id) {
                this.pushJump({
                    bookId: newBook.id,
                    bookName: newBook.name,
                    pageNumber: newBook.pageNumber,
                    scrollPosition: newBook.scrollPosition || 0,
                })
            }
        }

        this.book = newBook
        this.persistToLocalStorage(true)
    }

    getCurrentBook(): Book | null {
        return this.book
    }

    async updateBook(book: Book) {
        await vfsStore.updateFile(book.id, {
            name: book.name,
            isLocked: book.isLocked,
            metadata: {
                pageNumber: book.pageNumber,
                scrollPosition: book.scrollPosition,
                pdfDest: book.pdfDest,
                totalPages: book.totalPages,
                author: book.author,
            },
        })

        if (this.book && this.book.id === book.id) {
            // Avoid redundant state updates if data is identical
            if (
                this.book.pageNumber === book.pageNumber &&
                this.book.scrollPosition === book.scrollPosition &&
                this.book.name === book.name &&
                this.book.isLocked === book.isLocked &&
                this.book.pdfDest === book.pdfDest &&
                this.book.totalPages === book.totalPages &&
                this.book.author === book.author
            ) {
                return
            }

            this.book = book
            this.persistToLocalStorage(false)
        }
    }
}

export const viewerStore = new ViewerStore()
