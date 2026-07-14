import { afterEach, describe, expect, it } from "vitest"
import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
import { commandsStore } from "$lib/features/commands/commandsStore.svelte"
import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"
import { settingsCommands } from "./settingsCommands"

let unregister: (() => void) | undefined

afterEach(() => {
    promptStore.close()
    unregister?.()
    unregister = undefined
})

describe("settings commands", () => {
    it("uses typed zoom commands for viewer controls and shortcuts", () => {
        const originalScale = settingsStore.scale
        settingsStore.scale = 1

        settingsCommands["settings.zoom.in"].run(undefined)
        expect(settingsStore.scale).toBeGreaterThan(1)
        settingsCommands["settings.zoom.out"].run(undefined)
        expect(settingsStore.scale).toBe(1)
        settingsCommands["settings.zoom.in"].run({ value: 1.75 })
        expect(settingsStore.scale).toBe(1.75)
        settingsStore.scale = originalScale
    })

    it("uses one command path for chooser and direct theme changes", async () => {
        const original = settingsStore.theme
        unregister = commandsStore.register(commandsStore.root, settingsCommands)
        commandsStore.activeScope = commandsStore.root

        const execution = commandsStore.execute("settings.theme")
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.request.id).toBe("settings.theme")

        const darkIndex =
            promptStore.snapshot?.options.findIndex(({ value }) => value === "dark") ?? -1
        if (darkIndex > 0) promptStore.moveSelection(darkIndex)
        await promptStore.selectCurrent()
        await execution
        expect(settingsStore.theme).toBe("dark")

        await commandsStore.execute("settings.theme", { value: original })
    })
})
