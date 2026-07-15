import { describe, expect, it } from "vitest"
import { BREAKPOINTS } from "./breakpoints"
import { isCompactViewport } from "./viewport.svelte"

describe("isCompactViewport", () => {
    it("uses touch and the tablet breakpoint together", () => {
        expect(isCompactViewport(BREAKPOINTS.TABLET, true)).toBe(true)
        expect(isCompactViewport(BREAKPOINTS.TABLET + 1, true)).toBe(false)
        expect(isCompactViewport(500, false)).toBe(false)
    })

    it("recognizes phone user agents and user-agent mobile capability", () => {
        expect(isCompactViewport(1200, false, "Mozilla/5.0 (iPhone)")).toBe(true)
        expect(isCompactViewport(1200, false, "desktop", true)).toBe(true)
    })
})
