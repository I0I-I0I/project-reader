import { describe, expect, it, vi } from "vitest"
import { CommandScope } from "$lib/features/commands/commandsStore.svelte"
import { viewerOpenCommand } from "$lib/features/viewer/commands/viewerOpenCommand"
import { libraryPrimaryCommand } from "./libraryDashboardCommands"

describe("library command scopes", () => {
    it("exposes and executes exactly one viewer.open command", async () => {
        const open = vi.fn()
        const rootScope = new CommandScope()
        rootScope.register({ ...viewerOpenCommand, run: open })

        const libraryScope = new CommandScope(rootScope)
        libraryScope.register(libraryPrimaryCommand)
        const cardScope = new CommandScope(libraryScope)

        expect(libraryScope.listActive().filter(({ id }) => id === "viewer.open")).toHaveLength(1)
        expect(cardScope.listActive().filter(({ id }) => id === "viewer.open")).toHaveLength(1)

        await cardScope.execute("viewer.open", { bookId: "book-1" })

        expect(open).toHaveBeenCalledOnce()
        expect(open).toHaveBeenCalledWith({ bookId: "book-1" })
    })
})
