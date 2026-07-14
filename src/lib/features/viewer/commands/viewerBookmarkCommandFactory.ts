import * as m from "$lib/paraglide/messages"
import { defineCommands } from "$lib/features/commands/commands.types"
import type { CommandScope } from "$lib/features/commands/commandsStore.svelte"
import {
    openViewerBookmark,
    openViewerBookmarkPrompt,
} from "$lib/features/viewer/commands/viewerPromptFlows"

export function createViewerBookmarkCommands(getScope: () => CommandScope) {
    return defineCommands({
        "viewer.bookmark.open": {
            id: "viewer.bookmark.open",
            keymap: "shift+b",
            label: () => m.keymap_toggle_bookmarks?.() ?? "Open bookmark",
            englishLabel: () => "Open bookmark",
            category: "bookmarks",
            run: async (payload) => {
                if (!payload?.bookmarkId) {
                    await openViewerBookmarkPrompt(getScope())
                    return
                }
                await openViewerBookmark(payload.bookmarkId)
            },
        },
    })
}
