import type { CommandScope } from "$lib/features/commands/commandsStore.svelte"
import { commandsStore, formatKeyString } from "$lib/features/commands/commandsStore.svelte"
import { promptStore, type PromptOption } from "$lib/features/prompt/stores/promptStore.svelte"
import * as m from "$lib/paraglide/messages"

export async function openCommandPalette(
    scope: CommandScope = commandsStore.activeScope ?? commandsStore.root,
    initialQuery = "",
): Promise<void> {
    const commands = scope.listPaletteCommands()
    type PaletteChoice = {
        id: string
        label: string
        englishLabel?: string
        description?: string
        category: (typeof commands)[number]["category"]
        keymap?: string | string[]
        execute: () => Promise<void>
    }
    const options: PromptOption<PaletteChoice>[] = commands.map((command) => {
        const keymap = Array.isArray(command.keymap)
            ? command.keymap.map(formatKeyString)
            : command.keymap
              ? formatKeyString(command.keymap)
              : undefined
        const choice: PaletteChoice = {
            id: command.id,
            label: command.label,
            englishLabel: command.englishLabel,
            description: command.subtitle,
            category: command.category,
            keymap,
            execute: async () => {
                await command.execute()
            },
        }
        return {
            ...choice,
            presentation: { kind: command.category },
            value: choice,
        }
    })

    const request = {
        id: "command-palette",
        initialQuery,
        options,
        filter: "fuzzy" as const,
        parseQuery: (query: string): PaletteChoice | undefined => {
            const pageNumber = Number(query.trim())
            if (!Number.isInteger(pageNumber) || pageNumber < 1) return undefined
            if (!scope.canExecute("viewer.page.go-to")) return undefined
            return {
                id: `viewer.page.go-to:${pageNumber}`,
                label: m.go_to_page({ page: pageNumber }),
                englishLabel: m.go_to_page({ page: pageNumber }, { locale: "en" }),
                category: "navigation",
                execute: async () => {
                    await scope.execute("viewer.page.go-to", { page: pageNumber, isJump: true })
                },
            }
        },
        onSelect: async (command: PaletteChoice) => {
            await command.execute()
        },
    }
    const closeIfCurrent = () => {
        if (promptStore.snapshot?.request === request) promptStore.close()
    }
    const stopWatchingScope = scope.onDestroy(closeIfCurrent)
    const stopWatchingCommands = commands.map((command) => command.onUnavailable(closeIfCurrent))
    try {
        await promptStore.open(request)
    } finally {
        stopWatchingScope()
        stopWatchingCommands.forEach((stop) => stop())
    }
}
