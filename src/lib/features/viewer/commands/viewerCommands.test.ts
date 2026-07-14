import { describe, expect, it, vi } from "vitest"
import { createViewerCommands, type ViewerCommandContext } from "./viewerCommands"
import * as m from "$lib/paraglide/messages"
import { createViewerBookmarkCommands } from "./viewerBookmarkCommandFactory"
import { CommandScope } from "$lib/features/commands/commandsStore.svelte"

function context(): ViewerCommandContext {
    return {
        isBookmarkToggleBlocked: () => false,
        isCurrentPageBookmarked: () => false,
        toggleBookmark: vi.fn(),
        closeViewer: vi.fn(),
        nextPage: vi.fn(),
        previousPage: vi.fn(),
        goToPage: vi.fn(),
        openPagePrompt: vi.fn().mockResolvedValue(undefined),
        openSearchPrompt: vi.fn().mockResolvedValue(undefined),
        selectSearchResult: vi.fn(),
        closeSearch: vi.fn(),
        nextSearchResult: vi.fn(),
        previousSearchResult: vi.fn(),
        toggleOutline: vi.fn(),
        toggleSettings: vi.fn(),
        toggleNotes: vi.fn(),
        toggleBookmarks: vi.fn(),
        toggleToolbar: vi.fn(),
        toggleFullscreen: vi.fn(),
        scroll: vi.fn(),
    }
}

describe("viewer commands", () => {
    it("gives every palette command a non-empty English alias", () => {
        for (const command of Object.values(createViewerCommands(context()))) {
            expect(
                "englishLabel" in command ? command.englishLabel().trim() : undefined,
                command.id,
            ).toBeTruthy()
        }
    })

    it("uses matching add/remove bookmark labels for the current state", async () => {
        let bookmarked = false
        const commandContext = context()
        commandContext.isCurrentPageBookmarked = () => bookmarked
        const command = createViewerCommands(commandContext)["viewer.bookmark.toggle-page"]

        expect(command.label()).toBe(m.add_bookmark())
        expect(command.englishLabel?.()).toBe(m.add_bookmark({}, { locale: "en" }))
        command.run()
        expect(commandContext.toggleBookmark).toHaveBeenCalledOnce()

        bookmarked = true
        expect(command.label()).toBe(m.remove_bookmark())
        expect(command.englishLabel?.()).toBe(m.remove_bookmark({}, { locale: "en" }))
    })

    it("uses the same semantic message for opening bookmarks in both locales", () => {
        const command = createViewerBookmarkCommands(() => new CommandScope())[
            "viewer.bookmark.open"
        ]
        expect(command.label()).toBe(m.open_bookmark())
        expect(command.englishLabel?.()).toBe(m.open_bookmark({}, { locale: "en" }))
    })

    it("uses the same semantic message for closing search in both locales", () => {
        const command = createViewerCommands(context())["viewer.search.close"]
        expect(command.label()).toBe(m.close_search())
        expect(command.englishLabel?.()).toBe(m.close_search({}, { locale: "en" }))
    })

    it("opens the page prompt without a payload and navigates with a page payload", async () => {
        const commandContext = context()
        const commands = createViewerCommands(commandContext)

        await commands["viewer.page.go-to"].run(undefined)
        expect(commandContext.openPagePrompt).toHaveBeenCalledOnce()

        await commands["viewer.page.go-to"].run({ page: 12, isJump: false })
        expect(commandContext.goToPage).toHaveBeenCalledWith(12, false)
    })

    it("maps repeat-aware scroll keys to typed payloads", () => {
        const commandContext = context()
        const command = createViewerCommands(commandContext)["viewer.scroll"]
        const event = { key: "PageUp", repeat: true } as KeyboardEvent

        const payload = command.keyboardPayload?.(event)
        command.run(payload)

        expect(commandContext.scroll).toHaveBeenCalledWith({
            direction: "up",
            amount: "page",
            repeated: true,
        })
    })

    it("uses a visible default action when scroll is selected from the palette", () => {
        const commandContext = context()
        const command = createViewerCommands(commandContext)["viewer.scroll"]

        command.run(undefined)
        expect(commandContext.scroll).toHaveBeenCalledWith({
            direction: "down",
            amount: "step",
            repeated: false,
        })
    })

    it("executes a selected search result through the typed search command", async () => {
        const commandContext = context()
        const command = createViewerCommands(commandContext)["viewer.search"]

        await command.run({ query: "reader", matchIndex: 3 })
        expect(commandContext.selectSearchResult).toHaveBeenCalledWith("reader", 3)
        expect(commandContext.openSearchPrompt).not.toHaveBeenCalled()
    })
})
