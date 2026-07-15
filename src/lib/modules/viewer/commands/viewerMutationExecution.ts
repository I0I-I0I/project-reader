import { commandsStore } from "$lib/modules/commands"
import type { AppCommandPayloads } from "$lib/modules/commands"
import type { CommandExecutionResult } from "$lib/modules/commands"

type Payload<K extends keyof AppCommandPayloads> = NonNullable<AppCommandPayloads[K]>

export function executeViewerBookmarkAdd(
    payload: Payload<"viewer.bookmark.add">,
): Promise<CommandExecutionResult> {
    return commandsStore.execute("viewer.bookmark.add", payload)
}

export function executeViewerBookmarkEdit(
    payload: Payload<"viewer.bookmark.edit">,
): Promise<CommandExecutionResult> {
    return commandsStore.execute("viewer.bookmark.edit", payload)
}

export function executeViewerBookmarkDelete(
    payload: Payload<"viewer.bookmark.delete">,
): Promise<CommandExecutionResult> {
    return commandsStore.execute("viewer.bookmark.delete", payload)
}

export function executeViewerNoteEdit(
    payload: Payload<"viewer.note.edit">,
): Promise<CommandExecutionResult> {
    return commandsStore.execute("viewer.note.edit", payload)
}

export function executeViewerNoteDelete(
    payload: Payload<"viewer.note.delete">,
): Promise<CommandExecutionResult> {
    return commandsStore.execute("viewer.note.delete", payload)
}
