import { browser } from "$app/environment"
import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
import type { Bookmark } from "$lib/core/vfs/vfsStore.types"

class BookmarksStore {
    bookmarks = $state<Bookmark[]>([])

    async loadAllBookmarks() {
        if (!browser) return
        try {
            const loaded = await vfsStore.db.bookmarks.getAll()
            this.bookmarks = loaded.sort((a, b) => b.createdAt - a.createdAt)
        } catch (e) {
            console.error("[BookmarksStore] Failed to load bookmarks:", e)
        }
    }

    async addBookmark(bookId: string, pageNumber: number, name: string) {
        const bookmark: Bookmark = {
            id: crypto.randomUUID(),
            bookId,
            pageNumber,
            name,
            createdAt: Date.now(),
        }

        try {
            await vfsStore.db.bookmarks.put(bookmark)
            this.bookmarks.unshift(bookmark)
            this.bookmarks = [...this.bookmarks] // force reactivity
            return bookmark
        } catch (e) {
            console.error("[BookmarksStore] Failed to add bookmark:", e)
            return null
        }
    }

    async updateBookmark(id: string, name: string) {
        const idx = this.bookmarks.findIndex((b) => b.id === id)
        if (idx !== -1) {
            const updated = {
                ...this.bookmarks[idx],
                name,
            }
            try {
                await vfsStore.db.bookmarks.put(updated)
                this.bookmarks[idx] = updated
                this.bookmarks = [...this.bookmarks]
            } catch (e) {
                console.error("[BookmarksStore] Failed to update bookmark:", e)
            }
        }
    }

    async deleteBookmark(id: string) {
        try {
            await vfsStore.db.bookmarks.delete(id)
            this.bookmarks = this.bookmarks.filter((b) => b.id !== id)
        } catch (e) {
            console.error("[BookmarksStore] Failed to delete bookmark:", e)
        }
    }
}

export const bookmarksStore = new BookmarksStore()
