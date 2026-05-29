import { browser } from "$app/environment"
import {
    getBookFile,
    deleteBookFile,
    verifyPermission,
    saveBookPreview,
    getBookPreview,
    deleteBookPreview,
} from "$lib/db"

import type { FlatHeading } from "$lib/pdf"

export interface Book {
    id: string
    url: string
    name: string
    updatedAt: number
    pageNumber: number
    pdfDest?: string
    isLocked?: boolean
    previewDataUrl?: string
}

function cleanBookForLocalStorage(book: Book): Book {
    const { previewDataUrl: _, ...rest } = book
    return rest
}

function cleanBooksForLocalStorage(books: Book[]): Book[] {
    return books.map(cleanBookForLocalStorage)
}

class ViewerStore {
    private book = $state<Book | null>(null)
    private books = $state<Book[]>([])
    private initialized = $state(false)
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

    get isInitialized() {
        return this.initialized
    }

    async initBooks() {
        if (!browser) return

        try {
            const savedBooks = localStorage.getItem("books")
            if (savedBooks) {
                try {
                    this.books = JSON.parse(savedBooks)
                    for (const book of this.books) {
                        if (book.url && book.url.startsWith("blob:")) {
                            book.url = ""
                        }
                        if (book.previewDataUrl && book.previewDataUrl.startsWith("blob:")) {
                            book.previewDataUrl = ""
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse books from localStorage", e)
                }
            }

            const updatedBooks = [...this.books]
            for (const book of updatedBooks) {
                try {
                    const cachedPreview = await getBookPreview(book.id)
                    if (cachedPreview) {
                        if (cachedPreview instanceof Blob) {
                            book.previewDataUrl = URL.createObjectURL(cachedPreview)
                        } else if (
                            typeof cachedPreview === "string" &&
                            !cachedPreview.startsWith("blob:")
                        ) {
                            book.previewDataUrl = cachedPreview
                        }
                    }

                    const fileOrHandle = await getBookFile(book.id)
                    if (fileOrHandle) {
                        if (fileOrHandle instanceof File) {
                            if (book.url && book.url.startsWith("blob:")) {
                                URL.revokeObjectURL(book.url)
                            }
                            book.url = URL.createObjectURL(fileOrHandle)
                            book.isLocked = false
                        } else {
                            const status = await fileOrHandle.queryPermission({ mode: "read" })
                            if (status === "granted") {
                                const file = await fileOrHandle.getFile()
                                if (book.url && book.url.startsWith("blob:")) {
                                    URL.revokeObjectURL(book.url)
                                }
                                book.url = URL.createObjectURL(file)
                                book.isLocked = false
                            } else {
                                book.url = ""
                                book.isLocked = true
                            }
                        }
                    } else {
                        book.url = ""
                        book.isLocked = true
                    }
                } catch (err) {
                    console.error(`Failed to restore book ${book.name}:`, err)
                    book.url = ""
                    book.isLocked = true
                }
            }
            this.books = updatedBooks

            if (this.book) {
                const matchingBook = this.books.find((b) => b.id === this.book?.id)
                if (matchingBook) {
                    this.book = {
                        ...this.book,
                        url: matchingBook.url,
                        isLocked: matchingBook.isLocked,
                        previewDataUrl: matchingBook.previewDataUrl,
                    }
                }
            }
        } finally {
            this.initialized = true
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
            localStorage.setItem("books", JSON.stringify(cleanBooksForLocalStorage(this.books)))
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

    addBook(newBook: Book) {
        if (this.books.some((b) => b.id === newBook.id)) {
            return
        }
        this.books = [...this.books, newBook]
        this.persistToLocalStorage(true)
    }

    async removeBook(book: Book) {
        if (browser && book.url && book.url.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(book.url)
            } catch (e) {
                console.error("Failed to revoke object URL", e)
            }
        }
        if (browser && book.previewDataUrl && book.previewDataUrl.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(book.previewDataUrl)
            } catch (e) {
                console.error("Failed to revoke preview object URL", e)
            }
        }
        this.books = this.books.filter((b) => b.id !== book.id)

        try {
            await deleteBookFile(book.id)
        } catch (e) {
            console.error(`Failed to delete book ${book.name} from IndexedDB:`, e)
        }

        try {
            await deleteBookPreview(book.id)
        } catch (e) {
            console.error(`Failed to delete book preview ${book.name} from IndexedDB:`, e)
        }

        if (this.book && this.book.id === book.id) {
            this.book = null
        }
        this.persistToLocalStorage(true)
    }

    getBooks(): Book[] {
        return this.books
    }

    updateBook(book: Book) {
        const index = this.books.findIndex((b) => b.id === book.id)
        if (index >= 0) {
            const existingPreview = this.books[index].previewDataUrl
            if (
                existingPreview &&
                existingPreview !== book.previewDataUrl &&
                existingPreview.startsWith("blob:")
            ) {
                try {
                    URL.revokeObjectURL(existingPreview)
                } catch (e) {
                    console.error("Failed to revoke old preview URL", e)
                }
            }
            const updatedBook = {
                ...book,
                previewDataUrl:
                    book.previewDataUrl !== undefined ? book.previewDataUrl : existingPreview,
            }
            this.books[index] = updatedBook

            if (book.previewDataUrl) {
                saveBookPreview(book.id, book.previewDataUrl).catch((err) => {
                    console.error("Failed to save book preview to IndexedDB", err)
                })
            }
        }
        if (this.book && this.book.id === book.id) {
            this.book = this.books[index]
            this.persistToLocalStorage(false)
        } else {
            this.persistToLocalStorage(true)
        }
    }

    async restoreBookAccess(book: Book): Promise<string> {
        const fileOrHandle = await getBookFile(book.id)
        if (!fileOrHandle) {
            throw new Error("Book file not found in database")
        }

        let file: File
        if (fileOrHandle instanceof File) {
            file = fileOrHandle
        } else {
            const allowed = await verifyPermission(fileOrHandle)
            if (!allowed) {
                throw new Error("Permission to read local file was denied")
            }
            file = await fileOrHandle.getFile()
        }

        if (book.url && book.url.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(book.url)
            } catch (e) {
                console.error("Failed to revoke old object URL", e)
            }
        }

        const freshUrl = URL.createObjectURL(file)

        const updatedBook = { ...book, url: freshUrl, isLocked: false }
        this.updateBook(updatedBook)

        return freshUrl
    }

    setCurrentBook(newBook: Book | null) {
        this.book = newBook
        this.persistToLocalStorage(true)
    }

    getCurrentBook(): Book | null {
        return this.book
    }
}

export const viewerStore = new ViewerStore()
