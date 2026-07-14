<script lang="ts">
    import { commandsStore, type CommandScope } from "$lib/features/commands/commandsStore.svelte"
    import { useModalCommands } from "$lib/features/commands/useModalCommands.svelte"
    import { createViewerMutationCommands } from "$lib/features/viewer/commands/viewerMutationCommands"
    import { defineCommands } from "$lib/features/commands/commands.types"
    import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"

    type BookmarkEditPayload = NonNullable<AppCommandPayloads["viewer.bookmark.edit"]>

    let {
        onConfirm,
        onCancel,
        getPayload,
        scope = $bindable(),
    } = $props<{
        onConfirm: (payload: BookmarkEditPayload) => void | Promise<void>
        onCancel: () => void
        getPayload: () => BookmarkEditPayload
        scope?: CommandScope
    }>()

    const activeNodeBeforeOpen = commandsStore.activeScope

    const cancelCommand = defineCommands({
        "modal.cancel": {
            id: "modal.cancel",
            label: () => "Cancel bookmark edit",
            category: "commands",
            keymap: ["escape", "ctrl+c", "ctrl+["],
            allowInInputs: true,
            run: () => onCancel(),
        },
    })["modal.cancel"]

    const mutationCommands = createViewerMutationCommands({
        addBookmark: () => {},
        editBookmark: (payload) => onConfirm(payload ?? getPayload()),
        deleteBookmark: () => {},
        addNote: () => {},
        editNote: () => {},
        saveNote: () => {},
        deleteNote: () => {},
    })

    scope = useModalCommands(
        [
            cancelCommand,
            {
                ...mutationCommands["viewer.bookmark.edit"]!,
                keymap: "ctrl+enter",
                preventDefault: true,
                allowInInputs: true,
                keyboardPayload: () => getPayload(),
            },
        ],
        activeNodeBeforeOpen,
    )
</script>
