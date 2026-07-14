import { KeyboardHandler } from "$lib/features/commands/commandsStore.svelte"

export type PromptKeyAction = "close" | "next" | "previous" | "select"

const PROMPT_KEYMAP: ReadonlyArray<readonly [PromptKeyAction, string | string[]]> = [
    ["close", "escape"],
    ["next", ["arrowdown", "ctrl+n", "ctrl+j"]],
    ["previous", ["arrowup", "ctrl+p", "ctrl+k"]],
    ["select", "enter"],
]

export function resolvePromptKeyAction(event: KeyboardEvent): PromptKeyAction | null {
    for (const [action, keys] of PROMPT_KEYMAP) {
        if (KeyboardHandler.matches(event, keys)) return action
    }

    return null
}
