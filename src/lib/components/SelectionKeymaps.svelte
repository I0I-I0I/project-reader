<script lang="ts">
    import { useCommands } from "$lib/stores/commandsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import * as m from "$lib/paraglide/messages"

    interface Props {
        currentNodes: any[]
        allSelected: boolean
        handleBulkDelete: () => Promise<void>
    }

    let { currentNodes, allSelected, handleBulkDelete }: Props = $props()

    useCommands([
        {
            id: "exit-selection-mode",
            keys: "escape",
            action: (event) => {
                event.preventDefault()
                if (uiStore.isPickingMode) {
                    uiStore.isPickingMode = false
                    return
                }
                uiStore.isSelectionMode = false
                vfsStore.clearSelection()
            },
            description: m.keymap_exit_selection_mode(),
            category: "commands",
        },
        {
            id: "exit-selection-mode-q",
            keys: "q",
            action: (event) => {
                event.preventDefault()
                if (uiStore.isPickingMode) {
                    uiStore.isPickingMode = false
                    return
                }
                uiStore.isSelectionMode = false
                vfsStore.clearSelection()
            },
            description: m.keymap_exit_selection_mode(),
            category: "commands",
        },
        {
            id: "move-selected",
            keys: "shift+m",
            action: (event) => {
                event.preventDefault()
                if (vfsStore.selectedIds.size > 0) {
                    uiStore.nodeToMoveId = null
                    uiStore.prompt.mode = "move"
                    uiStore.prompt.isOpen = true
                }
            },
            description: m.move(),
            category: "commands",
        },
        {
            id: "delete-selected-shortcut",
            keys: "shift+d",
            action: (event) => {
                event.preventDefault()
                handleBulkDelete()
            },
            description: m.delete_selected(),
            category: "commands",
        },
        {
            id: "toggle-select-all",
            keys: "shift+a",
            action: (event) => {
                event.preventDefault()
                if (allSelected) {
                    vfsStore.clearSelection()
                } else {
                    vfsStore.selectAll(currentNodes.map((n) => n.id))
                }
            },
            description: m.select_all(),
            subtitle: () => (allSelected ? m.deselect_all() : m.select_all()),
            category: "commands",
        },
    ])
</script>
