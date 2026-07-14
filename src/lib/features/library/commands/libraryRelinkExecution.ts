import { commandsStore } from "$lib/features/commands/commandsStore.svelte"

export async function relinkLibraryNode(
    nodeId: string,
    fileSource: File | FileSystemFileHandle,
): Promise<void> {
    await commandsStore.execute("library.node.relink", { nodeId, fileSource })
}
