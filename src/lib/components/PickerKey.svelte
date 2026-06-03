<script lang="ts">
    import { useCommands } from "$lib/stores/commandsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { getContext, onMount } from "svelte"

    interface Props {
        onSelect: () => void
        idx: number
    }

    let { idx, onSelect }: Props = $props()

    const KEYS = [
        "f",
        "s",
        "l",
        "a",
        ";",
        "g",
        "h",
        "'",
        "b",
        "n",
        "c",
        "m",
        "x",
        ",",
        "v",
        ".",
        "z",
        "/",
        "y",
        "r",
        "e",
        "t",
        "w",
        "q",
        "i",
        "o",
        "p",
    ]

    onMount(() => {
        if (KEYS.length <= idx) return
        const getActiveNode = getContext<() => any>("get_active_commands_node")
        const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

        useCommands(
            [
                {
                    id: `picker-key-${idx}`,
                    keys: KEYS[idx],
                    action: () => {
                        onSelect()
                    },
                    description: "Picker key",
                    category: "commands",
                },
            ],
            activeNodeBeforeOpen,
        )
    })
</script>

<div class="picker-key">
    <span>{KEYS[idx]}</span>
</div>

<style>
    .picker-key {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(3px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #ffffff;
        font-weight: 800;
        z-index: 10;
        opacity: 0.9;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .picker-key:hover {
            background: rgba(0, 0, 0, 0.7);
            opacity: 1;
            backdrop-filter: blur(5px);
        }
    }

    .picker-key :global(span) {
        font-size: 20px;
        font-weight: 900;
        text-transform: uppercase;
        color: var(--text-color);
        pointer-events: none;
    }
</style>
