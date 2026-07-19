import { describe, expect, it } from "vitest"
import { resolveModalPresentation } from "./modalPresentation"

const base = {
    isCompact: true,
    mobilePresentation: "auto" as const,
    type: "float" as const,
    size: "medium" as const,
    state: "blocking" as const,
}

describe("modal presentation", () => {
    it("uses sheets for ordinary blocking modals in compact viewports", () => {
        expect(resolveModalPresentation(base)).toBe("sheet")
        expect(resolveModalPresentation({ ...base, size: "small", type: "layout" })).toBe("sheet")
    })

    it("uses fullscreen for large layouts and explicit fullscreen sizes", () => {
        expect(resolveModalPresentation({ ...base, type: "layout", size: "large" })).toBe(
            "fullscreen",
        )
        expect(resolveModalPresentation({ ...base, size: "fullscreen" })).toBe("fullscreen")
    })

    it.each(["dialog", "sheet", "fullscreen"] as const)(
        "honors the compact %s override",
        (mobilePresentation) => {
            expect(resolveModalPresentation({ ...base, mobilePresentation })).toBe(
                mobilePresentation,
            )
        },
    )

    it("preserves desktop and already-modeless windows as dialogs", () => {
        expect(resolveModalPresentation({ ...base, isCompact: false })).toBe("dialog")
        expect(
            resolveModalPresentation({
                ...base,
                mobilePresentation: "sheet",
                state: "modeless",
            }),
        ).toBe("dialog")
    })

    it("retains explicit fullscreen geometry above the compact breakpoint", () => {
        expect(resolveModalPresentation({ ...base, isCompact: false, size: "fullscreen" })).toBe(
            "fullscreen",
        )
    })
})
