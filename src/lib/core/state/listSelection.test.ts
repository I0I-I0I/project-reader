import { describe, expect, it } from "vitest"
import { findNearestPageIndex, resolveSelectionIndex } from "./listSelection"

describe("list selection", () => {
    it("uses desktop and mobile defaults without writable mirrored state", () => {
        expect(resolveSelectionIndex(null, 3, 0)).toBe(0)
        expect(resolveSelectionIndex(null, 3, -1)).toBe(-1)
        expect(resolveSelectionIndex(null, 0, 0)).toBe(-1)
    })

    it("preserves a valid manual selection and replaces an invalid one", () => {
        expect(resolveSelectionIndex(2, 4, 0)).toBe(2)
        expect(resolveSelectionIndex(2, 2, 0)).toBe(0)
    })

    it("recomputes the nearest default when asynchronous results are replaced", () => {
        expect(findNearestPageIndex([], 10)).toBe(-1)
        expect(findNearestPageIndex([{ pageNumber: 3 }, { pageNumber: 14 }], 10)).toBe(1)
        expect(
            findNearestPageIndex([{ pageNumber: 9 }, { pageNumber: 30 }, { pageNumber: 11 }], 10),
        ).toBe(0)
    })
})
