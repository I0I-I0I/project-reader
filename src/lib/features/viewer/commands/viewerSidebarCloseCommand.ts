import { defineCommands, type AnyCommandDefinition } from "$lib/features/commands/commands.types"

interface ViewerSidebarCloseCommandOptions {
    label: () => string
    disabled: () => boolean
    shouldHandleKey: (event: KeyboardEvent) => boolean
    close: () => void
}

export function createViewerSidebarCloseCommand(
    options: ViewerSidebarCloseCommandOptions,
): AnyCommandDefinition {
    return defineCommands({
        "viewer.sidebar.close": {
            id: "viewer.sidebar.close",
            keymap: ["escape", "q", "ctrl+c", "ctrl+["],
            label: options.label,
            category: "navigation",
            allowInInputs: true,
            disabled: options.disabled,
            shouldHandleKey: options.shouldHandleKey,
            run: options.close,
        },
    })["viewer.sidebar.close"]!
}
