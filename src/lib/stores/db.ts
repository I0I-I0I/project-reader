import { Dexie, type EntityTable } from "dexie"
import type { FolderNode, FileNode, BookPreview, FileContent } from "./vfsStore.types"

interface IDBBooks {
    get(id: string): Promise<FileNode | undefined>
    put(book: FileNode): Promise<string>
    delete(id: string): Promise<void>
    getAll(): Promise<FileNode[]>
}

interface IDBBookPreviews {
    get(id: string): Promise<BookPreview | undefined>
    put(preview: BookPreview): Promise<string>
    delete(id: string): Promise<void>
}

interface IDBFileContents {
    get(id: string): Promise<FileContent | undefined>
    put(content: FileContent): Promise<string>
    delete(id: string): Promise<void>
    getAll(): Promise<FileContent[]>
}

interface IDBFolders {
    get(id: string): Promise<FolderNode | undefined>
    put(folder: FolderNode): Promise<string>
    delete(id: string): Promise<void>
    getAll(): Promise<FolderNode[]>
}

export interface IDatabase {
    files: IDBBooks
    previews: IDBBookPreviews
    folders: IDBFolders
    fileContents: IDBFileContents
    transaction<T>(mode: "r" | "rw", tables: string[], callback: () => Promise<T>): Promise<T>
}

const db = new Dexie("Database") as Dexie & {
    books: EntityTable<FileNode, "id">
    previews: EntityTable<BookPreview, "id">
    folders: EntityTable<FolderNode, "id">
    fileContents: EntityTable<FileContent, "id">
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
    .upgrade(async (tx) => {
        const books = await tx.table("books").toArray()
        for (const book of books) {
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
        }
    })

class DBBooks implements IDBBooks {
    get(id: string): Promise<FileNode | undefined> {
        return db.books.get(id)
    }
    put(book: FileNode): Promise<string> {
        return db.books.put(book)
    }
    delete(id: string): Promise<void> {
        return db.books.delete(id)
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
    delete(id: string): Promise<void> {
        return db.previews.delete(id)
    }
}

class DBFileContents implements IDBFileContents {
    get(id: string): Promise<FileContent | undefined> {
        return db.fileContents.get(id)
    }
    put(content: FileContent): Promise<string> {
        return db.fileContents.put(content)
    }
    delete(id: string): Promise<void> {
        return db.fileContents.delete(id)
    }
    getAll(): Promise<FileContent[]> {
        return db.fileContents.toArray()
    }
}

class DBFolders implements IDBFolders {
    get(id: string): Promise<FolderNode | undefined> {
        return db.folders.get(id)
    }
    put(folder: FolderNode): Promise<string> {
        return db.folders.put(folder)
    }
    delete(id: string): Promise<void> {
        return db.folders.delete(id)
    }
    getAll(): Promise<FolderNode[]> {
        return db.folders.toArray()
    }
}

export class Database implements IDatabase {
    files = new DBBooks()
    previews = new DBBookPreviews()
    folders = new DBFolders()
    fileContents = new DBFileContents()

    transaction<T>(mode: "r" | "rw", tables: string[], callback: () => Promise<T>): Promise<T> {
        return db.transaction(mode, tables, callback)
    }
}
