import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSliderState } from "./sliderState.svelte"

type TouchListener = (event: TouchEvent) => void
type Point = { x: number; y?: number }

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

    dispatch(
        type: string,
        points: Point[],
        changedPoints: Point[] = type === "touchend" ? points : [],
        target: FakeElement = this,
    ) {
        const toTouch = ({ x, y = 100 }: Point) => ({ clientX: x, clientY: y })
        const event = {
            target,
            touches: type === "touchend" ? [] : points.map(toTouch),
            changedTouches: changedPoints.map(toTouch),
            cancelable: true,
            preventDefault: vi.fn(),
        } as unknown as TouchEvent
        this.listeners.get(type)?.(event)
        return event
    }
}

describe("slider touch state", () => {
    beforeEach(() => {
        vi.useFakeTimers()
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
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    function setup({ motion = true }: { motion?: boolean } = {}) {
        let enabled = true
        let destination = "page-2"
        const commits: string[] = []
        const resolver = vi.fn(() => {
            const captured = destination
            return () => commits.push(captured)
        })
        const state = createSliderState({
            enabled: () => enabled,
            resolveMove: resolver,
            motionEnabled: () => motion,
        })
        const host = new FakeElement()
        const cleanup = state.attach(host as unknown as HTMLElement)
        return {
            state,
            host,
            cleanup,
            commits,
            resolver,
            setEnabled(value: boolean) {
                enabled = value
            },
            setDestination(value: string) {
                destination = value
            },
        }
    }

    function startAndDrag(host: FakeElement, endX = 120, endY = 100) {
        host.dispatch("touchstart", [{ x: 200, y: 100 }])
        host.dispatch("touchmove", [{ x: endX, y: endY }])
    }

    it("starts a horizontal swipe on a button without jumping toward the previous slide", () => {
        const { state, host, cleanup } = setup()
        const button = new FakeElement("button")

        host.dispatch("touchstart", [{ x: 200 }], [], button)
        host.dispatch("touchmove", [{ x: 120 }], [], button)

        expect(state.offsetX).toBe("-80px")
        cleanup?.()
    })

    it("keeps gestures that start in text inputs native", () => {
        const { state, host, cleanup } = setup()
        const input = new FakeElement("input")

        host.dispatch("touchstart", [{ x: 200 }], [], input)
        host.dispatch("touchmove", [{ x: 120 }], [], input)

        expect(state.offsetX).toBe("0px")
        cleanup?.()
    })

    it("captures the exact operation resolved at release and commits once", () => {
        const { host, commits, setDestination, cleanup } = setup()
        startAndDrag(host)
        host.dispatch("touchend", [{ x: 120 }], [{ x: 120 }])
        setDestination("page-3")

        vi.advanceTimersByTime(150)
        vi.runAllTimers()

        expect(commits).toEqual(["page-2"])
        cleanup?.()
    })

    it("does not let a remaining finger resume after multi-touch cancellation", () => {
        const { host, commits, cleanup } = setup()
        startAndDrag(host)
        host.dispatch("touchmove", [{ x: 120 }, { x: 240 }])
        host.dispatch("touchmove", [{ x: 60 }])
        host.dispatch("touchend", [{ x: 60 }], [{ x: 60 }])
        vi.runAllTimers()

        expect(commits).toEqual([])
        cleanup?.()
    })

    it("ignores touch end without a valid active session", () => {
        const { host, commits, cleanup } = setup()
        host.dispatch("touchend", [{ x: 20 }], [{ x: 20 }])
        vi.runAllTimers()
        expect(commits).toEqual([])
        cleanup?.()
    })

    it("cancels pending settlement on touch cancellation, disablement, and detach", () => {
        const touchCancelled = setup()
        startAndDrag(touchCancelled.host)
        touchCancelled.host.dispatch("touchend", [{ x: 120 }], [{ x: 120 }])
        touchCancelled.host.dispatch("touchcancel", [])

        const disabled = setup()
        startAndDrag(disabled.host)
        disabled.host.dispatch("touchend", [{ x: 120 }], [{ x: 120 }])
        disabled.setEnabled(false)
        disabled.state.cancel()

        const detached = setup()
        startAndDrag(detached.host)
        detached.host.dispatch("touchend", [{ x: 120 }], [{ x: 120 }])
        detached.cleanup?.()

        vi.runAllTimers()
        expect(touchCancelled.commits).toEqual([])
        expect(disabled.commits).toEqual([])
        expect(detached.commits).toEqual([])
        touchCancelled.cleanup?.()
        disabled.cleanup?.()
    })

    it("commits synchronously without a transition when motion is reduced", () => {
        const { state, host, commits, cleanup } = setup({ motion: false })
        startAndDrag(host)
        host.dispatch("touchend", [{ x: 120 }], [{ x: 120 }])

        expect(commits).toEqual(["page-2"])
        expect(state.settling).toBe(false)
        expect(state.transition).toBe("none")
        cleanup?.()
    })

    it("snaps back when a long drag ends with excessive vertical drift", () => {
        const { state, host, commits, cleanup } = setup()
        startAndDrag(host, 60, 220)
        host.dispatch("touchend", [{ x: 60, y: 220 }], [{ x: 60, y: 220 }])
        vi.runAllTimers()

        expect(commits).toEqual([])
        expect(state.offsetX).toBe("0px")
        cleanup?.()
    })
})
