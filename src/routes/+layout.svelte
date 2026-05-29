<script lang="ts">
    import favicon from "$lib/assets/favicon.svg"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import { onMount, setContext } from "svelte"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { KEYMAP_CONTEXT_KEY, KeymapNode } from "$lib/keymaps"
    import * as m from "$lib/paraglide/messages"
    import KeymapHelpModal from "$lib/components/KeymapHelpModal.svelte"

    let { children } = $props()

    const rootNode = new KeymapNode(null)
    setContext(KEYMAP_CONTEXT_KEY, rootNode)

    let currentActiveNode = $state<KeymapNode | null>(null)
    let isHelpOpen = $state(false)

    setContext("set_active_keymap_node", (node: KeymapNode | null) => {
        currentActiveNode = node
    })

    setContext("get_active_keymap_node", () => currentActiveNode || rootNode)

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

    onMount(() => {
        const unregisterAll = rootNode.registerAll([
            {
                keys: "shift+t",
                action: () => {
                    settingsStore.theme = settingsStore.theme === "light" ? "dark" : "light"
                },
                description: m.keymap_change_theme(),
            },
            {
                keys: "shift+a",
                action: () => {
                    settingsStore.animations = !settingsStore.animations
                },
                description: m.keymap_toggle_animations(),
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
            },
            {
                keys: "?",
                action: () => {
                    isHelpOpen = !isHelpOpen
                },
                description: m.keymap_toggle_help(),
            },
        ])
        return () => {
            unregisterAll()
        }
    })
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
    {@render children()}
    {#if isHelpOpen}
        <KeymapHelpModal onClose={() => (isHelpOpen = false)} />
    {/if}
</div>

<style>
    :global(:root) {
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
    }

    .app {
        padding: 40px;
        min-height: 100dvh;
    }

    @media (max-width: 768px) {
        .app {
            padding: 20px 16px;
        }
    }
</style>
