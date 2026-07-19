import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSliderState } from "./sliderState.svelte"

type TouchListener = (event: TouchEvent) => void

class FakeElement {
    private listeners = new Map<string, TouchListener>()

    constructor(private readonly tagName = "div") {}

    closest(selector: string) {
        return selector.includes(this.tagName) ? this : null
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.listeners.set(type, listener as TouchListener)
    }

    removeEventListener(type: string) {
        this.listeners.delete(type)
    }

    dispatch(type: string, x: number, y = 100, target: FakeElement = this) {
        const touch = { clientX: x, clientY: y }
        const event = {
            target,
            touches: type === "touchend" ? [] : [touch],
            changedTouches: type === "touchend" ? [touch] : [],
            cancelable: true,
            preventDefault: vi.fn(),
        } as unknown as TouchEvent
        this.listeners.get(type)?.(event)
        return event
    }
}

describe("slider touch state", () => {
    beforeEach(() => {
        vi.stubGlobal("Element", FakeElement)
        vi.stubGlobal("window", {
            innerWidth: 400,
            innerHeight: 800,
            scrollX: 0,
        })
        vi.stubGlobal("document", {
            documentElement: { clientWidth: 400, scrollLeft: 0, scrollWidth: 400 },
            body: { scrollLeft: 0, scrollWidth: 400 },
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function setup() {
        const state = createSliderState({
            enabled: () => true,
            canMove: () => true,
            onMove: vi.fn(),
            motionEnabled: () => true,
        })
        const host = new FakeElement()
        const cleanup = state.attach(host as unknown as HTMLElement)
        return { state, host, cleanup }
    }

    it("starts a horizontal swipe on a button without jumping toward the previous slide", () => {
        const { state, host, cleanup } = setup()
        const button = new FakeElement("button")

        host.dispatch("touchstart", 200, 100, button)
        host.dispatch("touchmove", 120, 100, button)

        expect(state.offsetX).toBe("-80px")
        cleanup?.()
    })

    it("keeps gestures that start in text inputs native", () => {
        const { state, host, cleanup } = setup()
        const input = new FakeElement("input")

        host.dispatch("touchstart", 200, 100, input)
        host.dispatch("touchmove", 120, 100, input)

        expect(state.offsetX).toBe("0px")
        cleanup?.()
    })
})
