import { commandsStore } from "$lib/features/commands/commandsStore.svelte"

export async function toggleLibraryBookReadState(nodeId: string): Promise<void> {
    await commandsStore.execute("library.book.read-state.toggle", { nodeId })
}
