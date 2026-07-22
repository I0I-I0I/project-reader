import { describe, expect, it } from "vitest"
import { KeyboardHandler } from "./keyboard"

function keyEvent(code: string, key: string): KeyboardEvent {
    return {
        code,
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
    } as KeyboardEvent
}

describe("physical scroll direction", () => {
    it.each([
        ["KeyU", "г", "up"],
        ["KeyD", "в", "down"],
    ] as const)("resolves half-page %s independently of localized key", (code, key, expected) => {
        expect(
            KeyboardHandler.resolveDirection(
                keyEvent(code, key),
                ["pageup", "u"],
                ["pagedown", "d"],
            ),
        ).toBe(expected)
    })

    it.each([
        ["KeyK", "л", "up"],
        ["KeyJ", "о", "down"],
    ] as const)("resolves step %s independently of localized key", (code, key, expected) => {
        expect(
            KeyboardHandler.resolveDirection(
                keyEvent(code, key),
                ["arrowup", "k"],
                ["arrowdown", "j"],
            ),
        ).toBe(expected)
    })
})
