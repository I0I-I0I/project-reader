export interface Book {
    url: string
    name: string
}

class ViewerStore {
    book = $state<Book | null>(null)

    setBook(newBook: Book | null) {
        this.book = newBook
    }
}

export const viewerStore = new ViewerStore()
