import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { uiStore } from "$lib/core/stores/uiStore.svelte"
import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
import type { VFSNodes } from "$lib/core/vfs/vfsStore.types"
import { libraryCommands } from "$lib/features/library/commands/libraryCommands"
import { createLibraryCardCommands } from "$lib/features/library/commands/cardEntityCommands"
import { CommandScope, commandsStore } from "$lib/features/commands/commandsStore.svelte"
import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"

const nodes: VFSNodes = {
    folder: {
        id: "folder",
        name: "Shelf",
        type: "folder",
        parentId: null,
        childrenIds: ["book"],
        createdAt: 1,
        updatedAt: 1,
    },
    book: {
        id: "book",
        name: "Book.pdf",
        type: "file",
        parentId: "folder",
        size: 10,
        metadata: { pageNumber: 1 },
        createdAt: 1,
        updatedAt: 2,
    },
}

let previousNodes: VFSNodes
let previousRootIds: string[]
let previousFolderId: string | null

beforeEach(() => {
    previousNodes = vfsStore.nodes
    previousRootIds = vfsStore.rootIds
    previousFolderId = vfsStore.currentFolderId
    vfsStore.nodes = nodes
    vfsStore.rootIds = ["folder"]
    vfsStore.currentFolderId = null
    vfsStore.clearSelection()
    uiStore.isSelectionMode = false
})

afterEach(() => {
    promptStore.close()
    vfsStore.clearSelection()
    vfsStore.nodes = previousNodes
    vfsStore.rootIds = previousRootIds
    vfsStore.currentFolderId = previousFolderId
    uiStore.isSelectionMode = false
})

describe("library commands", () => {
    it("owns selection mutations", async () => {
        await libraryCommands["library.selection.toggle"].run({ nodeId: "book" })
        expect(uiStore.isSelectionMode).toBe(true)
        expect(vfsStore.selectedIds.has("book")).toBe(true)

        await libraryCommands["library.selection.clear"].run()
        expect(uiStore.isSelectionMode).toBe(false)
        expect(vfsStore.selectedIds.size).toBe(0)
    })

    it("opens the generic folder chooser instead of a Prompt mode", async () => {
        vfsStore.currentFolderId = "folder"
        const choosing = libraryCommands["library.folder.open"].run(undefined)
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(promptStore.snapshot?.request.id).toBe("library-folders")
        expect(promptStore.snapshot?.options.map(({ value }) => value)).toContain(null)

        promptStore.close()
        await choosing
    })

    it("dispatches a selected move target through the active command scope", async () => {
        const scope = new CommandScope()
        scope.register(libraryCommands["library.selection.move"])
        commandsStore.activate(scope)
        vfsStore.selectedIds.add("book")
        uiStore.isSelectionMode = true
        const moveNode = vi.spyOn(vfsStore, "moveNode").mockResolvedValue()

        const executing = scope.execute("library.selection.move", { nodeIds: ["book"] })
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.request.id).toBe("library-move-target")
        await promptStore.selectCurrent()
        await executing

        expect(moveNode).toHaveBeenCalledWith("book", null)
        moveNode.mockRestore()
        scope.destroy()
    })

    it("allows a card entity move while bulk selection mode is off", async () => {
        const parent = new CommandScope()
        parent.register(libraryCommands["library.node.move"])
        const child = new CommandScope(parent)
        child.registerAll(
            Object.values(
                createLibraryCardCommands({
                    getNodeId: () => "book",
                    isExecutable: () => true,
                    setMenuOpen: () => {},
                    openNode: async () => {},
                    toggleSelection: async () => {},
                    moveNode: async (payload) => {
                        await parent.execute("library.node.move", payload)
                    },
                    deleteNode: async () => {},
                    editMetadata: async () => {},
                    toggleReadState: async () => {},
                    relink: async () => {},
                }),
            ),
        )
        commandsStore.activate(child)
        expect(uiStore.isSelectionMode).toBe(false)

        const executing = child.execute("library.node.move")
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(promptStore.snapshot?.request.id).toBe("library-move-target")
        promptStore.close()
        await executing
        child.destroy()
        parent.destroy()
    })

    it("routes card deletion through confirmation and the parent entity command", async () => {
        const parent = new CommandScope()
        parent.register(libraryCommands["library.node.delete"])
        const child = new CommandScope(parent)
        child.registerAll(
            Object.values(
                createLibraryCardCommands({
                    getNodeId: () => "book",
                    isExecutable: () => true,
                    setMenuOpen: () => {},
                    openNode: async () => {},
                    toggleSelection: async () => {},
                    moveNode: async () => {},
                    deleteNode: async (payload) => {
                        await parent.execute("library.node.delete", payload)
                    },
                    editMetadata: async () => {},
                    toggleReadState: async () => {},
                    relink: async () => {},
                }),
            ),
        )
        const deleteNode = vi.spyOn(vfsStore, "deleteNode").mockResolvedValue()
        commandsStore.activate(child)

        await child.execute("library.node.delete")
        expect(uiStore.isDeleteModalOpen).toBe(true)
        expect(uiStore.nodesToDeleteIds).toEqual(["book"])
        await parent.execute("library.node.delete", { nodeId: "book", confirmed: true })
        expect(deleteNode).toHaveBeenCalledWith("book")

        deleteNode.mockRestore()
        child.destroy()
        parent.destroy()
    })

    it("opens a generic move-target chooser for selected nodes", async () => {
        vfsStore.selectedIds.add("book")
        uiStore.isSelectionMode = true
        const choosing = libraryCommands["library.selection.move"].run(undefined)
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(promptStore.snapshot?.request.id).toBe("library-move-target")
        expect(promptStore.snapshot?.options.map(({ value }) => value)).toContain(null)

        promptStore.close()
        await choosing
    })
})
