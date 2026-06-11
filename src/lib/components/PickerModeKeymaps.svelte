<script lang="ts">
    import { useCommands, type Command, type CommandNode } from "$lib/stores/commandsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { getContext, untrack } from "svelte"
    import { SvelteSet } from "svelte/reactivity"
    import type { VFSNode } from "$lib/stores/vfsStore.types"

    interface Props {
        currentNodes: VFSNode[]
        currentHints: string[]
        keyBuffer: string
        onSelect: (node: VFSNode) => void
    }

    let { currentNodes, currentHints, keyBuffer = $bindable(), onSelect }: Props = $props()

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    const baseCommands: Command[] = [
        {
            id: "close-or-back",
            keys: ["escape", "ctrl+c", "ctrl+["],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                keyBuffer = ""
                uiStore.isPickingMode = false
            },
            description: m.keymap_exit_selection_mode(),
            allowInInputs: true,
            category: "commands" as const,
        },
        {
            id: "close-alt",
            keys: "q",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                keyBuffer = ""
                uiStore.isPickingMode = false
            },
            description: m.keymap_exit_selection_mode(),
            allowInInputs: false,
            category: "commands" as const,
        },
        {
            id: "backspace",
            keys: ["backspace", "ctrl+h"],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                if (keyBuffer.length > 0) {
                    keyBuffer = keyBuffer.slice(0, -1)
                }
            },
            description: "Go back one character in picker hint",
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
        // Track currentNodes, currentHints, and keyBuffer changes
        const nodes = currentNodes
        const hints = currentHints
        const buffer = keyBuffer

        return untrack(() => {
            const dynamicCommands: Command[] = []

            // 1. Find all valid next characters and matching nodes
            const nextChars = new SvelteSet<string>()
            const matchingNodesWithHint: Array<{ node: VFSNode; hint: string }> = []

            for (let i = 0; i < nodes.length; i++) {
                const hint = hints[i]
                if (hint && hint.startsWith(buffer)) {
                    matchingNodesWithHint.push({ node: nodes[i], hint })
                    const nextChar = hint[buffer.length]
                    if (nextChar) {
                        nextChars.add(nextChar)
                    }
                }
            }

            // 2. Register a command for each valid next character
            for (const char of nextChars) {
                dynamicCommands.push({
                    id: `picker-char-${char}`,
                    keys: char,
                    action: (event: KeyboardEvent) => {
                        event.preventDefault()
                        const nextBuffer = buffer + char
                        // Check if this matches any node's hint perfectly
                        const match = matchingNodesWithHint.find((m) => m.hint === nextBuffer)
                        if (match) {
                            onSelect(match.node)
                            keyBuffer = ""
                        } else {
                            keyBuffer = nextBuffer
                        }
                    },
                    description: `Type '${char}' for hint selection`,
                    category: "commands" as const,
                })
            }

            const unregister = node.registerAll(dynamicCommands)
            return () => unregister()
        })
    })
</script>
