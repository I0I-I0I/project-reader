import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { BREAKPOINTS } from "./breakpoints"
import {
    isCompactViewport,
    isDockedViewport,
    isPhoneLandscapeViewport,
    isShortViewport,
} from "./viewport.svelte"

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

    it("recognizes coarse-pointer phones in landscape", () => {
        expect(isPhoneLandscapeViewport(932, 430, true)).toBe(true)
        expect(isPhoneLandscapeViewport(932, 430, false)).toBe(false)
        expect(isPhoneLandscapeViewport(430, 932, true)).toBe(false)
        expect(isPhoneLandscapeViewport(1024, BREAKPOINTS.PHONE + 1, true)).toBe(false)
    })

    it("keeps CSS and TypeScript breakpoints aligned", () => {
        const css = readFileSync(new URL("../styles/custom-media.css", import.meta.url), "utf8")
        expect(css).toContain(`--phone (max-width: ${BREAKPOINTS.PHONE}px)`)
        expect(css).toContain(`--compact (max-width: ${BREAKPOINTS.COMPACT}px)`)
        expect(css).toContain(
            `(pointer: coarse) and (orientation: landscape) and (max-height: ${BREAKPOINTS.PHONE}px)`,
        )
        expect(css).toContain(`--docked-sidebar (min-width: ${BREAKPOINTS.DOCKED}px)`)
    })
})
