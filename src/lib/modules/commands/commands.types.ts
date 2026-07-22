import type { AppCommandPayloads, CommandId } from "./appCommandPayloads"

export type CommandCategory =
    | "commands"
    | "settings"
    | "navigation"
    | "menu"
    | "books"
    | "bookmarks"

export type CommandExecutionResult =
    | { status: "executed"; id: CommandId }
    | { status: "unavailable"; id: CommandId }
    | { status: "disabled"; id: CommandId }

export type CommandDefinition<K extends CommandId = CommandId> = {
    id: K
    label: () => string
    englishLabel?: () => string
    category: CommandCategory
    keymap?: string | string[]
    subtitle?: () => string
    disabled?: () => boolean
    allowInInputs?: boolean
    dismissFocusedElement?: boolean
    preventDefault?: boolean
    palette?: boolean | (() => boolean)
    shouldHandleKey?: (event: KeyboardEvent) => boolean
    keyboardPayload?: (event: KeyboardEvent) => AppCommandPayloads[K]
    run: (payload: AppCommandPayloads[K]) => void | Promise<void>
}

export type AnyCommandDefinition = {
    [K in CommandId]: CommandDefinition<K>
}[CommandId]

export type CommandDefinitions = Partial<{
    [K in CommandId]: CommandDefinition<K>
}>

export interface ActiveCommand<K extends CommandId = CommandId> {
    readonly id: K
    readonly label: string
    readonly englishLabel?: string
    readonly category: CommandCategory
    readonly keymap?: string | string[]
    readonly subtitle?: string
    readonly onUnavailable: (callback: () => void) => () => void
    readonly execute: (
        ...args: AppCommandPayloads[K] extends undefined
            ? []
            : undefined extends AppCommandPayloads[K]
              ? [payload?: Exclude<AppCommandPayloads[K], undefined>]
              : [payload: AppCommandPayloads[K]]
    ) => Promise<CommandExecutionResult>
}

export function defineCommands<const T extends CommandDefinitions>(definitions: T): T {
    for (const [id, definition] of Object.entries(definitions)) {
        if (!definition || definition.id !== id) {
            throw new Error(`Command definition key and id must match: ${id}`)
        }
        if (!definition.label().trim()) {
            throw new Error(`Command ${id} must have a non-empty label`)
        }
    }
    return definitions
}
