import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { BREAKPOINTS } from "./breakpoints"
import { isCompactViewport, isDockedViewport, isShortViewport } from "./viewport.svelte"

describe("viewport composition", () => {
    it("uses width alone for compact composition", () => {
        expect(isCompactViewport(BREAKPOINTS.COMPACT)).toBe(true)
        expect(isCompactViewport(BREAKPOINTS.COMPACT + 1)).toBe(false)
    })

    it("docks sidebars at the shared docked breakpoint", () => {
        expect(isDockedViewport(BREAKPOINTS.DOCKED - 1)).toBe(false)
        expect(isDockedViewport(BREAKPOINTS.DOCKED)).toBe(true)
    })

    it("tracks short height independently from width", () => {
        expect(isShortViewport(BREAKPOINTS.SHORT_HEIGHT)).toBe(true)
        expect(isShortViewport(BREAKPOINTS.SHORT_HEIGHT + 1)).toBe(false)
    })

    it("keeps CSS and TypeScript breakpoints aligned", () => {
        const css = readFileSync(new URL("../styles/custom-media.css", import.meta.url), "utf8")
        expect(css).toContain(`--phone (max-width: ${BREAKPOINTS.PHONE}px)`)
        expect(css).toContain(`--compact (max-width: ${BREAKPOINTS.COMPACT}px)`)
        expect(css).toContain(`--docked-sidebar (min-width: ${BREAKPOINTS.DOCKED}px)`)
    })
})
