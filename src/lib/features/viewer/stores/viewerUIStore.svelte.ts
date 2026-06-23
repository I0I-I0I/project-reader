import { uiStore } from "$lib/core/stores/uiStore.svelte"
import { notesStore } from "$lib/features/viewer/stores/notesStore.svelte"

export type ViewerSidebarTab = "outline" | "notes" | "bookmarks"

class ViewerUIStore {
    activeSidebar = $state<"left" | "settings" | null>(null)
    activeSidebarTab = $state<ViewerSidebarTab>("outline")

    isBookmarkAddModalOpen = $state(false)
    bookmarkName = $state("")
    bookmarkToDeleteId = $state<string | null>(null)
    noteToDeleteId = $state<string | null>(null)

    get isLeftSidebarOpen() {
        return this.activeSidebar === "left"
    }
    set isLeftSidebarOpen(v: boolean) {
        this.activeSidebar = v ? "left" : null
    }

    get isSettingsOpen() {
        return this.activeSidebar === "settings"
    }
    set isSettingsOpen(v: boolean) {
        this.activeSidebar = v ? "settings" : null
    }

    get isOutlineOpen() {
        return this.activeSidebar === "left" && this.activeSidebarTab === "outline"
    }
    set isOutlineOpen(v: boolean) {
        if (v) {
            this.activeSidebar = "left"
            this.activeSidebarTab = "outline"
        } else if (this.isOutlineOpen) {
            this.activeSidebar = null
        }
    }

    get isNotesOpen() {
        return this.activeSidebar === "left" && this.activeSidebarTab === "notes"
    }
    set isNotesOpen(v: boolean) {
        if (v) {
            this.activeSidebar = "left"
            this.activeSidebarTab = "notes"
        } else if (this.isNotesOpen) {
            this.activeSidebar = null
        }
    }

    get isBookmarksOpen() {
        return this.activeSidebar === "left" && this.activeSidebarTab === "bookmarks"
    }
    set isBookmarksOpen(v: boolean) {
        if (v) {
            this.activeSidebar = "left"
            this.activeSidebarTab = "bookmarks"
        } else if (this.isBookmarksOpen) {
            this.activeSidebar = null
        }
    }

    get isAnyModalOpen() {
        return (
            this.isBookmarkAddModalOpen ||
            !!this.bookmarkToDeleteId ||
            !!this.noteToDeleteId ||
            !!notesStore.editingNote
        )
    }

    closeSidebars() {
        this.activeSidebar = null
    }

    openBookmarkAddModal(defaultName: string) {
        this.bookmarkName = defaultName
        this.isBookmarkAddModalOpen = true
    }

    registerWithGlobalUI() {
        return uiStore.registerModal(() => this.isAnyModalOpen)
    }
}

export const viewerUIStore = new ViewerUIStore()
