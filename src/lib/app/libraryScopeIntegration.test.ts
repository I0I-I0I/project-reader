import { describe, expect, it, vi } from "vitest"
import { CommandScope } from "$lib/modules/commands"
import { createViewerOpenCommand } from "$lib/modules/viewer"
import { libraryBookOpenCommand } from "$lib/modules/library"

describe("library command scopes", () => {
    it("exposes and executes exactly one viewer.open command", async () => {
        const open = vi.fn()
        const rootScope = new CommandScope()
        const viewerOpenCommand = createViewerOpenCommand({ onFileAccessFailure: vi.fn() })
        rootScope.register({ ...viewerOpenCommand, run: open })

        const libraryScope = new CommandScope(rootScope)
        libraryScope.register({ ...libraryBookOpenCommand, id: "library.primary-action" })
        const cardScope = new CommandScope(libraryScope)

        expect(libraryScope.listActive().filter(({ id }) => id === "viewer.open")).toHaveLength(1)
        expect(cardScope.listActive().filter(({ id }) => id === "viewer.open")).toHaveLength(1)

        await cardScope.execute("viewer.open", { bookId: "book-1" })

        expect(open).toHaveBeenCalledOnce()
        expect(open).toHaveBeenCalledWith({ bookId: "book-1" })
    })
})
