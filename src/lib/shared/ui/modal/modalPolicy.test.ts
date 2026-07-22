import { describe, expect, it } from "vitest"
import { shouldCloseOnBackdrop } from "./modalPolicy"

describe("modal backdrop policy", () => {
    it("dismisses ordinary blocking modals by default", () => {
        expect(shouldCloseOnBackdrop("default", undefined)).toBe(true)
    })

    it("preserves an explicit opt-out", () => {
        expect(shouldCloseOnBackdrop("default", false)).toBe(false)
    })

    it("never dismisses confirmation dialogs", () => {
        expect(shouldCloseOnBackdrop("confirmation", undefined)).toBe(false)
    })
})
