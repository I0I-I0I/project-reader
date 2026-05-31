import { browser } from "$app/environment"
import type { FlatHeading } from "$lib/pdf"
import { booksStore, type Book } from "./booksStore.svelte"

function cleanBookForLocalStorage(book: Book): Book {
    const { previewDataUrl: _, ...rest } = book
    return rest
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
            const matchingBook = booksStore.books.find((b) => b.id === this.book?.id)
            if (matchingBook) {
                this.book = {
                    ...this.book,
                    url: matchingBook.url,
                    isLocked: matchingBook.isLocked,
                    previewDataUrl: matchingBook.previewDataUrl,
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
                localStorage.setItem("book", JSON.stringify(cleanBookForLocalStorage(this.book)))
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

    updateBook(book: Book) {
        booksStore.updateBook(book)
        if (this.book && this.book.id === book.id) {
            this.book = book
            this.persistToLocalStorage(false)
        }
    }
}

export const viewerStore = new ViewerStore()
export type { Book } from "./booksStore.svelte"
