import { browser } from "$app/environment"

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!browser) {
            reject(new Error("IndexedDB is only available in the browser"))
            return
        }
        const request = indexedDB.open("BookReaderDB", 1)
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains("books")) {
                db.createObjectStore("books")
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function saveBookFile(
    id: string,
    fileOrHandle: FileSystemFileHandle | File,
): Promise<void> {
    const db = await getDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction("books", "readwrite")
        const store = tx.objectStore("books")
        const request = store.put(fileOrHandle, id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

export async function getBookFile(id: string): Promise<FileSystemFileHandle | File | undefined> {
    const db = await getDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction("books", "readonly")
        const store = tx.objectStore("books")
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function deleteBookFile(id: string): Promise<void> {
    const db = await getDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction("books", "readwrite")
        const store = tx.objectStore("books")
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

export async function verifyPermission(
    handle: FileSystemFileHandle,
    readWrite = false,
): Promise<boolean> {
    if (typeof handle.queryPermission !== "function") {
        return true
    }
    const options: { mode: "read" | "readwrite" } = { mode: readWrite ? "readwrite" : "read" }

    try {
        if ((await handle.queryPermission(options)) === "granted") {
            return true
        }

        if (typeof handle.requestPermission === "function") {
            if ((await handle.requestPermission(options)) === "granted") {
                return true
            }
        }
    } catch (e) {
        console.error("Error verifying/requesting permission:", e)
    }

    return false
}

function getPreviewsDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!browser) {
            reject(new Error("IndexedDB is only available in the browser"))
            return
        }
        const request = indexedDB.open("BookPreviewsDB", 1)
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains("previews")) {
                db.createObjectStore("previews")
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function saveBookPreview(id: string, previewDataUrl: string): Promise<void> {
    let dataToStore: Blob | string = previewDataUrl
    if (previewDataUrl.startsWith("blob:")) {
        try {
            const response = await fetch(previewDataUrl)
            dataToStore = await response.blob()
        } catch (e) {
            console.error("Failed to fetch blob from URL, saving URL string instead", e)
        }
    }
    const db = await getPreviewsDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction("previews", "readwrite")
        const store = tx.objectStore("previews")
        const request = store.put(dataToStore, id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

export async function getBookPreview(id: string): Promise<Blob | string | undefined> {
    const db = await getPreviewsDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction("previews", "readonly")
        const store = tx.objectStore("previews")
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function deleteBookPreview(id: string): Promise<void> {
    const db = await getPreviewsDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction("previews", "readwrite")
        const store = tx.objectStore("previews")
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}
