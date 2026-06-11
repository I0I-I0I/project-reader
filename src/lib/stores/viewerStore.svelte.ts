import { browser } from "$app/environment"
import type { FlatHeading } from "$lib/pdf"
import { vfsStore } from "./vfsStore.svelte"
import { jumplistStore } from "./jumplistStore.svelte"
import { type Book, fileNodeToBook } from "./viewerStore.types"

class ViewerStore {
    private book = $state<Book | null>(null)
    private outlineList = $state<FlatHeading[] | null>(null)
    private totalPages = $state<number>(0)

    currentPage = $state(1)
    scrollPosition = $state(0)

    constructor() {
        jumplistStore.setViewer(this)
        if (browser) {
            const savedBook = localStorage.getItem("book")
            if (savedBook) {
                try {
                    const parsed = JSON.parse(savedBook) as Book
                    // Clean up any stale blob URLs from storage
                    if (parsed.url?.startsWith("blob:")) parsed.url = ""
                    if (parsed.previewDataUrl?.startsWith("blob:")) parsed.previewDataUrl = ""
                    this.book = parsed
                    this.currentPage = parsed.pageNumber || 1
                    this.scrollPosition = parsed.scrollPosition || 0
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e)
                }
            }

            const flush = () => {
                this.persistToLocalStorage(true)
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

    goToPage(page: number, options?: { scrollPosition?: number; isJump?: boolean }) {
        if (page >= 1 && (this.totalPages === 0 || page <= this.totalPages)) {
            if (options?.isJump && this.book) {
                // Record current position before jumping
                jumplistStore.pushBookPageJump(this.book.id, this.currentPage, this.scrollPosition)
            }

            const oldPage = this.currentPage
            this.currentPage = page
            if (options?.scrollPosition !== undefined) {
                this.scrollPosition = options.scrollPosition
            } else if (page !== oldPage) {
                this.scrollPosition = 0
            }

            if (this.book) {
                this.book.pageNumber = this.currentPage
                this.book.scrollPosition = this.scrollPosition
            }

            if (options?.isJump && this.book) {
                // Record the landing position
                jumplistStore.pushBookPageJump(this.book.id, page, this.scrollPosition)
            }
        }
    }

    get activeJumplist() {
        return jumplistStore.jumps
    }

    get activeJumplistIndex() {
        return jumplistStore.currentIndex
    }

    async jumpBack() {
        await jumplistStore.jumpBack()
    }

    async jumpForward() {
        await jumplistStore.jumpForward()
    }

    async jumpToIndex(index: number) {
        await jumplistStore.jumpToIndex(index)
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

                const localPageNumber = this.book.pageNumber
                const localScrollPosition = this.book.scrollPosition

                this.book = {
                    ...fileNodeToBook(matchingNode),
                    pageNumber: localPageNumber,
                    scrollPosition: localScrollPosition,
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

    async setCurrentBook(newBook: Book | null, options?: { isJump?: boolean }) {
        const oldBook = this.book
        const oldBookId = oldBook?.id
        const newBookId = newBook?.id

        // Record current position before switching
        if (!options?.isJump && oldBook && newBook && oldBookId !== newBookId) {
            jumplistStore.pushBookPageJump(oldBook.id, this.currentPage, this.scrollPosition)
        }

        // Revoke old URL if it was a blob URL created by us
        if (oldBook && oldBook.id !== newBookId) {
            vfsStore.revokeFileUrl(oldBook.id)
            vfsStore.revokePreviewUrl(oldBook.id)
        }

        // Set the active book state immediately so components don't see the old book
        this.book = newBook
        this.persistToLocalStorage(true)

        if (newBook) {
            this.currentPage = newBook.pageNumber || 1
            this.scrollPosition = newBook.scrollPosition || 0
            this.totalPages = newBook.totalPages || 0
            // Lazily fetch URLs if they are missing
            let hasChanges = false
            if (!newBook.url) {
                newBook.url = await vfsStore.getFileUrl(newBook.id)
                hasChanges = true
            }
            if (!newBook.previewDataUrl) {
                newBook.previewDataUrl = await vfsStore.getPreviewUrl(newBook.id)
                hasChanges = true
            }
            const isLocked = vfsStore.isLockedMap[newBook.id]
            if (newBook.isLocked !== isLocked) {
                newBook.isLocked = isLocked
                hasChanges = true
            }

            // Only update reactive state if we haven't switched to a different book in the meantime
            if (this.book && this.book.id === newBook.id) {
                if (hasChanges) {
                    this.book = { ...newBook }
                }
                this.persistToLocalStorage(true)
            }

            // Record initial position in new book
            const lastJump = jumplistStore.jumps[jumplistStore.currentIndex]
            const isSameBookInJumplist =
                lastJump &&
                (lastJump.type === "book_open" || lastJump.type === "book_page") &&
                lastJump.bookId === newBook.id

            if (!options?.isJump && !isSameBookInJumplist) {
                jumplistStore.pushBookOpenJump(newBook.id)
            }
        }
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
