import type { AppCommandPayloads } from "$lib/modules/commands"
import { defineCommands } from "$lib/modules/commands"
import type { CommandScope } from "$lib/modules/commands"
import type { PromptService } from "$lib/modules/prompt"
import { buildGotoPageItems, parsePage } from "./viewerPromptItems"
import * as m from "$lib/paraglide/messages"

export interface ViewerNavigationPort {
    getCurrentPage(): number
    getTotalPages(): number
    goToPage(page: number, options: { isJump: boolean }): void
    nextPage(): void
    previousPage(): void
    close(): void
    scroll(payload: AppCommandPayloads["viewer.scroll"]): void
}

type PromptChooser = Pick<PromptService, "choose" | "close" | "snapshot">

export function createViewerNavigationCommands(dependencies: {
    viewer: ViewerNavigationPort
    prompt: PromptChooser
    scope: Pick<CommandScope, "onDestroy" | "isDestroyed">
}) {
    const { viewer, prompt, scope } = dependencies
    return defineCommands({
        "viewer.page.next": {
            id: "viewer.page.next",
            keymap: ["space", "arrowright"],
            label: () => m.keymap_next_page(),
            englishLabel: () => m.keymap_next_page({}, { locale: "en" }),
            category: "navigation",
            preventDefault: true,
            run: () => viewer.nextPage(),
        },
        "viewer.page.previous": {
            id: "viewer.page.previous",
            keymap: ["shift+space", "arrowleft"],
            label: () => m.keymap_prev_page(),
            englishLabel: () => m.keymap_prev_page({}, { locale: "en" }),
            category: "navigation",
            preventDefault: true,
            run: () => viewer.previousPage(),
        },
        "viewer.page.go-to": {
            id: "viewer.page.go-to",
            keymap: "g",
            label: () => m.keymap_goto_page(),
            englishLabel: () => m.keymap_goto_page({}, { locale: "en" }),
            category: "menu",
            preventDefault: true,
            run: async (payload) => {
                let page = payload?.page
                const totalPages = viewer.getTotalPages()
                if (page === undefined) {
                    if (totalPages < 1) return
                    const requestId = "viewer-page"
                    const stopWatchingScope = scope.onDestroy(() => {
                        if (prompt.snapshot?.request.id === requestId) prompt.close()
                    })
                    try {
                        page = await prompt.choose<number>({
                            id: requestId,
                            placeholder: `${m.keymap_goto_page()} (1-${totalPages})`,
                            items: (query) => buildGotoPageItems(query, totalPages),
                            filter: "none",
                            parseQuery: (query) =>
                                parsePage(query, viewer.getCurrentPage(), totalPages),
                        })
                    } finally {
                        stopWatchingScope()
                    }
                }
                if (page === undefined || scope.isDestroyed) return
                const clampedPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
                viewer.goToPage(clampedPage, { isJump: payload?.isJump ?? true })
            },
        },
        "viewer.close": {
            id: "viewer.close",
            keymap: "q",
            label: () => m.keymap_close_viewer(),
            englishLabel: () => m.keymap_close_viewer({}, { locale: "en" }),
            category: "commands",
            run: () => viewer.close(),
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
                viewer.scroll(payload ?? { direction: "down", amount: "step", repeated: false }),
        },
    })
}
