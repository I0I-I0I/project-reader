import { defineCommands, type AnyCommandDefinition } from "$lib/features/commands/commands.types"

interface ViewerOutlineCommandOptions {
    nextLabel: () => string
    previousLabel: () => string
    selectLabel: () => string
    searchLabel: () => string
    disabled: () => boolean
    shouldHandleNavigationKey: (event: KeyboardEvent) => boolean
    next: () => void
    previous: () => void
    select: () => void
    search: () => void
}

export function createViewerOutlineCommands(
    options: ViewerOutlineCommandOptions,
): AnyCommandDefinition[] {
    return Object.values(
        defineCommands({
            "viewer.outline.next": {
                id: "viewer.outline.next",
                keymap: ["j", "arrowdown", "ctrl+n", "ctrl+j"],
                label: options.nextLabel,
                category: "navigation",
                palette: false,
                allowInInputs: true,
                disabled: options.disabled,
                shouldHandleKey: options.shouldHandleNavigationKey,
                run: options.next,
            },
            "viewer.outline.previous": {
                id: "viewer.outline.previous",
                keymap: ["k", "arrowup", "ctrl+p", "ctrl+k"],
                label: options.previousLabel,
                category: "navigation",
                palette: false,
                allowInInputs: true,
                disabled: options.disabled,
                shouldHandleKey: options.shouldHandleNavigationKey,
                run: options.previous,
            },
            "viewer.outline.select": {
                id: "viewer.outline.select",
                keymap: "enter",
                label: options.selectLabel,
                category: "navigation",
                palette: false,
                disabled: options.disabled,
                run: options.select,
            },
            "viewer.outline.search": {
                id: "viewer.outline.search",
                keymap: "/",
                label: options.searchLabel,
                category: "commands",
                palette: false,
                disabled: options.disabled,
                run: options.search,
            },
        }),
    ).filter(Boolean) as AnyCommandDefinition[]
}
