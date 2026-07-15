import { describe, expect, it } from "vitest"
import { LibraryUIController } from "./libraryUI.svelte"

describe("LibraryUIController", () => {
    it("clears workflow state", () => {
        const state = new LibraryUIController()
        state.isSelectionMode = true
        state.isPickingMode = true
        state.isNewFolderModalOpen = true
        state.isDeleteModalOpen = true
        state.nodesToDeleteIds = ["one"]
        state.nodeToMoveId = "two"
        state.isEditMetadataModalOpen = true
        state.nodeToEditMetadataId = "three"

        state.clear()

        expect(state.isSelectionMode).toBe(false)
        expect(state.isPickingMode).toBe(false)
        expect(state.isNewFolderModalOpen).toBe(false)
        expect(state.isDeleteModalOpen).toBe(false)
        expect(state.nodesToDeleteIds).toEqual([])
        expect(state.nodeToMoveId).toBeNull()
        expect(state.isEditMetadataModalOpen).toBe(false)
        expect(state.nodeToEditMetadataId).toBeNull()
    })

    it("creates independent instances", () => {
        const first = new LibraryUIController()
        const second = new LibraryUIController()
        first.isSelectionMode = true
        first.nodesToDeleteIds = ["one"]
        expect(second.isSelectionMode).toBe(false)
        expect(second.nodesToDeleteIds).toEqual([])
    })
})
