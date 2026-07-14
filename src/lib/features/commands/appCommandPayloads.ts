import type { Layout, Theme } from "$lib/core/stores/settingsStore.svelte"

export type Locale = "en" | "ru"
export type ScrollDirection = "up" | "down"

/**
 * Application command contract. Every public command ID and its domain payload lives here.
 * Optional chooser commands accept `undefined`; entity actions keep required payloads.
 */
export interface AppCommandPayloads {
    "prompt.open": { initialQuery?: string } | undefined
    "prompt.close": undefined
    "prompt.next": undefined
    "prompt.previous": undefined
    "prompt.select": undefined
    "prompt.navigate.back": undefined
    "prompt.history.back": undefined
    "prompt.history.forward": undefined
    "help.toggle": undefined
    "settings.theme": { value?: Theme } | undefined
    "settings.layout": { value?: Layout } | undefined
    "settings.language": { value?: Locale } | undefined
    "settings.animations.toggle": undefined
    "settings.zoom.in": { value?: number } | undefined
    "settings.zoom.out": { value?: number } | undefined
    "settings.quality.in": { value?: number } | undefined
    "settings.quality.out": { value?: number } | undefined
    "library.book.open": { bookId?: string } | undefined
    "library.book.open-recursive": { bookId?: string } | undefined
    "library.folder.open": { folderId?: string | null } | undefined
    "library.folder.up": undefined
    "library.grid.down": { repeated?: boolean } | undefined
    "library.grid.up": { repeated?: boolean } | undefined
    "library.grid.left": { repeated?: boolean } | undefined
    "library.grid.right": { repeated?: boolean } | undefined
    "library.picker.open": undefined
    "library.picker.focus": undefined
    "library.picker.select": undefined
    "library.folder.create": { name?: string } | undefined
    "library.books.import": undefined
    "library.continue-reading": undefined
    "library.primary-action": undefined
    "library.selection.toggle": { nodeId?: string } | undefined
    "library.selection.all": undefined
    "library.selection.clear": undefined
    "library.selection.move": { nodeIds?: string[]; targetFolderId?: string | null } | undefined
    "library.selection.delete": { nodeIds?: string[]; confirmed?: boolean } | undefined
    "library.node.move": { nodeId?: string; targetFolderId?: string | null } | undefined
    "library.node.delete": { nodeId?: string; confirmed?: boolean } | undefined
    "library.node.edit-metadata":
        | {
              nodeId?: string
              name?: string
              author?: string | null
              pageNumber?: number
          }
        | undefined
    "library.node.relink":
        | {
              nodeId?: string
              fileSource?: File | FileSystemFileHandle
          }
        | undefined
    "library.card.menu.toggle": { nodeId?: string } | undefined
    "library.card.open": { nodeId?: string } | undefined
    "library.card.focus": { nodeId?: string } | undefined
    "library.book.read-state.toggle": { nodeId?: string; markAsRead?: boolean } | undefined
    "viewer.open": { bookId?: string } | undefined
    "viewer.close": undefined
    "viewer.page.next": undefined
    "viewer.page.previous": undefined
    "viewer.page.go-to": { page?: number; isJump?: boolean } | undefined
    "viewer.search": { query?: string; matchIndex?: number } | undefined
    "viewer.search.close": undefined
    "viewer.search.next": undefined
    "viewer.search.previous": undefined
    "viewer.search.history.clear": undefined
    "viewer.bookmark.toggle-page": undefined
    "viewer.bookmark.open": { bookmarkId?: string } | undefined
    "viewer.bookmark.add": { page?: number; name?: string } | undefined
    "viewer.bookmark.edit": { bookmarkId?: string; name?: string } | undefined
    "viewer.bookmark.delete": { bookmarkId?: string; confirmed?: boolean } | undefined
    "viewer.note.add": { page?: number } | undefined
    "viewer.note.edit": { noteId?: string; x?: number; y?: number } | undefined
    "viewer.note.save": { noteId?: string; content?: string } | undefined
    "viewer.note.delete": { noteId?: string; confirmed?: boolean } | undefined
    "viewer.sidebar.outline.toggle": undefined
    "viewer.sidebar.settings.toggle": undefined
    "viewer.sidebar.notes.toggle": undefined
    "viewer.sidebar.bookmarks.toggle": undefined
    "viewer.sidebar.close": undefined
    "viewer.outline.next": undefined
    "viewer.outline.previous": undefined
    "viewer.outline.select": undefined
    "viewer.outline.search": undefined
    "viewer.list.next": undefined
    "viewer.list.previous": undefined
    "viewer.list.select": undefined
    "viewer.list.search": undefined
    "viewer.toolbar.toggle": undefined
    "viewer.fullscreen.toggle": undefined
    "viewer.zoom.fit-width": undefined
    "viewer.scroll":
        | { direction: ScrollDirection; amount: "step" | "page"; repeated?: boolean }
        | undefined
    "modal.confirm": undefined
    "modal.cancel": undefined
}

export type CommandId = keyof AppCommandPayloads

export type ExecuteArgs<K extends CommandId> = AppCommandPayloads[K] extends undefined
    ? []
    : undefined extends AppCommandPayloads[K]
      ? [payload?: Exclude<AppCommandPayloads[K], undefined>]
      : [payload: AppCommandPayloads[K]]
