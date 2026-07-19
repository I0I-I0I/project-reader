import { describe, expect, it } from "vitest"
import {
    applyBoundResistance,
    createSettlementController,
    directionFromDelta,
    emptyHorizontalScrollState,
    isBrowserEdgeStart,
    resolveGestureMode,
    shouldCompleteGesture,
} from "./sliderGesture"

describe("slider gesture policy", () => {
    it("waits for four pixels before locking", () => {
        expect(resolveGestureMode(4, 0, emptyHorizontalScrollState())).toBe("undecided")
        expect(resolveGestureMode(5, 0, emptyHorizontalScrollState())).toBe("dragging")
    })

    it("leaves vertical and diagonal gestures native", () => {
        expect(resolveGestureMode(5, 5, emptyHorizontalScrollState())).toBe("native")
        expect(resolveGestureMode(4, 8, emptyHorizontalScrollState())).toBe("native")
    })

    it("reserves both browser edges", () => {
        expect(isBrowserEdgeStart(39, 400)).toBe(true)
        expect(isBrowserEdgeStart(361, 400)).toBe(true)
        expect(isBrowserEdgeStart(40, 400)).toBe(false)
        expect(isBrowserEdgeStart(360, 400)).toBe(false)
    })

    it("maps physical movement to semantic directions", () => {
        expect(directionFromDelta(-1)).toBe("next")
        expect(directionFromDelta(1)).toBe("previous")
    })

    it("commits fast and long-distance swipes but not short drags", () => {
        const base = { deltaY: 0, viewportWidth: 400, viewportHeight: 800 }
        expect(shouldCompleteGesture({ ...base, deltaX: 51, elapsed: 299 })).toBe(true)
        expect(shouldCompleteGesture({ ...base, deltaX: 121, elapsed: 600 })).toBe(true)
        expect(shouldCompleteGesture({ ...base, deltaX: 49, elapsed: 100 })).toBe(false)
    })

    it("rejects an excessive diagonal fast swipe", () => {
        expect(
            shouldCompleteGesture({
                deltaX: 80,
                deltaY: 101,
                elapsed: 100,
                viewportWidth: 400,
                viewportHeight: 800,
            }),
        ).toBe(false)
    })

    it("pans scrollable content until the relevant edge", () => {
        const middle = { isScrollable: true, atLeftEdge: false, atRightEdge: false }
        expect(resolveGestureMode(10, 0, middle)).toBe("native")
        expect(resolveGestureMode(-10, 0, middle)).toBe("native")
        expect(resolveGestureMode(10, 0, { ...middle, atLeftEdge: true })).toBe("dragging")
        expect(resolveGestureMode(-10, 0, { ...middle, atRightEdge: true })).toBe("dragging")
    })

    it("applies resistance at unavailable bounds", () => {
        expect(applyBoundResistance(100, false)).toBe(30)
        expect(applyBoundResistance(-100, false)).toBe(-30)
        expect(applyBoundResistance(100, true)).toBe(100)
    })

    it("cancels settlement for touch cancellation, disablement, or cleanup", () => {
        const commits: string[] = []
        let scheduled: (() => void) | undefined
        const settlement = createSettlementController((direction) => commits.push(direction), {
            schedule: (callback) => {
                scheduled = callback
                return callback
            },
            cancel: () => {
                scheduled = undefined
            },
        })

        settlement.begin("next", 150)
        settlement.cancel()
        scheduled?.()
        expect(settlement.pending).toBeNull()
        expect(commits).toEqual([])
    })

    it("owns interrupted settlement and commits at most once", () => {
        const commits: string[] = []
        const callbacks: Array<() => void> = []
        const cancelled = new Set<unknown>()
        const settlement = createSettlementController((direction) => commits.push(direction), {
            schedule: (callback) => {
                callbacks.push(callback)
                return callback
            },
            cancel: (handle) => cancelled.add(handle),
        })

        settlement.begin("next", 150)
        settlement.begin("previous", 150)
        expect(cancelled.has(callbacks[0])).toBe(true)
        callbacks[1]()
        settlement.finish()
        expect(commits).toEqual(["previous"])
    })

    it("commits immediately when motion is disabled", () => {
        const commits: string[] = []
        const settlement = createSettlementController((direction) => commits.push(direction))
        settlement.begin("next", 0)
        expect(commits).toEqual(["next"])
        expect(settlement.pending).toBeNull()
    })
})
