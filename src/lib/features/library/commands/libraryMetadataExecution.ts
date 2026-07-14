import { commandsStore } from "$lib/features/commands/commandsStore.svelte"

export async function updateLibraryBookMetadata(payload: {
    nodeId: string
    name: string
    author: string | null
    pageNumber: number
}): Promise<void> {
    await commandsStore.execute("library.node.edit-metadata", payload)
}
