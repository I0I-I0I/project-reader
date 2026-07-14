<script lang="ts">
    import { commandsStore, type CommandScope } from "$lib/features/commands/commandsStore.svelte"
    import { useModalCommands } from "$lib/features/commands/useModalCommands.svelte"
    import { createViewerMutationCommands } from "$lib/features/viewer/commands/viewerMutationCommands"
    import { defineCommands } from "$lib/features/commands/commands.types"
    import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"
    import * as m from "$lib/paraglide/messages"

    type BookmarkAddPayload = NonNullable<AppCommandPayloads["viewer.bookmark.add"]>

    let {
        onConfirm,
        onCancel,
        getPayload,
        scope = $bindable(),
    } = $props<{
        onConfirm: (payload: BookmarkAddPayload) => void | Promise<void>
        onCancel: () => void
        getPayload: () => BookmarkAddPayload
        scope?: CommandScope
    }>()

    const activeNodeBeforeOpen = commandsStore.activeScope

    const cancelCommand = defineCommands({
        "modal.cancel": {
            id: "modal.cancel",
            label: () => m.cancel_bookmark_add(),
            englishLabel: () => m.cancel_bookmark_add({}, { locale: "en" }),
            category: "commands",
            keymap: ["escape", "ctrl+c", "ctrl+["],
            allowInInputs: true,
            run: () => onCancel(),
        },
    })["modal.cancel"]

    const mutationCommands = createViewerMutationCommands({
        addBookmark: (payload) => onConfirm(payload ?? getPayload()),
        editBookmark: () => {},
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
                ...mutationCommands["viewer.bookmark.add"]!,
                keymap: "ctrl+enter",
                preventDefault: true,
                allowInInputs: true,
                keyboardPayload: () => getPayload(),
            },
        ],
        activeNodeBeforeOpen,
    )
</script>
