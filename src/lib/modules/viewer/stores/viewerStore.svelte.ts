import { SvelteSet } from "svelte/reactivity"
import { browser } from "$app/environment"
import { pushState } from "$app/navigation"
import type { FlatHeading } from "$lib/modules/pdf"
import { vfsStore } from "$lib/modules/documents"
import { type Book, fileNodeToBook } from "./viewerStore.types"

class ViewerStore {
    private book = $state<Book | null>(null)
    private outlineList = $state<FlatHeading[] | null>(null)
    private totalPages = $state<number>(0)
    isOutlineLoading = $state(false)

    currentPage = $state(1)
    scrollPosition = $state(0)
    private _isRestoringHistory = false
    lastSetPageState = $state<any>(null)
    private listening = false
    private readonly flush = () => this.persistToLocalStorage(true)
    private readonly handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") this.flush()
    }

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
                    this.currentPage = parsed.pageNumber || 1
                    this.scrollPosition = parsed.scrollPosition || 0
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e)
                }
            }

            window.addEventListener("visibilitychange", this.handleVisibilityChange)
            window.addEventListener("beforeunload", this.flush)
            this.listening = true
        }
    }

    dispose() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout)
            this.saveTimeout = null
        }
        if (browser && this.listening) {
            window.removeEventListener("visibilitychange", this.handleVisibilityChange)
            window.removeEventListener("beforeunload", this.flush)
            this.listening = false
        }
    }

    get isRestoringHistory() {
        return this._isRestoringHistory
    }

    get activeOutline() {
        return this.outlineList
    }
    set activeOutline(list: FlatHeading[] | null) {
        this.outlineList = list
    }

    activeHeadings = $derived.by(() => {
        if (!this.outlineList || this.outlineList.length === 0) return new SvelteSet<FlatHeading>()

        const onCurrentPage = this.outlineList.filter((h) => h.pageNumber === this.currentPage)
        if (onCurrentPage.length > 0) {
            return new SvelteSet<FlatHeading>(onCurrentPage)
        }

        let precedingCandidate: FlatHeading | null = null
        for (const heading of this.outlineList) {
            if (heading.pageNumber !== undefined && heading.pageNumber < this.currentPage) {
                if (!precedingCandidate || heading.pageNumber >= precedingCandidate.pageNumber!) {
                    precedingCandidate = heading
                }
            }
        }

        const activeSet = new SvelteSet<FlatHeading>()
        if (precedingCandidate) {
            activeSet.add(precedingCandidate)
        }
        return activeSet
    })

    get activeTotalPages() {
        return this.totalPages
    }
    set activeTotalPages(pages: number) {
        this.totalPages = pages
    }

    goToPage(page: number, options?: { scrollPosition?: number; isJump?: boolean }) {
        if (page >= 1 && (this.totalPages === 0 || page <= this.totalPages)) {
            const oldPage = this.currentPage
            const oldScroll = this.scrollPosition
            const targetScroll = options?.scrollPosition ?? 0
            const isPositionChanged =
                page !== oldPage ||
                (options?.scrollPosition !== undefined &&
                    Math.abs(targetScroll - oldScroll) > 0.001)

            // Push the target position to browser history using SvelteKit's pushState
            if (options?.isJump && isPositionChanged && !this._isRestoringHistory && browser) {
                const state = {
                    _pdfjump: true,
                    page: page,
                    scrollPosition: targetScroll,
                    bookId: this.book?.id,
                }
                this.lastSetPageState = state
                pushState("", state)
            }

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
        }
    }

    /** Called by SvelteKit state routing to restore a previously saved jump position. */
    restoreFromHistoryState(state: {
        _pdfjump: true
        page: number
        scrollPosition: number
        bookId: string
    }) {
        if (state.bookId !== this.book?.id) return
        this.lastSetPageState = state
        if (state.page === this.currentPage && state.scrollPosition === this.scrollPosition) return
        this._isRestoringHistory = true
        try {
            this.goToPage(state.page, { scrollPosition: state.scrollPosition })
        } finally {
            this._isRestoringHistory = false
        }
    }

    async syncWithBooks() {
        if (this.book) {
            vfsStore.activeFileId = this.book.id
            const matchingNode = vfsStore.nodes[this.book.id]
            if (matchingNode && matchingNode.type === "file") {
                let currentUrl = this.book.url

                if (!currentUrl) {
                    currentUrl = await vfsStore.getFileUrl(this.book.id)
                }

                const localPageNumber = this.book.pageNumber
                const localScrollPosition = this.book.scrollPosition

                this.book = {
                    ...fileNodeToBook(matchingNode),
                    pageNumber: localPageNumber,
                    scrollPosition: localScrollPosition,
                    url: currentUrl,
                    previewDataUrl: "",
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

    async setCurrentBook(newBook: Book | null) {
        const oldBook = this.book
        const newBookId = newBook?.id

        // Revoke old URL if it was a blob URL created by us
        if (oldBook && oldBook.id !== newBookId) {
            vfsStore.revokeFileUrl(oldBook.id)
        }

        // Set the active book state immediately so components don't see the old book
        this.book = newBook
        vfsStore.activeFileId = newBookId ?? null
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

if (import.meta.hot) {
    import.meta.hot.dispose(() => viewerStore.dispose())
}
