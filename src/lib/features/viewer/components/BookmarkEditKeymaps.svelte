<script lang="ts">
    import { commandsStore, type CommandScope } from "$lib/features/commands/commandsStore.svelte"
    import { useModalCommands } from "$lib/features/commands/useModalCommands.svelte"
    import { createViewerMutationCommands } from "$lib/features/viewer/commands/viewerMutationCommands"
    import { defineCommands } from "$lib/features/commands/commands.types"
    import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"
    import * as m from "$lib/paraglide/messages"

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
            // Use the descriptive action in keyboard help rather than a generic cancel label.
            label: () => m.cancel_bookmark_edit(),
            englishLabel: () => m.cancel_bookmark_edit({}, { locale: "en" }),
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
