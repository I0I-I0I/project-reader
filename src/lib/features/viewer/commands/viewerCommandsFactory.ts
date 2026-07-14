import * as m from "$lib/paraglide/messages"
import { defineCommands } from "$lib/features/commands/commands.types"
import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"

export interface ViewerCommandContext {
    isBookmarkToggleBlocked(): boolean
    toggleBookmark(): void
    closeViewer(): void
    nextPage(): void
    previousPage(): void
    goToPage(page: number, isJump: boolean): void
    openPagePrompt(): Promise<void>
    openSearchPrompt(): Promise<void>
    selectSearchResult(query: string, matchIndex: number): void
    closeSearch(): void
    nextSearchResult(): void
    previousSearchResult(): void
    toggleOutline(): void
    toggleSettings(): void
    toggleNotes(): void
    toggleBookmarks(): void
    toggleToolbar(): void
    toggleFullscreen(): void | Promise<void>
    scroll(payload: AppCommandPayloads["viewer.scroll"]): void
}

export function createViewerCommands(context: ViewerCommandContext) {
    return defineCommands({
        "viewer.bookmark.toggle-page": {
            id: "viewer.bookmark.toggle-page",
            keymap: "b",
            label: () => "Bookmark Page / Delete Bookmark",
            category: "commands",
            disabled: context.isBookmarkToggleBlocked,
            preventDefault: true,
            run: () => context.toggleBookmark(),
        },
        "viewer.page.next": {
            id: "viewer.page.next",
            keymap: ["space", "arrowright"],
            label: () => m.keymap_next_page(),
            englishLabel: () => m.keymap_next_page({}, { locale: "en" }),
            category: "navigation",
            preventDefault: true,
            run: () => context.nextPage(),
        },
        "viewer.page.previous": {
            id: "viewer.page.previous",
            keymap: ["shift+space", "arrowleft"],
            label: () => m.keymap_prev_page(),
            englishLabel: () => m.keymap_prev_page({}, { locale: "en" }),
            category: "navigation",
            preventDefault: true,
            run: () => context.previousPage(),
        },
        "viewer.page.go-to": {
            id: "viewer.page.go-to",
            keymap: "g",
            label: () => m.keymap_goto_page(),
            englishLabel: () => m.keymap_goto_page({}, { locale: "en" }),
            category: "menu",
            preventDefault: true,
            run: async (payload) => {
                if (payload?.page === undefined) {
                    await context.openPagePrompt()
                    return
                }
                context.goToPage(payload.page, payload.isJump ?? true)
            },
        },
        "viewer.search": {
            id: "viewer.search",
            keymap: "/",
            label: () => m.keymap_search(),
            englishLabel: () => m.keymap_search?.({}, { locale: "en" }) ?? "Search PDF",
            category: "commands",
            preventDefault: true,
            run: async (payload) => {
                if (payload?.query === undefined || payload.matchIndex === undefined) {
                    await context.openSearchPrompt()
                    return
                }
                context.selectSearchResult(payload.query, payload.matchIndex)
            },
        },
        "viewer.search.close": {
            id: "viewer.search.close",
            label: () => m.prompt_close_aria(),
            englishLabel: () => "Close search",
            category: "commands",
            disabled: () => false,
            run: () => context.closeSearch(),
        },
        "viewer.search.next": {
            id: "viewer.search.next",
            keymap: "n",
            label: () => m.keymap_next_match(),
            englishLabel: () => m.keymap_next_match?.({}, { locale: "en" }) ?? "Next match",
            category: "navigation",
            preventDefault: true,
            run: () => context.nextSearchResult(),
        },
        "viewer.search.previous": {
            id: "viewer.search.previous",
            keymap: "shift+n",
            label: () => m.keymap_prev_match(),
            englishLabel: () => m.keymap_prev_match?.({}, { locale: "en" }) ?? "Previous match",
            category: "navigation",
            preventDefault: true,
            run: () => context.previousSearchResult(),
        },
        "viewer.sidebar.outline.toggle": {
            id: "viewer.sidebar.outline.toggle",
            keymap: "shift+o",
            label: () => m.keymap_toggle_outline(),
            englishLabel: () => m.keymap_toggle_outline({}, { locale: "en" }),
            category: "commands",
            run: () => context.toggleOutline(),
        },
        "viewer.sidebar.settings.toggle": {
            id: "viewer.sidebar.settings.toggle",
            keymap: "shift+s",
            label: () => m.keymap_toggle_settings(),
            englishLabel: () => m.keymap_toggle_settings({}, { locale: "en" }),
            category: "commands",
            run: () => context.toggleSettings(),
        },
        "viewer.sidebar.notes.toggle": {
            id: "viewer.sidebar.notes.toggle",
            keymap: "shift+h",
            label: () => m.keymap_toggle_notes(),
            englishLabel: () => m.keymap_toggle_notes({}, { locale: "en" }),
            category: "commands",
            run: () => context.toggleNotes(),
        },
        "viewer.sidebar.bookmarks.toggle": {
            id: "viewer.sidebar.bookmarks.toggle",
            label: () => m.keymap_toggle_bookmarks?.() ?? "Toggle bookmarks",
            englishLabel: () => "Toggle bookmarks",
            category: "commands",
            run: () => context.toggleBookmarks(),
        },
        "viewer.close": {
            id: "viewer.close",
            keymap: "q",
            label: () => m.keymap_close_viewer(),
            englishLabel: () => m.keymap_close_viewer({}, { locale: "en" }),
            category: "commands",
            run: () => context.closeViewer(),
        },
        "viewer.toolbar.toggle": {
            id: "viewer.toolbar.toggle",
            keymap: "shift+m",
            label: () => m.keymap_hide_toolbars(),
            englishLabel: () => m.keymap_hide_toolbars({}, { locale: "en" }),
            category: "commands",
            run: () => context.toggleToolbar(),
        },
        "viewer.fullscreen.toggle": {
            id: "viewer.fullscreen.toggle",
            label: () => "Toggle fullscreen",
            englishLabel: () => "Toggle fullscreen",
            category: "commands",
            run: () => context.toggleFullscreen(),
        },
        "viewer.scroll": {
            id: "viewer.scroll",
            keymap: ["j", "arrowdown", "k", "arrowup", "d", "pagedown", "u", "pageup"],
            label: () => m.keymap_scroll_down(),
            englishLabel: () => m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
            keyboardPayload: (event) => {
                const key = event.key.toLowerCase()
                return {
                    direction:
                        key === "k" || key === "arrowup" || key === "u" || key === "pageup"
                            ? "up"
                            : "down",
                    amount:
                        key === "d" || key === "pagedown" || key === "u" || key === "pageup"
                            ? "page"
                            : "step",
                    repeated: event.repeat,
                }
            },
            run: (payload) =>
                context.scroll(payload ?? { direction: "down", amount: "step", repeated: false }),
        },
    })
}
