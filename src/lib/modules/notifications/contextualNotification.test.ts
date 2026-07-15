import { describe, expect, it } from "vitest"
import {
    resolveContextualNotification,
    type ContextualNotificationInput,
} from "./contextualNotification"

const base: ContextualNotificationInput = {
    isViewerPage: false,
    isLibrarySelectionActive: false,
    selectedCount: 0,
    isViewerSearchActive: false,
    currentMatchIndex: 0,
    matchCount: 0,
    importCount: 0,
    selectedLabel: "SELECTED",
    matchedLabel: "MATCHED",
    importingLabel: "IMPORTING",
}

describe("resolveContextualNotification", () => {
    it("applies selection, search, import, then empty priority", () => {
        expect(
            resolveContextualNotification({
                ...base,
                isLibrarySelectionActive: true,
                selectedCount: 2,
                importCount: 3,
            }),
        ).toEqual({ line1: "2", line2: "SELECTED" })

        expect(
            resolveContextualNotification({
                ...base,
                isViewerPage: true,
                isViewerSearchActive: true,
                currentMatchIndex: 1,
                matchCount: 4,
                importCount: 3,
            }),
        ).toEqual({ line1: "2 / 4", line2: "MATCHED" })

        expect(resolveContextualNotification({ ...base, importCount: 3 })).toEqual({
            line1: "3",
            line2: "IMPORTING",
        })
        expect(resolveContextualNotification(base)).toBeNull()
    })

    it("clears route-inapplicable notifications", () => {
        expect(
            resolveContextualNotification({
                ...base,
                isViewerPage: true,
                isLibrarySelectionActive: true,
                selectedCount: 2,
                importCount: 3,
            }),
        ).toBeNull()
    })
})
