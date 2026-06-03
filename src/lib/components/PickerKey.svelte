<script lang="ts">
    import { useCommands } from "$lib/stores/commandsStore.svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { getContext, onMount } from "svelte"
    import { fade, scale } from "svelte/transition"
    import { backOut } from "svelte/easing"

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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="picker-key"
    onclick={onSelect}
    transition:fade={{ duration: settingsStore.animations ? 120 : 0 }}
>
    <kbd
        transition:scale={{
            duration: settingsStore.animations ? 200 : 0,
            start: 0.7,
            easing: backOut,
        }}
    >
        {KEYS[idx]}
    </kbd>
</div>

<style>
    .picker-key {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        cursor: pointer;
        transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    kbd {
        font-family: var(--font-mono, Menlo, Monaco, Consolas, "Courier New", monospace);
        font-size: 24px;
        font-weight: 900;
        text-transform: uppercase;
        background: var(--accent-active-color);
        color: var(--text-color);
        border: 3px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--border-color);
        border-radius: 8px;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        transition:
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .picker-key:hover kbd {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0 var(--border-color);
        }
    }

    .picker-key:active kbd {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--border-color);
    }
</style>
