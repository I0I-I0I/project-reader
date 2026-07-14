import { describe, expect, it, vi } from "vitest"
import { createViewerCommands, type ViewerCommandContext } from "./viewerCommands"

function context(): ViewerCommandContext {
    return {
        isBookmarkToggleBlocked: () => false,
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
