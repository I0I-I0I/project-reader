import { Dexie, type EntityTable, type Transaction } from "dexie"
import type {
    FolderNode,
    FileNode,
    BookPreview,
    FileContent,
    IndexedText,
    UserNote,
    Bookmark,
} from "./vfsStore.types"

export type TableName =
    | "books"
    | "previews"
    | "folders"
    | "fileContents"
    | "indexedTexts"
    | "userNotes"
    | "bookmarks"

export async function migrateVersion2(tx: Transaction) {
    await tx.table("books").each(async (book) => {
        if (book.file || book.handle) {
            try {
                await tx.table("fileContents").put({
                    id: book.id,
                    file: book.file,
                    handle: book.handle,
                })
                delete book.file
                delete book.handle
                await tx.table("books").put(book)
            } catch (e) {
                console.error(
                    `Failed to migrate file content during database upgrade for book ${book.id}:`,
                    e,
                )
            }
        }
    })
}

interface IDBBooks {
    get(id: string): Promise<FileNode | undefined>
    put(book: FileNode): Promise<string>
    bulkPut(books: FileNode[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
    getAll(): Promise<FileNode[]>
}

interface IDBBookPreviews {
    get(id: string): Promise<BookPreview | undefined>
    put(preview: BookPreview): Promise<string>
    bulkPut(previews: BookPreview[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
}

interface IDBFileContents {
    get(id: string): Promise<FileContent | undefined>
    put(content: FileContent): Promise<string>
    bulkPut(contents: FileContent[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
    getAll(): Promise<FileContent[]>
}

interface IDBIndexedTexts {
    get(id: string): Promise<IndexedText | undefined>
    put(record: IndexedText): Promise<string>
    bulkPut(records: IndexedText[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
    getByBookId(bookId: string): Promise<IndexedText[]>
    deleteByBookId(bookId: string): Promise<void>
}

interface IDBFolders {
    get(id: string): Promise<FolderNode | undefined>
    put(folder: FolderNode): Promise<string>
    bulkPut(folders: FolderNode[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
    getAll(): Promise<FolderNode[]>
}

interface IDBUserNotes {
    get(id: string): Promise<UserNote | undefined>
    put(record: UserNote): Promise<string>
    bulkPut(records: UserNote[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
    getByBookId(bookId: string): Promise<UserNote[]>
    deleteByBookId(bookId: string): Promise<void>
}

interface IDBBookmarks {
    get(id: string): Promise<Bookmark | undefined>
    put(record: Bookmark): Promise<string>
    bulkPut(records: Bookmark[]): Promise<string>
    delete(id: string): Promise<void>
    bulkDelete(ids: string[]): Promise<void>
    getByBookId(bookId: string): Promise<Bookmark[]>
    deleteByBookId(bookId: string): Promise<void>
    getAll(): Promise<Bookmark[]>
}

export interface IDatabase {
    files: IDBBooks
    previews: IDBBookPreviews
    folders: IDBFolders
    fileContents: IDBFileContents
    indexedTexts: IDBIndexedTexts
    userNotes: IDBUserNotes
    bookmarks: IDBBookmarks
    transaction<T>(mode: "r" | "rw", tables: TableName[], callback: () => Promise<T>): Promise<T>
}

const db = new Dexie("Database") as Dexie & {
    books: EntityTable<FileNode, "id">
    previews: EntityTable<BookPreview, "id">
    folders: EntityTable<FolderNode, "id">
    fileContents: EntityTable<FileContent, "id">
    indexedTexts: EntityTable<IndexedText, "id">
    userNotes: EntityTable<UserNote, "id">
    bookmarks: EntityTable<Bookmark, "id">
}

db.version(1).stores({
    books: "id",
    previews: "id",
    folders: "id",
})

db.version(2)
    .stores({
        books: "id",
        previews: "id",
        folders: "id",
        fileContents: "id",
    })
    .upgrade(migrateVersion2)

db.version(3).stores({
    books: "id",
    previews: "id",
    folders: "id",
    fileContents: "id",
    indexedTexts: "id, bookId",
})

db.version(4).stores({
    books: "id",
    previews: "id",
    folders: "id",
    fileContents: "id",
    indexedTexts: "id, bookId",
    userNotes: "id, bookId, pageNumber",
})

db.version(5).stores({
    books: "id",
    previews: "id",
    folders: "id",
    fileContents: "id",
    indexedTexts: "id, bookId",
    userNotes: "id, bookId, pageNumber",
    bookmarks: "id, bookId, pageNumber",
})

class DBBooks implements IDBBooks {
    get(id: string): Promise<FileNode | undefined> {
        return db.books.get(id)
    }
    put(book: FileNode): Promise<string> {
        return db.books.put(book)
    }
    bulkPut(books: FileNode[]): Promise<string> {
        return db.books.bulkPut(books)
    }
    delete(id: string): Promise<void> {
        return db.books.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.books.bulkDelete(ids)
    }
    getAll(): Promise<FileNode[]> {
        return db.books.toArray()
    }
}

class DBBookPreviews implements IDBBookPreviews {
    get(id: string): Promise<BookPreview | undefined> {
        return db.previews.get(id)
    }
    put(preview: BookPreview): Promise<string> {
        return db.previews.put(preview)
    }
    bulkPut(previews: BookPreview[]): Promise<string> {
        return db.previews.bulkPut(previews)
    }
    delete(id: string): Promise<void> {
        return db.previews.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.previews.bulkDelete(ids)
    }
}

class DBFileContents implements IDBFileContents {
    get(id: string): Promise<FileContent | undefined> {
        return db.fileContents.get(id)
    }
    put(content: FileContent): Promise<string> {
        return db.fileContents.put(content)
    }
    bulkPut(contents: FileContent[]): Promise<string> {
        return db.fileContents.bulkPut(contents)
    }
    delete(id: string): Promise<void> {
        return db.fileContents.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.fileContents.bulkDelete(ids)
    }
    getAll(): Promise<FileContent[]> {
        return db.fileContents.toArray()
    }
}

class DBIndexedTexts implements IDBIndexedTexts {
    get(id: string): Promise<IndexedText | undefined> {
        return db.indexedTexts.get(id)
    }
    put(record: IndexedText): Promise<string> {
        return db.indexedTexts.put(record)
    }
    bulkPut(records: IndexedText[]): Promise<string> {
        return db.indexedTexts.bulkPut(records)
    }
    delete(id: string): Promise<void> {
        return db.indexedTexts.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.indexedTexts.bulkDelete(ids)
    }
    getByBookId(bookId: string): Promise<IndexedText[]> {
        return db.indexedTexts.where("bookId").equals(bookId).toArray()
    }
    async deleteByBookId(bookId: string): Promise<void> {
        await db.indexedTexts.where("bookId").equals(bookId).delete()
    }
}

class DBUserNotes implements IDBUserNotes {
    get(id: string): Promise<UserNote | undefined> {
        return db.userNotes.get(id)
    }
    put(record: UserNote): Promise<string> {
        return db.userNotes.put(record)
    }
    bulkPut(records: UserNote[]): Promise<string> {
        return db.userNotes.bulkPut(records)
    }
    delete(id: string): Promise<void> {
        return db.userNotes.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.userNotes.bulkDelete(ids)
    }
    getByBookId(bookId: string): Promise<UserNote[]> {
        return db.userNotes.where("bookId").equals(bookId).toArray()
    }
    async deleteByBookId(bookId: string): Promise<void> {
        await db.userNotes.where("bookId").equals(bookId).delete()
    }
}

class DBFolders implements IDBFolders {
    get(id: string): Promise<FolderNode | undefined> {
        return db.folders.get(id)
    }
    put(folder: FolderNode): Promise<string> {
        return db.folders.put(folder)
    }
    bulkPut(folders: FolderNode[]): Promise<string> {
        return db.folders.bulkPut(folders)
    }
    delete(id: string): Promise<void> {
        return db.folders.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.folders.bulkDelete(ids)
    }
    getAll(): Promise<FolderNode[]> {
        return db.folders.toArray()
    }
}

class DBBookmarks implements IDBBookmarks {
    get(id: string): Promise<Bookmark | undefined> {
        return db.bookmarks.get(id)
    }
    put(record: Bookmark): Promise<string> {
        return db.bookmarks.put(record)
    }
    bulkPut(records: Bookmark[]): Promise<string> {
        return db.bookmarks.bulkPut(records)
    }
    delete(id: string): Promise<void> {
        return db.bookmarks.delete(id)
    }
    bulkDelete(ids: string[]): Promise<void> {
        return db.bookmarks.bulkDelete(ids)
    }
    getByBookId(bookId: string): Promise<Bookmark[]> {
        return db.bookmarks.where("bookId").equals(bookId).toArray()
    }
    async deleteByBookId(bookId: string): Promise<void> {
        await db.bookmarks.where("bookId").equals(bookId).delete()
    }
    getAll(): Promise<Bookmark[]> {
        return db.bookmarks.toArray()
    }
}

export class Database implements IDatabase {
    files = new DBBooks()
    previews = new DBBookPreviews()
    folders = new DBFolders()
    fileContents = new DBFileContents()
    indexedTexts = new DBIndexedTexts()
    userNotes = new DBUserNotes()
    bookmarks = new DBBookmarks()

    transaction<T>(mode: "r" | "rw", tables: TableName[], callback: () => Promise<T>): Promise<T> {
        return db.transaction(mode, tables, callback)
    }
}
