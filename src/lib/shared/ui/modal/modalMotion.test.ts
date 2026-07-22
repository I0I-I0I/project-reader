import { describe, expect, it } from "vitest"
import { shouldEnableModalPresentationMotion } from "./modalMotion"

describe("draggable modal motion policy", () => {
    it("keeps movement-critical presentation motion when app animations are off", () => {
        expect(
            shouldEnableModalPresentationMotion({
                appMotionEnabled: false,
                prefersReducedMotion: false,
                movementCritical: true,
            }),
        ).toBe(true)
    })

    it("does not re-enable decorative modal motion", () => {
        expect(
            shouldEnableModalPresentationMotion({
                appMotionEnabled: false,
                prefersReducedMotion: false,
                movementCritical: false,
            }),
        ).toBe(false)
    })

    it("always respects reduced motion", () => {
        expect(
            shouldEnableModalPresentationMotion({
                appMotionEnabled: true,
                prefersReducedMotion: true,
                movementCritical: true,
            }),
        ).toBe(false)
    })
})
