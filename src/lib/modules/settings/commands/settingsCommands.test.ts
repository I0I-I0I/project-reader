import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("$app/state", () => ({
    page: { url: new URL("https://example.test/") },
}))
import { CONSTANTS, settingsStore } from "../state/settingsStore.svelte"
import { commandsStore } from "$lib/modules/commands"
import { promptStore } from "$lib/modules/prompt"
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

    it("uses typed quality commands for viewer controls", async () => {
        const originalQuality = settingsStore.quality
        settingsStore.quality = CONSTANTS.minQuality
        unregister = commandsStore.register(commandsStore.root, settingsCommands)
        commandsStore.activeScope = commandsStore.root

        await commandsStore.execute("settings.quality.in")
        expect(settingsStore.quality).toBe(CONSTANTS.minQuality + 1)
        await commandsStore.execute("settings.quality.out")
        expect(settingsStore.quality).toBe(CONSTANTS.minQuality)
        await commandsStore.execute("settings.quality.in", { value: CONSTANTS.maxQuality + 1 })
        expect(settingsStore.quality).toBe(CONSTANTS.maxQuality)
        await commandsStore.execute("settings.quality.in", { value: 2.5 })
        expect(settingsStore.quality).toBe(3)
        await commandsStore.execute("settings.quality.in", { value: Number.NaN })
        expect(settingsStore.quality).toBe(3)
        settingsStore.quality = originalQuality
    })

    it("uses one command path for language chooser and direct changes", async () => {
        const original = settingsStore.language
        unregister = commandsStore.register(commandsStore.root, settingsCommands)
        commandsStore.activeScope = commandsStore.root

        const execution = commandsStore.execute("settings.language")
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.request.id).toBe("settings.language")
        expect(promptStore.snapshot?.items.find(({ value }) => value === "ru")?.englishLabel).toBe(
            "Russian",
        )
        expect(
            promptStore.snapshot?.items.filter(({ description }) => description === "✓"),
        ).toHaveLength(1)

        const target = original === "en" ? "ru" : "en"
        const targetIndex =
            promptStore.snapshot?.items.findIndex(({ value }) => value === target) ?? -1
        if (targetIndex > 0) promptStore.moveSelection(targetIndex)
        await promptStore.selectCurrent()
        await execution
        expect(settingsStore.language).toBe(target)

        await commandsStore.execute("settings.language", { value: original })
        expect(settingsStore.language).toBe(original)
    })

    it("uses one command path for chooser and direct theme changes", async () => {
        const original = settingsStore.theme
        unregister = commandsStore.register(commandsStore.root, settingsCommands)
        commandsStore.activeScope = commandsStore.root

        const execution = commandsStore.execute("settings.theme")
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.request.id).toBe("settings.theme")
        expect(
            promptStore.snapshot?.items.filter(({ description }) => description === "✓"),
        ).toHaveLength(1)

        const darkIndex =
            promptStore.snapshot?.items.findIndex(({ value }) => value === "dark") ?? -1
        if (darkIndex > 0) promptStore.moveSelection(darkIndex)
        await promptStore.selectCurrent()
        await execution
        expect(settingsStore.theme).toBe("dark")

        await commandsStore.execute("settings.theme", { value: original })
    })
})
