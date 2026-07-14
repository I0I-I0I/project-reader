import { useCommands } from "$lib/features/commands/commandsStore.svelte"
import {
    createLibraryCardCommands,
    type LibraryCardCommandContext,
} from "$lib/features/library/commands/cardEntityCommands"

export function useLibraryCardCommands(context: LibraryCardCommandContext) {
    return useCommands(Object.values(createLibraryCardCommands(context)), undefined, {
        autoActivate: false,
    })
}
