// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { flushSync, mount, unmount } from "svelte"

let SliderTestHarness: (typeof import("./SliderTestHarness.svelte"))["default"]

beforeAll(async () => {
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    })
    SliderTestHarness = (await import("./SliderTestHarness.svelte")).default
})

beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 })
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 })
})

afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
})

function dispatchTouch(
    element: Element,
    type: "touchstart" | "touchmove" | "touchend",
    touches: Array<{ clientX: number; clientY: number }>,
    changedTouches: Array<{ clientX: number; clientY: number }> = [],
) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperties(event, {
        touches: { value: touches },
        changedTouches: { value: changedTouches },
    })
    element.dispatchEvent(event)
}

function beginSettlement(element: Element) {
    dispatchTouch(element, "touchstart", [{ clientX: 200, clientY: 100 }])
    dispatchTouch(element, "touchmove", [{ clientX: 120, clientY: 100 }])
    dispatchTouch(element, "touchend", [], [{ clientX: 120, clientY: 100 }])
}

function mountHarness(onCommit = vi.fn()) {
    const target = document.createElement("div")
    document.body.append(target)
    const component = mount(SliderTestHarness, { target, props: { onCommit } })
    flushSync()
    const viewport = target.querySelector('[role="group"]')
    if (!viewport) throw new Error("Slider viewport was not mounted")
    return { component, target, viewport, onCommit }
}

describe("Slider component", () => {
    it("renders both neighbor slides inert and hidden from accessibility", async () => {
        const { component, target } = mountHarness()
        const neighbors = target.querySelectorAll(".slider-neighbor")

        expect(neighbors).toHaveLength(2)
        for (const neighbor of neighbors) {
            expect(neighbor.hasAttribute("inert")).toBe(true)
            expect(neighbor.getAttribute("aria-hidden")).toBe("true")
        }

        await unmount(component)
    })

    it("tears down a pending settlement when disabled", async () => {
        const { component, viewport, onCommit } = mountHarness()
        beginSettlement(viewport)

        component.setEnabled(false)
        flushSync()
        vi.advanceTimersByTime(200)

        expect(onCommit).not.toHaveBeenCalled()
        await unmount(component)
    })

    it("cancels a pending settlement when unmounted", async () => {
        const { component, viewport, onCommit } = mountHarness()
        beginSettlement(viewport)

        await unmount(component)
        vi.advanceTimersByTime(200)

        expect(onCommit).not.toHaveBeenCalled()
    })
})
