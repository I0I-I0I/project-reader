import { browser } from "$app/environment"
import {
    getBookFile,
    deleteBookFile,
    verifyPermission,
    saveBookPreview,
    getBookPreview,
    deleteBookPreview,
} from "$lib/db"

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

function cleanBookForLocalStorage(book: Book): Book {
    const { previewDataUrl: _, ...rest } = book
    return rest
}

function cleanBooksForLocalStorage(books: Book[]): Book[] {
    return books.map(cleanBookForLocalStorage)
}

class BooksStore {
    private booksState = $state<Book[]>([])
    private initializedState = $state(false)

    constructor() {
        if (browser) {
            const savedBooks = localStorage.getItem("books")
            if (savedBooks) {
                try {
                    const parsed = JSON.parse(savedBooks) as Book[]
                    for (const book of parsed) {
                        if (book.url && book.url.startsWith("blob:")) {
                            book.url = ""
                        }
                        if (book.previewDataUrl && book.previewDataUrl.startsWith("blob:")) {
                            book.previewDataUrl = ""
                        }
                    }
                    this.booksState = parsed
                } catch (e) {
                    console.error("Failed to parse books from localStorage", e)
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

    get books() {
        return this.booksState
    }

    get isInitialized() {
        return this.initializedState
    }

    async init() {
        if (!browser) return

        try {
            const updatedBooks = [...this.booksState]
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
            this.booksState = updatedBooks
        } finally {
            this.initializedState = true
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
            localStorage.setItem(
                "books",
                JSON.stringify(cleanBooksForLocalStorage(this.booksState)),
            )
        }

        if (immediate) {
            save()
        } else {
            this.saveTimeout = setTimeout(save, 500)
        }
    }

    addBook(newBook: Book) {
        if (this.booksState.some((b) => b.id === newBook.id)) {
            return
        }
        this.booksState = [...this.booksState, newBook]
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
        this.booksState = this.booksState.filter((b) => b.id !== book.id)

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

        this.persistToLocalStorage(true)
    }

    getBooks(): Book[] {
        return this.booksState
    }

    updateBook(book: Book) {
        const index = this.booksState.findIndex((b) => b.id === book.id)
        if (index >= 0) {
            const existingPreview = this.booksState[index].previewDataUrl
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
            this.booksState[index] = updatedBook

            if (book.previewDataUrl) {
                saveBookPreview(book.id, book.previewDataUrl).catch((err) => {
                    console.error("Failed to save book preview to IndexedDB", err)
                })
            }
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
}

export const booksStore = new BooksStore()
