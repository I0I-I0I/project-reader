import { browser } from "$app/environment"

export interface Book {
    url: string
    name: string
}

class ViewerStore {
    private book = $state<Book | null>(null)
    private books = $state<Book[]>([])

    constructor() {
        if (browser) {
            const savedBook = localStorage.getItem("book")
            if (savedBook) {
                try {
                    this.book = JSON.parse(savedBook)
                } catch (e) {
                    console.error("Failed to parse book from localStorage", e)
                }
            }
        }
    }

    addBook(newBook: Book) {
        if (this.books.some((b) => b.url === newBook.url)) {
            return
        }
        this.books = [...this.books, newBook]
    }

    removeBook(book: Book) {
        if (browser && book.url.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(book.url)
            } catch (e) {
                console.error("Failed to revoke object URL", e)
            }
        }
        this.books = this.books.filter((b) => b.url !== book.url)
        if (this.book && this.book.url === book.url) {
            this.setCurrentBook(null)
        }
    }

    getBooks(): Book[] {
        return this.books
    }

    setCurrentBook(newBook: Book | null) {
        this.book = newBook

        if (browser) {
            if (newBook !== null) {
                localStorage.setItem("book", JSON.stringify(newBook))
            } else {
                localStorage.removeItem("book")
            }
        }
    }

    getCurrentBook(): Book | null {
        return this.book
    }
}

export const viewerStore = new ViewerStore()
