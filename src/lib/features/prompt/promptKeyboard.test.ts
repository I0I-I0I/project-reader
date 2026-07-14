import { describe, expect, it } from "vitest"
import { resolvePromptKeyAction, type PromptKeyAction } from "./promptKeyboard.js"

type EventModifiers = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">

function createKeyboardEvent(
    key: string,
    code: string,
    modifiers: Partial<EventModifiers> = {},
): KeyboardEvent {
    return {
        key,
        code,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        ...modifiers,
    } as KeyboardEvent
}

describe("resolvePromptKeyAction", () => {
    it.each<[string, KeyboardEvent, PromptKeyAction]>([
        ["ArrowDown", createKeyboardEvent("ArrowDown", "ArrowDown"), "next"],
        ["Ctrl+N", createKeyboardEvent("n", "KeyN", { ctrlKey: true }), "next"],
        ["Ctrl+J", createKeyboardEvent("j", "KeyJ", { ctrlKey: true }), "next"],
        ["ArrowUp", createKeyboardEvent("ArrowUp", "ArrowUp"), "previous"],
        ["Ctrl+P", createKeyboardEvent("p", "KeyP", { ctrlKey: true }), "previous"],
        ["Ctrl+K", createKeyboardEvent("k", "KeyK", { ctrlKey: true }), "previous"],
        ["Escape", createKeyboardEvent("Escape", "Escape"), "close"],
        ["Enter", createKeyboardEvent("Enter", "Enter"), "select"],
    ])("maps %s to %s", (_binding, event, action) => {
        expect(resolvePromptKeyAction(event)).toBe(action)
    })

    it.each(["j", "k", "n", "p"])("leaves bare %s available for query input", (key) => {
        expect(
            resolvePromptKeyAction(createKeyboardEvent(key, `Key${key.toUpperCase()}`)),
        ).toBeNull()
    })

    it.each([
        createKeyboardEvent("j", "KeyJ", { altKey: true }),
        createKeyboardEvent("n", "KeyN", { metaKey: true }),
        createKeyboardEvent("k", "KeyK", { ctrlKey: true, shiftKey: true }),
    ])("ignores unrelated modifier combinations", (event) => {
        expect(resolvePromptKeyAction(event)).toBeNull()
    })
})
