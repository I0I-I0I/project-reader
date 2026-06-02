<script lang="ts">
    import { useKeymap } from "$lib/stores/keymapStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { getContext } from "svelte"

    const getActiveNode = getContext<() => any>("get_active_keymap_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useKeymap(
        [
            {
                id: "exit-picking-mode",
                keys: "escape",
                action: () => {
                    uiStore.isPickingMode = false
                },
                description: m.keymap_exit_selection_mode(),
                category: "commands",
            },
            {
                id: "exit-selection-mode-q",
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
