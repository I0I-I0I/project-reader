<script lang="ts">
    import { useCommands } from "$lib/stores/commandsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { getContext } from "svelte"

    const getActiveNode = getContext<() => any>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useCommands(
        [
            {
                id: "exit-picking-mode-esc",
                keys: "escape",
                action: () => {
                    uiStore.isPickingMode = false
                },
                description: m.keymap_exit_selection_mode(),
                category: "commands",
            },
            {
                id: "exit-picking-mode-q",
                keys: "q",
                action: () => {
                    uiStore.isPickingMode = false
                },
                description: m.keymap_exit_selection_mode(),
                category: "commands",
            },
        ],
        activeNodeBeforeOpen,
    )
</script>
