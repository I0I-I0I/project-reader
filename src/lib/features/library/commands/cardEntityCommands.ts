import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"
import { defineCommands } from "$lib/features/commands/commands.types"
import * as m from "$lib/paraglide/messages"

type WithNodeId<T> = T & { nodeId: string }

export interface LibraryCardCommandContext {
    getNodeId: () => string | undefined
    isExecutable: () => boolean
    setMenuOpen: (open: boolean) => void
    openNode: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.card.open"]>>,
    ) => Promise<void>
    toggleSelection: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.selection.toggle"]>>,
    ) => Promise<void>
    moveNode: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.node.move"]>>,
    ) => Promise<void>
    deleteNode: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.node.delete"]>>,
    ) => Promise<void>
    editMetadata: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.node.edit-metadata"]>>,
    ) => Promise<void>
    toggleReadState: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.book.read-state.toggle"]>>,
    ) => Promise<void>
    relink: (
        payload: WithNodeId<NonNullable<AppCommandPayloads["library.node.relink"]>>,
    ) => Promise<void>
}

export function createLibraryCardCommands(context: LibraryCardCommandContext) {
    const withNodeId = <T extends { nodeId?: string }>(payload: T | undefined) => {
        const nodeId = payload?.nodeId ?? context.getNodeId()
        return nodeId ? ({ ...payload, nodeId } as T & { nodeId: string }) : undefined
    }
    const closeMenu = () => context.setMenuOpen(false)
    return defineCommands({
        "library.card.menu.toggle": {
            id: "library.card.menu.toggle",
            keymap: "e",
            label: () => m.more_options(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            run: () => context.setMenuOpen(true),
        },
        "library.selection.toggle": {
            id: "library.selection.toggle",
            keymap: "space",
            label: () => m.select(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (!merged) return
                closeMenu()
                await context.toggleSelection(merged)
            },
        },
        "library.card.open": {
            id: "library.card.open",
            keymap: "enter",
            label: () => "Open",
            category: "navigation",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (merged) await context.openNode(merged)
            },
        },
        "library.node.move": {
            id: "library.node.move",
            label: () => m.move(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (!merged) return
                closeMenu()
                await context.moveNode(merged)
            },
        },
        "library.node.delete": {
            id: "library.node.delete",
            label: () => m.delete_selected(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (!merged) return
                closeMenu()
                await context.deleteNode(merged)
            },
        },
        "library.node.edit-metadata": {
            id: "library.node.edit-metadata",
            label: () => m.edit_metadata(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (!merged) return
                closeMenu()
                await context.editMetadata(merged)
            },
        },
        "library.book.read-state.toggle": {
            id: "library.book.read-state.toggle",
            label: () => m.mark_as_read(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (!merged) return
                closeMenu()
                await context.toggleReadState(merged)
            },
        },
        "library.node.relink": {
            id: "library.node.relink",
            label: () => m.locate_file(),
            category: "commands",
            disabled: () => !context.isExecutable(),
            palette: true,
            run: async (payload) => {
                const merged = withNodeId(payload)
                if (!merged) return
                closeMenu()
                await context.relink(merged)
            },
        },
    })
}
