<script lang="ts">
    import favicon from "$lib/assets/favicon.svg"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import { onMount, setContext } from "svelte"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { type KeymapNode, useKeymap } from "$lib/keymaps"
    import * as m from "$lib/paraglide/messages"
    import KeymapHelp from "$lib/components/KeymapHelp.svelte"
    import Prompt from "$lib/components/Prompt.svelte"
    import { uiStore } from "$lib/uiStore.svelte"

    let { children } = $props()

    let currentActiveNode = $state<KeymapNode | null>(null)
    let isHelpOpen = $state(false)
    let promptValue = $state("")

    let rootNode: KeymapNode

    setContext("set_active_keymap_node", (node: KeymapNode | null) => {
        currentActiveNode = node
    })

    setContext("get_active_keymap_node", () => currentActiveNode || rootNode)

    rootNode = useKeymap([
        {
            keys: "ctrl+k",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.isPromptOpen = !uiStore.isPromptOpen
            },
            description: m.keymap_prompt(),
            allowInInputs: true,
            category: "commands",
        },
        ...settingsStore.getKeymaps(),
        {
            keys: "j",
            action: () => {
                window.scrollBy({
                    top: 150,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            category: "navigation",
        },
        {
            keys: "arrowdown",
            action: () => {
                window.scrollBy({
                    top: 150,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            category: "navigation",
        },
        {
            keys: "k",
            action: () => {
                window.scrollBy({
                    top: -150,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            category: "navigation",
        },
        {
            keys: "arrowup",
            action: () => {
                window.scrollBy({
                    top: -150,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            category: "navigation",
        },
        {
            keys: "d",
            action: () => {
                window.scrollBy({
                    top: 500,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            category: "navigation",
        },
        {
            keys: "pagedown",
            action: () => {
                window.scrollBy({
                    top: 500,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            category: "navigation",
        },
        {
            keys: "u",
            action: () => {
                window.scrollBy({
                    top: -500,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            category: "navigation",
        },
        {
            keys: "pageup",
            action: () => {
                window.scrollBy({
                    top: -500,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            category: "navigation",
        },
        {
            keys: "?",
            action: () => {
                isHelpOpen = !isHelpOpen
            },
            description: m.keymap_toggle_help(),
            category: "commands",
        },
    ])

    $effect(() => {
        settingsStore.updateDOM()
    })

    onMount(() => {
        viewerStore.initBooks()

        const handleKeydown = (event: KeyboardEvent) => {
            const activeNode = currentActiveNode || rootNode
            activeNode.handleKeydown(event)
        }
        window.addEventListener("keydown", handleKeydown)
        return () => window.removeEventListener("keydown", handleKeydown)
    })
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
    {@render children()}
    {#if isHelpOpen}
        <KeymapHelp onClose={() => (isHelpOpen = false)} />
    {/if}
    {#if uiStore.isPromptOpen}
        <Prompt bind:value={promptValue} onClose={() => (uiStore.isPromptOpen = false)} />
    {/if}
</div>

<style>
    :global(:root) {
        /* Centralized breakpoints */
        --breakpoint-mobile: 600px;
        --breakpoint-tablet: 768px;
        --breakpoint-desktop: 900px;
        --breakpoint-large-desktop: 1024px;
        --breakpoint-prompt: 640px;

        /* Theme light tokens */
        --bg-color: #f5f0e1;
        --text-color: #1a1a1a;
        --border-color: #1a1a1a;
        --shadow-color: #1a1a1a;
        --card-bg: #ffffff;
        --card-hover-bg: #faf8f5;
        --button-bg: #ffffff;
        --button-hover-bg: #faf8f5;
        --tooltip-bg: #1a1a1a;
        --tooltip-text: #f5f0e1;
        --dropdown-bg: #ffffff;
        --dropdown-hover-bg: #f5f0e1;
        --badge-bg: #ff4d4d;
        --badge-text: #ffffff;
        --link-hover-bg: rgba(0, 0, 0, 0.05);
    }

    :global(html.dark) {
        /* Theme dark tokens */
        --bg-color: #1b1715;
        --text-color: #d2c7b1;
        --border-color: #5c5146;
        --shadow-color: #100d0b;
        --card-bg: #241f1c;
        --card-hover-bg: #2e2824;
        --button-bg: #241f1c;
        --button-hover-bg: #2e2824;
        --tooltip-bg: #d2c7b1;
        --tooltip-text: #1b1715;
        --dropdown-bg: #241f1c;
        --dropdown-hover-bg: #2e2824;
        --badge-bg: #b85244;
        --badge-text: #ffffff;
        --link-hover-bg: rgba(210, 199, 177, 0.08);
    }

    :global(body) {
        margin: 0;
        padding: 0;
        background-color: var(--bg-color);
        color: var(--text-color);
        font-family: Georgia, "Times New Roman", Times, serif;
        transition:
            background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }

    .app {
        padding: 40px;
        padding-top: calc(40px + env(safe-area-inset-top));
        padding-right: calc(40px + env(safe-area-inset-right));
        padding-bottom: calc(40px + env(safe-area-inset-bottom));
        padding-left: calc(40px + env(safe-area-inset-left));
        min-height: 100dvh;
        box-sizing: border-box;
    }

    @media (max-width: 768px) {
        .app {
            padding: calc(20px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right))
                calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
        }
    }
</style>
