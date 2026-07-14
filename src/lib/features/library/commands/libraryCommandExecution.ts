import { commandsStore } from "$lib/features/commands/commandsStore.svelte"

/** Svelte-facing typed execution helpers for library controls. */
export async function createLibraryFolder(name: string): Promise<void> {
    await commandsStore.execute("library.folder.create", { name })
}
