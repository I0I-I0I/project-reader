import { useCommands, type CommandScope } from "$lib/features/commands/commandsStore.svelte"
import type { AnyCommandDefinition } from "$lib/features/commands/commands.types"

export function useModalCommands(
    definitions: readonly AnyCommandDefinition[],
    parent: CommandScope | null,
): CommandScope {
    return useCommands(definitions, parent, { keyboardBoundary: true })
}
