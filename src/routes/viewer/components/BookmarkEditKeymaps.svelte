<script lang="ts">
    import { useCommands, type CommandNode } from "$lib/stores/commandsStore.svelte"
    import { getContext } from "svelte"

    let { onConfirm, onCancel } = $props<{
        onConfirm: () => void
        onCancel: () => void
    }>()

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useCommands(
        [
            {
                id: "cancel-bookmark-edit",
                keys: ["escape", "ctrl+c", "ctrl+["],
                description: "Cancel Bookmark Edit",
                action: (event: KeyboardEvent) => {
                    event.preventDefault()
                    onCancel()
                },
                allowInInputs: true,
            },
            {
                id: "save-bookmark-edit",
                keys: ["ctrl+enter"],
                description: "Save Bookmark Edit",
                action: (event: KeyboardEvent) => {
                    event.preventDefault()
                    onConfirm()
                },
                allowInInputs: true,
            },
        ],
        activeNodeBeforeOpen,
    )
</script>
