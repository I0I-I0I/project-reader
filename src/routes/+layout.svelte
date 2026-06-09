<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { onMount, setContext, untrack } from "svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"
    import {
        type CommandNode,
        useCommands,
        commandDispatcher,
    } from "$lib/stores/commandsStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import KeymapHelp from "$lib/components/KeymapHelp.svelte"
    import Prompt from "$lib/components/Prompt.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import {
        type PromptNode,
        usePrompt,
        type SearchItem,
        type PromptProvider,
    } from "$lib/stores/promptStore.svelte"
    import { getLocale } from "$lib/paraglide/runtime"
    import { getLanguageName } from "$lib/locale"
    import { page, updated } from "$app/state"
    import {
        getFoldersPromptItems,
        getMovePromptItems,
        getThemePromptItems,
        getLayoutPromptItems,
        getLanguagePromptItems,
        getFilesPromptItems,
        getCommandsPromptItems,
    } from "$lib/stores/promptProviders.svelte"

    let { children } = $props()

    let currentActiveNode = $state.raw<CommandNode | null>(null)
    let currentActivePromptNode = $state.raw<PromptNode | null>(null)
    let isHelpOpen = $state(false)

    let rootNode: CommandNode
    let rootPromptNode: PromptNode

    setContext("set_active_commands_node", (node: CommandNode | null) => {
        currentActiveNode = node
        commandDispatcher.activeRegistry = node || rootNode
    })

    setContext("get_active_commands_node", () => commandDispatcher.activeRegistry || rootNode)

    setContext("set_active_prompt_node", (node: PromptNode | null) => {
        currentActivePromptNode = node
    })

    setContext("get_active_prompt_node", () => currentActivePromptNode || rootPromptNode)

    rootNode = useCommands([
        {
            id: "open-prompt",
            keys: "ctrl+k",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "global"
                uiStore.prompt.isOpen = !uiStore.prompt.isOpen
            },
            description: m.keymap_prompt(),
            englishDescription: m.keymap_prompt({}, { locale: "en" }),
            allowInInputs: true,
            category: "commands",
        },
        {
            id: "open-file",
            keys: "shift+o",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "files"
                uiStore.prompt.isOpen = true
            },
            description: m.keymap_open_book(),
            englishDescription: m.keymap_open_book({}, { locale: "en" }),
            category: "menu",
        },
        {
            keys: "shift+t",
            description: m.keymap_change_theme(),
            englishDescription: m.keymap_change_theme({}, { locale: "en" }),
            category: "settings",
            subtitle: () =>
                `${m.theme()}: ${settingsStore.theme === "dark" ? m.dark() : settingsStore.theme === "light" ? m.light() : m.system()}`,
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "theme"
                uiStore.prompt.isOpen = true
            },
        },
        {
            description: m.keymap_toggle_animations(),
            englishDescription: m.keymap_toggle_animations({}, { locale: "en" }),
            category: "settings",
            subtitle: () =>
                `${m.animations()}: ${settingsStore.animations ? m.animations_enabled() : m.animations_disabled()}`,
            action: () => {
                settingsStore.animations = !settingsStore.animations
            },
        },
        {
            description: m.keymap_change_language(),
            englishDescription: m.keymap_change_language({}, { locale: "en" }),
            category: "settings",
            subtitle: () => `${getLanguageName(getLocale())}`,
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "language"
                uiStore.prompt.isOpen = true
            },
        },
        {
            id: "scroll-down",
            keys: "j",
            action: () => {
                window.scrollBy({
                    top: window.innerHeight * 0.2,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-down-alt",
            keys: "arrowdown",
            action: () => {
                window.scrollBy({
                    top: window.innerHeight * 0.2,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-up",
            keys: "k",
            action: () => {
                window.scrollBy({
                    top: -window.innerHeight * 0.2,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-up-alt",
            keys: "arrowup",
            action: () => {
                window.scrollBy({
                    top: -window.innerHeight * 0.2,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-page-down",
            keys: "d",
            action: () => {
                window.scrollBy({
                    top: window.innerHeight * 0.6,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-page-down-alt",
            keys: "pagedown",
            action: () => {
                window.scrollBy({
                    top: window.innerHeight * 0.6,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-page-up",
            keys: "u",
            action: () => {
                window.scrollBy({
                    top: -window.innerHeight * 0.6,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-page-up-alt",
            keys: "pageup",
            action: () => {
                window.scrollBy({
                    top: -window.innerHeight * 0.6,
                    behavior: settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
        },
        {
            keys: "?",
            action: () => {
                isHelpOpen = !isHelpOpen
            },
            description: m.keymap_toggle_help(),
            englishDescription: m.keymap_toggle_help({}, { locale: "en" }),
            category: "commands",
        },
    ])

    $effect(() => {
        settingsStore.updateDOM()
    })

    $effect(() => {
        if (updated.current) {
            const reload = confirm(m.new_version_available())
            if (reload) location.reload()
        }
    })

    $effect(() => {
        const locale = getLocale()
        if (locale === "en" || locale === "ru") {
            untrack(() => {
                if (settingsStore.language !== locale) {
                    settingsStore.language = locale
                }
            })
        }
    })

    $effect(() => {
        // Clear/initialize search input whenever the prompt mode changes
        const _mode = uiStore.prompt.mode
        untrack(() => {
            if (uiStore.prompt.initialValue) {
                uiStore.prompt.value = uiStore.prompt.initialValue
                uiStore.prompt.initialValue = ""
            }
        })
    })

    onMount(() => {
        vfsStore.init().then(async () => {
            await viewerStore.syncWithBooks()
        })

        const handleKeydown = (event: KeyboardEvent) => {
            const activeNode = currentActiveNode || rootNode
            activeNode.handleKeydown(event)
        }
        window.addEventListener("keydown", handleKeydown)
        return () => window.removeEventListener("keydown", handleKeydown)
    })

    let promptPlaceholder = $derived.by(() => {
        if (uiStore.prompt.mode === "files" || uiStore.prompt.mode === "files-recursive") {
            const base = m.prompt_placeholder()
            return base.split(",")[0].trim() + "..."
        }
        if (uiStore.prompt.mode === "page") {
            return m.enter_page_number()
        }
        if (uiStore.prompt.mode === "move") {
            return m.move_to ? m.move_to() : "Move to..."
        }
        if (uiStore.prompt.mode === "theme") {
            return m.select_theme ? m.select_theme() : "SELECT THEME"
        }
        if (uiStore.prompt.mode === "layout") {
            return m.select_layout ? m.select_layout() : "SELECT LAYOUT"
        }
        if (uiStore.prompt.mode === "language") {
            return m.select_language ? m.select_language() : "SELECT LANGUAGE"
        }
        if (uiStore.prompt.mode === "folders") {
            return m.keymap_go_to_folder ? m.keymap_go_to_folder() + "..." : "Go to folder..."
        }
        return m.prompt_placeholder()
    })

    const globalPromptProvider: PromptProvider = ({ mode }) => {
        const list: SearchItem[] = []

        if (mode === "folders") {
            list.push(...getFoldersPromptItems())
        }
        if (mode === "move") {
            list.push(...getMovePromptItems())
        }
        if (mode === "theme") {
            list.push(...getThemePromptItems())
        }
        if (mode === "layout") {
            list.push(...getLayoutPromptItems())
        }
        if (mode === "language") {
            list.push(...getLanguagePromptItems())
        }
        if (mode === "files" || mode === "global" || mode === "files-recursive") {
            list.push(...getFilesPromptItems(mode))
        }
        if (mode === "global") {
            list.push(...getCommandsPromptItems(currentActiveNode || rootNode))
        }

        return list.sort((a, b) => (a.category === "menu" ? -1 : b.category === "menu" ? 1 : 0))
    }

    rootPromptNode = usePrompt(globalPromptProvider)

    let promptItems = $derived.by(() => {
        const activeNode = currentActivePromptNode || rootPromptNode
        return activeNode.getAllItems({
            value: uiStore.prompt.value,
            mode: uiStore.prompt.mode,
        })
    })
</script>

{#snippet modals()}
    {#if isHelpOpen}
        <KeymapHelp onClose={() => (isHelpOpen = false)} />
    {/if}
    {#if uiStore.prompt.isOpen}
        <Prompt
            bind:value={uiStore.prompt.value}
            items={promptItems}
            placeholder={promptPlaceholder}
            onClose={() => {
                if (uiStore.prompt.mode === "search" && uiStore.prompt.value.trim() !== "") {
                    searchStore.addToHistory(uiStore.prompt.value)
                }
                uiStore.prompt.mode = "global"
                uiStore.prompt.isOpen = false
                uiStore.prompt.value = ""
                uiStore.nodeToMoveId = null
            }}
        />
    {/if}
{/snippet}

{#if page.url.pathname.includes("/viewer")}
    {@render children()}
    {@render modals()}
{:else}
    <div class="app">
        {@render children()}
        {@render modals()}
    </div>
{/if}

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

    @media (--tablet) {
        .app {
            padding: calc(20px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right))
                calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
        }
    }
</style>
