<script lang="ts">
    import { useCommands, type Command, type CommandNode } from "$lib/stores/commandsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { getContext, untrack } from "svelte"
    import { PICKER_KEYS } from "$lib/constants"
    import type { VFSNode } from "$lib/stores/vfsStore.types"

    interface Props {
        currentNodes: VFSNode[]
        onSelect: (node: VFSNode) => void
    }

    let { currentNodes, onSelect }: Props = $props()

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    const baseCommands: Command[] = [
        {
            id: "exit-picking-mode-esc",
            keys: "escape",
            action: () => {
                uiStore.isPickingMode = false
            },
            description: m.keymap_exit_selection_mode(),
            category: "commands" as const,
        },
        {
            id: "exit-picking-mode-q",
            keys: "q",
            action: () => {
                uiStore.isPickingMode = false
            },
            description: m.keymap_exit_selection_mode(),
            category: "commands" as const,
        },
    ]

    const node = useCommands(baseCommands, activeNodeBeforeOpen)

    $effect(() => {
        uiStore.pickerCommandsNode = node
        return () => {
            if (uiStore.pickerCommandsNode === node) {
                uiStore.pickerCommandsNode = null
            }
        }
    })

    $effect(() => {
        // Track currentNodes changes
        const nodes = currentNodes

        return untrack(() => {
            const dynamicCommands: Command[] = []
            const totalNodes = nodes.length

            for (let i = 0; i < Math.min(totalNodes, PICKER_KEYS.length); i++) {
                const vfsNode = nodes[i]
                dynamicCommands.push({
                    id: `picker-key-${i}`,
                    keys: PICKER_KEYS[i],
                    action: (event: KeyboardEvent) => {
                        event.preventDefault()
                        onSelect(vfsNode)
                    },
                    description: `Select ${vfsNode.name}`,
                    category: "commands" as const,
                })
            }

            const unregister = node.registerAll(dynamicCommands)
            return () => unregister()
        })
    })
</script>
