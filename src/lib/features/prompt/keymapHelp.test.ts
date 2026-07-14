import { describe, expect, it } from "vitest"
import { buildKeymapHelpItems, filterKeymapHelpItems } from "./keymapHelp"

describe("keyboard help aliases", () => {
    it("preserves aliases and filters localized commands by English text", () => {
        const items = buildKeymapHelpItems(
            [
                {
                    label: "Следующий заголовок",
                    englishLabel: "Next heading",
                    keymap: ["j", "arrowdown"],
                },
            ],
            (key) => key.toLowerCase(),
        )

        expect(items).toEqual([
            {
                keys: ["j", "arrowdown"],
                description: "Следующий заголовок",
                englishDescription: "Next heading",
            },
        ])
        expect(filterKeymapHelpItems(items, "next heading")).toEqual(items)
        expect(filterKeymapHelpItems(items, "следующий")).toEqual(items)
    })

    it("deduplicates shadowed bindings by normalized shortcut", () => {
        const items = buildKeymapHelpItems(
            [
                { label: "First", keymap: "Shift+O" },
                { label: "Second", keymap: "shift+o" },
            ],
            (key) => key.toLowerCase(),
        )

        expect(items.map(({ description }) => description)).toEqual(["First"])
    })
})
