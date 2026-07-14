import { commandsStore } from "$lib/features/commands/commandsStore.svelte"

export function executeZoomIn(value?: number): Promise<unknown> {
    return commandsStore.execute(
        "settings.zoom.in",
        value === undefined ? undefined : ({ value } as never),
    )
}

export function executeZoomOut(value?: number): Promise<unknown> {
    return commandsStore.execute(
        "settings.zoom.out",
        value === undefined ? undefined : ({ value } as never),
    )
}
