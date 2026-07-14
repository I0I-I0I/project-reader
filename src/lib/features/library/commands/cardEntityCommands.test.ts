import { describe, expect, it, vi } from "vitest"
import { createLibraryCardCommands } from "$lib/features/library/commands/cardEntityCommands"
import * as m from "$lib/paraglide/messages"

describe("bound library card commands", () => {
    it("gives every palette command a non-empty English alias", () => {
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => true,
            isSelected: () => false,
            isRead: () => false,
            canToggleReadState: () => true,
            setMenuOpen: vi.fn(),
            openNode: vi.fn(),
            toggleSelection: vi.fn(),
            moveNode: vi.fn(),
            deleteNode: vi.fn(),
            editMetadata: vi.fn(),
            toggleReadState: vi.fn(),
            relink: vi.fn(),
        })

        for (const command of Object.values(commands)) {
            expect(command.englishLabel?.().trim(), command.id).toBeTruthy()
        }
    })

    it("remain executable after card focus moves to the command palette", async () => {
        const moveNode = vi.fn().mockResolvedValue(undefined)
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => true,
            isSelected: () => false,
            isRead: () => false,
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
            isSelected: () => false,
            isRead: () => false,
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

    it("describes selection and read-state toggles using their current actions", async () => {
        let selected = false
        let read = false
        const toggleReadState = vi.fn().mockResolvedValue(undefined)
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => true,
            isSelected: () => selected,
            isRead: () => read,
            setMenuOpen: vi.fn(),
            openNode: vi.fn(),
            toggleSelection: vi.fn(),
            moveNode: vi.fn(),
            deleteNode: vi.fn(),
            editMetadata: vi.fn(),
            toggleReadState,
            relink: vi.fn(),
        })

        expect(commands["library.selection.toggle"].label()).toBe(m.select())
        expect(commands["library.selection.toggle"].englishLabel?.()).toBe(
            m.select({}, { locale: "en" }),
        )
        expect(commands["library.book.read-state.toggle"].label()).toBe(m.mark_as_read())
        await commands["library.book.read-state.toggle"].run(undefined)
        expect(toggleReadState).toHaveBeenLastCalledWith({ nodeId: "book", markAsRead: true })

        selected = true
        read = true
        expect(commands["library.selection.toggle"].label()).toBe(m.deselect())
        expect(commands["library.selection.toggle"].englishLabel?.()).toBe(
            m.deselect({}, { locale: "en" }),
        )
        expect(commands["library.book.read-state.toggle"].label()).toBe(m.mark_as_unread())
        expect(commands["library.book.read-state.toggle"].englishLabel?.()).toBe(
            m.mark_as_unread({}, { locale: "en" }),
        )
        await commands["library.book.read-state.toggle"].run(undefined)
        expect(toggleReadState).toHaveBeenLastCalledWith({ nodeId: "book", markAsRead: false })
    })

    it("disables read-state changes for folders", () => {
        const commands = createLibraryCardCommands({
            getNodeId: () => "folder",
            isExecutable: () => true,
            isSelected: () => false,
            isRead: () => false,
            canToggleReadState: () => false,
            setMenuOpen: vi.fn(),
            openNode: vi.fn(),
            toggleSelection: vi.fn(),
            moveNode: vi.fn(),
            deleteNode: vi.fn(),
            editMetadata: vi.fn(),
            toggleReadState: vi.fn(),
            relink: vi.fn(),
        })

        expect(commands["library.book.read-state.toggle"].disabled?.()).toBe(true)
        expect(commands["library.card.open"].disabled?.()).toBe(false)
    })

    it("disables all entity actions only when the card itself is unavailable", () => {
        const commands = createLibraryCardCommands({
            getNodeId: () => "book",
            isExecutable: () => false,
            isSelected: () => false,
            isRead: () => false,
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
