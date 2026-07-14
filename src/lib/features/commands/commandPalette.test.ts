import { afterEach, describe, expect, it, vi } from "vitest"
import { openCommandPalette } from "$lib/features/commands/commandPalette"
import { CommandScope } from "$lib/features/commands/commandsStore.svelte"
import { defineCommands } from "$lib/features/commands/commands.types"
import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"

afterEach(() => promptStore.close())

describe("command palette adapter", () => {
    it("captures a scope, lists enabled commands, and executes through its handle", async () => {
        const run = vi.fn()
        const scope = new CommandScope()
        scope.register(
            defineCommands({
                "viewer.page.next": {
                    id: "viewer.page.next",
                    label: () => "Следующая страница",
                    englishLabel: () => "Next page",
                    category: "navigation",
                    keymap: "n",
                    run,
                },
            })["viewer.page.next"],
        )

        const closed = openCommandPalette(scope)
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["viewer.page.next"])
        expect(promptStore.snapshot?.items[0]).toMatchObject({
            label: "Следующая страница",
            englishLabel: "Next page",
        })
        await promptStore.selectCurrent()
        await closed
        expect(run).toHaveBeenCalledOnce()
    })

    it("dispatches a numeric query to the scoped page command", async () => {
        const run = vi.fn()
        const scope = new CommandScope()
        scope.register(
            defineCommands({
                "viewer.page.go-to": {
                    id: "viewer.page.go-to",
                    label: () => "Go to page",
                    category: "navigation",
                    run,
                },
            })["viewer.page.go-to"],
        )

        const closed = openCommandPalette(scope, "12")
        await new Promise((resolve) => setTimeout(resolve, 0))
        const parsedOption = promptStore.snapshot?.request.parseQuery?.("12") as
            | { label: string; englishLabel?: string; description?: string }
            | undefined
        expect(parsedOption).toMatchObject({
            label: "Перейти к странице 12",
            englishLabel: "Go to page 12",
        })
        expect(parsedOption?.description).toBeUndefined()
        await promptStore.selectCurrent()
        await closed
        expect(run).toHaveBeenCalledWith({ page: 12, isJump: true })
    })

    it("closes when its captured scope is destroyed", async () => {
        const scope = new CommandScope()
        scope.register(
            defineCommands({
                "viewer.close": {
                    id: "viewer.close",
                    label: () => "Close viewer",
                    category: "commands",
                    run: () => {},
                },
            })["viewer.close"],
        )

        const closed = openCommandPalette(scope)
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.isOpen).toBe(true)
        scope.destroy()
        await closed
        expect(promptStore.isOpen).toBe(false)
    })

    it("omits disabled commands", async () => {
        const scope = new CommandScope()
        scope.register(
            defineCommands({
                "viewer.page.next": {
                    id: "viewer.page.next",
                    label: () => "Next page",
                    category: "navigation",
                    disabled: () => true,
                    run: () => {},
                },
            })["viewer.page.next"],
        )

        void openCommandPalette(scope)
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.items).toEqual([])
    })
})
