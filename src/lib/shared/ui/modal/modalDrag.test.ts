import { describe, expect, it } from "vitest"
import {
    MODAL_DRAG_THRESHOLD,
    canDragModal,
    clampModalPosition,
    exceededDragThreshold,
    isDragPointerAllowed,
} from "./modalDrag"

describe("modal dragging", () => {
    it("requires real movement before becoming modeless", () => {
        expect(exceededDragThreshold(MODAL_DRAG_THRESHOLD - 1, 0)).toBe(false)
        expect(exceededDragThreshold(MODAL_DRAG_THRESHOLD, 0)).toBe(true)
    })

    it("only enables desktop dialog dragging", () => {
        const base = {
            requested: true,
            showHeader: true,
            isCompact: false,
            presentation: "dialog" as const,
        }
        expect(canDragModal(base)).toBe(true)
        expect(canDragModal({ ...base, isCompact: true })).toBe(false)
        expect(canDragModal({ ...base, presentation: "sheet" })).toBe(false)
        expect(canDragModal({ ...base, presentation: "fullscreen" })).toBe(false)
        expect(canDragModal({ ...base, requested: false })).toBe(false)
        expect(canDragModal({ ...base, showHeader: false })).toBe(false)
    })

    it("never starts dragging from touch input", () => {
        expect(isDragPointerAllowed("mouse")).toBe(true)
        expect(isDragPointerAllowed("pen")).toBe(true)
        expect(isDragPointerAllowed("touch")).toBe(false)
    })

    it("keeps a recoverable part of the header in the viewport", () => {
        const viewport = { left: 10, top: 20, width: 800, height: 600 }
        const surface = { width: 400, height: 300 }
        expect(clampModalPosition({ x: -1000, y: -1000 }, surface, viewport)).toEqual({
            x: -318,
            y: 20,
        })
        expect(clampModalPosition({ x: 2000, y: 2000 }, surface, viewport)).toEqual({
            x: 738,
            y: 580,
        })
    })
})
