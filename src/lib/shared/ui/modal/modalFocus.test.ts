import { afterEach, describe, expect, it, vi } from "vitest"
import { dismissFocusedInteractiveElement } from "./modalFocus"

const originalHTMLElement = globalThis.HTMLElement

class FakeHTMLElement {
    hidden = false
    blurred = false
    constructor(
        private readonly focusable: boolean,
        private readonly attributes: Record<string, string> = {},
    ) {}
    hasAttribute(name: string) {
        return name === "hidden" ? this.hidden : name in this.attributes
    }
    getAttribute(name: string) {
        return this.attributes[name] ?? null
    }
    matches() {
        return this.focusable
    }
    blur() {
        this.blurred = true
    }
}

afterEach(() => {
    Object.defineProperty(globalThis, "HTMLElement", {
        configurable: true,
        value: originalHTMLElement,
    })
})

describe("dismissFocusedInteractiveElement", () => {
    it("blurs a focused interactive element inside the owning view", () => {
        Object.defineProperty(globalThis, "HTMLElement", {
            configurable: true,
            value: FakeHTMLElement,
        })
        const active = new FakeHTMLElement(true)
        const container = { contains: vi.fn(() => true) }

        expect(
            dismissFocusedInteractiveElement(
                container as unknown as HTMLElement,
                active as unknown as Element,
            ),
        ).toBe(true)
        expect(active.blurred).toBe(true)
        expect(container.contains).toHaveBeenCalledOnce()
    })

    it("does not consume focus from containers or another view", () => {
        Object.defineProperty(globalThis, "HTMLElement", {
            configurable: true,
            value: FakeHTMLElement,
        })
        const plain = new FakeHTMLElement(false)
        const interactive = new FakeHTMLElement(true)

        expect(dismissFocusedInteractiveElement(null, plain as unknown as Element)).toBe(false)
        expect(
            dismissFocusedInteractiveElement(
                { contains: () => false } as unknown as HTMLElement,
                interactive as unknown as Element,
            ),
        ).toBe(false)
        expect(interactive.blurred).toBe(false)
    })
})
