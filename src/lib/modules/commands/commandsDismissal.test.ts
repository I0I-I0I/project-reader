import { afterEach, describe, expect, it, vi } from "vitest"
import { CommandsStore } from "./commandsStore.svelte"
import { defineCommands } from "./commands.types"

const originalDocument = globalThis.document
const originalHTMLElement = globalThis.HTMLElement
let activeElement: FakeHTMLElement | null = null

class FakeHTMLElement {
    tagName = "INPUT"
    isContentEditable = false
    hasAttribute() {
        return false
    }
    getAttribute() {
        return null
    }
    matches() {
        return true
    }
    blur() {
        activeElement = null
    }
}

afterEach(() => {
    Object.defineProperty(globalThis, "HTMLElement", {
        configurable: true,
        value: originalHTMLElement,
    })
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
    })
})

describe("keyboard dismissal commands", () => {
    it("consumes Escape to blur before executing the close command", async () => {
        Object.defineProperty(globalThis, "HTMLElement", {
            configurable: true,
            value: FakeHTMLElement,
        })
        Object.defineProperty(globalThis, "document", {
            configurable: true,
            value: {
                get activeElement() {
                    return activeElement
                },
            },
        })

        const store = new CommandsStore()
        const parentClose = vi.fn()
        const close = vi.fn()
        store.root.register(
            defineCommands({
                "modal.cancel": {
                    id: "modal.cancel",
                    keymap: "escape",
                    label: () => "Close parent",
                    category: "navigation",
                    run: parentClose,
                },
            })["modal.cancel"],
        )
        const viewScope = store.createScope(store.root, { keyboardBoundary: true })
        viewScope.register(
            defineCommands({
                "prompt.close": {
                    id: "prompt.close",
                    keymap: ["escape", "ctrl+c"],
                    label: () => "Close",
                    category: "navigation",
                    allowInInputs: true,
                    dismissFocusedElement: true,
                    run: close,
                },
            })["prompt.close"],
        )
        const input = new FakeHTMLElement()
        const createEvent = (key = "Escape", code = "Escape", ctrlKey = false) =>
            ({
                key,
                code,
                ctrlKey,
                metaKey: false,
                altKey: false,
                shiftKey: false,
                target: input,
                preventDefault: vi.fn(),
                stopImmediatePropagation: vi.fn(),
            }) as unknown as KeyboardEvent

        activeElement = input
        const alternateClose = createEvent("c", "KeyC", true)
        await store.handleKeydown(alternateClose, viewScope)
        expect(close).toHaveBeenCalledOnce()
        expect(alternateClose.stopImmediatePropagation).not.toHaveBeenCalled()
        expect(activeElement).toBe(input)
        close.mockClear()

        const first = createEvent()
        await store.handleKeydown(first, viewScope)
        expect(first.preventDefault).toHaveBeenCalledOnce()
        expect(first.stopImmediatePropagation).toHaveBeenCalledOnce()
        expect(close).not.toHaveBeenCalled()
        expect(parentClose).not.toHaveBeenCalled()

        const second = createEvent()
        await store.handleKeydown(second, viewScope)
        expect(second.preventDefault).toHaveBeenCalledOnce()
        expect(close).toHaveBeenCalledOnce()
        expect(parentClose).not.toHaveBeenCalled()
    })
})
