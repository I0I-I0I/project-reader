import { describe, expect, it, vi } from "vitest"
import { createLibraryCardCommands } from "$lib/features/library/commands/cardEntityCommands"

describe("bound library card commands", () => {
    it("remain executable after card focus moves to the command palette", async () => {
        const moveNode = vi.fn().mockResolvedValue(undefined)
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => true,
            setMenuOpen: vi.fn(),
            openNode: vi.fn(),
            toggleSelection: vi.fn(),
            moveNode,
            deleteNode: vi.fn(),
            editMetadata: vi.fn(),
            toggleReadState: vi.fn(),
            relink: vi.fn(),
        })

        expect(commands["library.node.move"].disabled?.()).toBe(false)
        await commands["library.node.move"].run(undefined)
        expect(moveNode).toHaveBeenCalledWith({ nodeId: "book" })
    })

    it("preserves complete metadata and relink payloads", async () => {
        const editMetadata = vi.fn().mockResolvedValue(undefined)
        const relink = vi.fn().mockResolvedValue(undefined)
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => true,
            setMenuOpen: vi.fn(),
            openNode: vi.fn(),
            toggleSelection: vi.fn(),
            moveNode: vi.fn(),
            deleteNode: vi.fn(),
            editMetadata,
            toggleReadState: vi.fn(),
            relink,
        })
        const fileSource = new File(["pdf"], "book.pdf")

        await commands["library.node.edit-metadata"].run({
            name: "Renamed",
            author: "Author",
            pageNumber: 12,
        })
        await commands["library.node.relink"].run({ fileSource })

        expect(editMetadata).toHaveBeenCalledWith({
            nodeId: "book",
            name: "Renamed",
            author: "Author",
            pageNumber: 12,
        })
        expect(relink).toHaveBeenCalledWith({ nodeId: "book", fileSource })
    })

    it("disables all entity actions only when the card itself is unavailable", () => {
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => false,
            setMenuOpen: vi.fn(),
            openNode: vi.fn(),
            toggleSelection: vi.fn(),
            moveNode: vi.fn(),
            deleteNode: vi.fn(),
            editMetadata: vi.fn(),
            toggleReadState: vi.fn(),
            relink: vi.fn(),
        })

        expect(Object.values(commands).every((command) => command.disabled?.())).toBe(true)
    })
})
