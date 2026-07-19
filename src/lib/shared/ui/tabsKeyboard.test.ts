import { describe, expect, it } from "vitest"
import { getNextTabIndex } from "./tabsKeyboard"

describe("getNextTabIndex", () => {
    const enabled = [0, 1, 3]

    it("wraps ArrowRight and ArrowLeft", () => {
        expect(getNextTabIndex(3, "ArrowRight", enabled)).toBe(0)
        expect(getNextTabIndex(0, "ArrowLeft", enabled)).toBe(3)
    })

    it("supports Home and End", () => {
        expect(getNextTabIndex(1, "Home", enabled)).toBe(0)
        expect(getNextTabIndex(1, "End", enabled)).toBe(3)
    })

    it("skips disabled indices and handles an empty tablist", () => {
        expect(getNextTabIndex(1, "ArrowRight", enabled)).toBe(3)
        expect(getNextTabIndex(0, "Home", [])).toBe(-1)
    })
})
