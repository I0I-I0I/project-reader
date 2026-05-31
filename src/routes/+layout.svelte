<script lang="ts">
    import favicon from "$lib/assets/favicon.svg"
    import { CONSTANTS, settingsStore } from "$lib/settingsStore.svelte"
    import { onMount, setContext } from "svelte"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { type KeymapNode, useKeymap } from "$lib/keymaps.svelte"
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
            id: "open-prompt",
            keys: "ctrl+k",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.isPromptOpen = !uiStore.isPromptOpen
            },
            description: m.keymap_prompt(),
            allowInInputs: true,
            category: "commands",
        },
        {
            keys: "shift+t",
            description: m.keymap_change_theme(),
            category: "settings",
            subtitle: () =>
                `${m.theme()}: ${settingsStore.theme === "dark" ? m.dark() : settingsStore.theme === "light" ? m.light() : m.system()}`,
            action: () => {
                settingsStore.theme = settingsStore.theme === "light" ? "dark" : "light"
            },
        },
        {
            keys: "shift+a",
            description: m.keymap_toggle_animations(),
            category: "settings",
            subtitle: () =>
                `${m.animations()}: ${settingsStore.animations ? m.animations_enabled() : m.animations_disabled()}`,
            action: () => {
                settingsStore.animations = !settingsStore.animations
            },
        },
        {
            keys: "shift+l",
            description: m.keymap_toggle_layouts(),
            category: "settings",
            subtitle: () => {
                const layoutNames = {
                    single: m.single_page(),
                    split: m.split_pages(),
                    scroll: m.scroll_pages(),
                }
                return `${m.layout()}: ${layoutNames[settingsStore.layout]}`
            },
            action: () => {
                settingsStore.layout_next()
            },
        },
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
        --breakpoint-mobile: 800px;
        --breakpoint-tablet: 850px;
        --breakpoint-desktop: 900px;
        --breakpoint-large-desktop: 1024px;
        --breakpoint-prompt: 640px;

        /* Base Colors - Light Theme */
        --bg-color: #f5f0e1;
        --text-color: #1a1a1a;
        --border-color: #1a1a1a;
        --shadow-color: #1a1a1a;

        --surface-color: #ffffff;
        --surface-hover-color: #faf8f5;

        --accent-color: #00cec9;
        --accent-active-color: #ffde4d;

        --danger-color: #ff7675;
        --danger-active-color: #ff4d4d;
        --danger-text-color: #ffffff;

        --muted-bg-color: #1a1a1a;
        --muted-text-color: #f5f0e1;

        --canvas-bg-color: #fcfcfc;
        --disabled-bg-color: #eee;

        --overlay-color: rgba(250, 248, 245, 0.85);
        --faded-color: rgba(0, 0, 0, 0.05);
        --faded-text-color: #777777;
        --outline-item-border: rgba(0, 0, 0, 0.15);
    }

    :global(html.dark) {
        /* Base Colors - Dark Theme */
        --bg-color: #000000;
        --text-color: #e4e4e7;
        --border-color: #27272a;
        --shadow-color: #000000;

        --surface-color: #09090b;
        --surface-hover-color: #1c1c1e;

        --accent-color: #a78bfa;
        --accent-active-color: #8b5cf6;

        --danger-color: #f87171;
        --danger-active-color: #ef4444;
        --danger-text-color: #ffffff;

        --muted-bg-color: #e4e4e7;
        --muted-text-color: #000000;

        --canvas-bg-color: #000000;
        --disabled-bg-color: #18181b;

        --overlay-color: rgba(0, 0, 0, 0.85);
        --faded-color: rgba(228, 228, 231, 0.08);
        --faded-text-color: #a1a1aa;
        --outline-item-border: rgba(228, 228, 231, 0.15);
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

    @media (max-width: 850px) {
        .app {
            padding: calc(20px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right))
                calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
        }
    }
</style>
