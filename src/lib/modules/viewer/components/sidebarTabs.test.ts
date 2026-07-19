import { describe, expect, it } from "vitest"
import { getAdjacentSidebarTab } from "./sidebarTabs"

describe("left sidebar tab order", () => {
    it("moves forward and backward without wrapping", () => {
        expect(getAdjacentSidebarTab("outline", "next")?.id).toBe("notes")
        expect(getAdjacentSidebarTab("notes", "next")?.id).toBe("bookmarks")
        expect(getAdjacentSidebarTab("bookmarks", "previous")?.id).toBe("notes")
        expect(getAdjacentSidebarTab("notes", "previous")?.id).toBe("outline")
        expect(getAdjacentSidebarTab("outline", "previous")).toBeUndefined()
        expect(getAdjacentSidebarTab("bookmarks", "next")).toBeUndefined()
    })

    it("keeps the destination command paired with its tab", () => {
        expect(getAdjacentSidebarTab("outline", "next")?.commandId).toBe(
            "viewer.sidebar.notes.toggle",
        )
    })
})
