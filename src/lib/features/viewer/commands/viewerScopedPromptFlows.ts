import type { CommandScope } from "$lib/features/commands/commandsStore.svelte"
import {
    openViewerPagePrompt,
    openViewerSearchPrompt,
} from "$lib/features/viewer/commands/viewerPromptFlows"

export function openScopedViewerPagePrompt(scope: CommandScope): Promise<void> {
    return openViewerPagePrompt(scope)
}

export function openScopedViewerSearchPrompt(scope: CommandScope): Promise<void> {
    return openViewerSearchPrompt(scope)
}
