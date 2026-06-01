<script lang="ts">
    import favicon from "$lib/assets/favicon.svg"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { onMount, setContext, untrack } from "svelte"
    import { viewerStore, fileNodeToBook } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { type KeymapNode, useKeymap } from "$lib/stores/keymapStore.svelte"
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
    import { goto } from "$app/navigation"
    import { resolve } from "$app/paths"
    import type { FileNode, FolderNode } from "$lib/stores/vfsStore.types"

    let { children } = $props()

    let currentActiveNode = $state<KeymapNode | null>(null)
    let currentActivePromptNode = $state<PromptNode | null>(null)
    let isHelpOpen = $state(false)
    let promptValue = $state("")

    let rootNode: KeymapNode
    let rootPromptNode: PromptNode

    setContext("set_active_keymap_node", (node: KeymapNode | null) => {
        currentActiveNode = node
    })

    setContext("get_active_keymap_node", () => currentActiveNode || rootNode)

    setContext("set_active_prompt_node", (node: PromptNode | null) => {
        currentActivePromptNode = node
    })

    setContext("get_active_prompt_node", () => currentActivePromptNode || rootPromptNode)

    rootNode = useKeymap([
        {
            id: "open-prompt",
            keys: "ctrl+k",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.isPromptOpen = !uiStore.isPromptOpen
                if (uiStore.isPromptOpen) {
                    uiStore.promptMode = "global"
                }
            },
            description: m.keymap_prompt(),
            allowInInputs: true,
            category: "commands",
        },
        {
            id: "open-file",
            keys: "o",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.promptMode = "files"
                uiStore.isPromptOpen = true
            },
            description: settingsStore.language === "ru" ? "Открыть книгу" : "Open book",
            category: "menu",
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

    $effect(() => {
        // Clear search input whenever the prompt mode changes
        const _mode = uiStore.promptMode
        untrack(() => {
            promptValue = ""
        })
    })

    onMount(() => {
        vfsStore.init().then(() => {
            viewerStore.syncWithBooks()
        })

        const handleKeydown = (event: KeyboardEvent) => {
            const activeNode = currentActiveNode || rootNode
            activeNode.handleKeydown(event)
        }
        window.addEventListener("keydown", handleKeydown)
        return () => window.removeEventListener("keydown", handleKeydown)
    })

    const getEnglishTranslation = (localizedText: string): string | undefined => {
        if (typeof localizedText !== "string") return undefined
        if (!localizedText) return undefined
        for (const key of Object.keys(m)) {
            const fn = (m as any)[key]
            if (typeof fn === "function") {
                try {
                    if (fn() === localizedText) {
                        return fn({}, { locale: "en" })
                    }
                } catch (e) {}
            }
        }
        return undefined
    }

    let promptPlaceholder = $derived.by(() => {
        if (uiStore.promptMode === "files") {
            const base = m.prompt_placeholder()
            return base.split(",")[0].trim() + "..."
        }
        if (uiStore.promptMode === "page") {
            return m.enter_page_number()
        }
        if (uiStore.promptMode === "move") {
            return m.move_to ? m.move_to() : "Move to..."
        }
        return m.prompt_placeholder()
    })

    const globalPromptProvider: PromptProvider = ({ mode }) => {
        const list: SearchItem[] = []

        if (mode === "move" && uiStore.nodeToMoveId) {
            const nodeToMove = vfsStore.nodes[uiStore.nodeToMoveId]
            if (nodeToMove) {
                // Add Root option if not already at root
                if (nodeToMove.parentId !== null) {
                    list.push({
                        id: "folder-root",
                        title: m.root ? m.root() : "ROOT",
                        category: "navigation",
                        action: async () => {
                            await vfsStore.moveNode(nodeToMove.id, null)
                            uiStore.isPromptOpen = false
                            uiStore.nodeToMoveId = null
                        },
                    })
                }

                // Add all folders except itself and its descendants
                const allFolders = Object.values(vfsStore.nodes).filter(
                    (n) => n.type === "folder",
                ) as FolderNode[]
                const invalidParents = new Set<string>()
                if (nodeToMove.type === "folder") {
                    const collectDescendants = (id: string) => {
                        invalidParents.add(id)
                        const node = vfsStore.nodes[id]
                        if (node && node.type === "folder") {
                            node.childrenIds.forEach(collectDescendants)
                        }
                    }
                    collectDescendants(nodeToMove.id)
                }

                for (const folder of allFolders) {
                    if (folder.id !== nodeToMove.parentId && !invalidParents.has(folder.id)) {
                        list.push({
                            id: `folder-${folder.id}`,
                            title: folder.name,
                            category: "navigation",
                            action: async () => {
                                await vfsStore.moveNode(nodeToMove.id, folder.id)
                                uiStore.isPromptOpen = false
                                uiStore.nodeToMoveId = null
                            },
                        })
                    }
                }
            }
        }

        if (mode === "files" || mode === "global") {
            const files = Object.values(vfsStore.nodes).filter(
                (node) => node.type === "file",
            ) as FileNode[]
            files.sort((a, b) => b.updatedAt - a.updatedAt)

            for (const fileNode of files) {
                const book = fileNodeToBook(fileNode)
                list.push({
                    id: `book-${book.id}`,
                    title: book.name,
                    subtitle: book.pageNumber ? `${m.page()} ${book.pageNumber}` : m.not_read_yet(),
                    category: "books",
                    action: async () => {
                        let activeNode = fileNode
                        if (activeNode.isLocked) {
                            try {
                                await vfsStore.restoreFileAccess(activeNode.id)
                                activeNode = vfsStore.nodes[activeNode.id] as FileNode
                            } catch (e) {
                                alert(e instanceof Error ? e.message : String(e))
                                return
                            }
                        }
                        viewerStore.setCurrentBook(fileNodeToBook(activeNode))
                        goto(resolve("/viewer"))
                        uiStore.isPromptOpen = false
                    },
                })
            }
        }

        if (mode === "global") {
            const activeNode = currentActiveNode || rootNode
            if (activeNode) {
                const keymaps = activeNode.getAllKeymaps()
                const seen = new Set<string>()
                for (const keymap of keymaps) {
                    if (keymap.description && !seen.has(keymap.keys)) {
                        seen.add(keymap.keys)
                        const engTitle = getEnglishTranslation(keymap.description)
                        list.push({
                            id: `command-${keymap.keys}`,
                            title: keymap.description,
                            englishTitle: engTitle,
                            subtitle: keymap.subtitle
                                ? keymap.subtitle()
                                : m.shortcut_hint({ keys: keymap.keys.toUpperCase() }),
                            englishSubtitle: keymap.subtitle
                                ? undefined
                                : m.shortcut_hint
                                  ? m.shortcut_hint(
                                        { keys: keymap.keys.toUpperCase() },
                                        { locale: "en" },
                                    )
                                  : undefined,
                            category: keymap.category || "commands",
                            keys: keymap.keys,
                            action: () => {
                                const event = new KeyboardEvent("keydown", {
                                    bubbles: true,
                                    cancelable: true,
                                })
                                uiStore.isPromptOpen = false
                                keymap.action(event)
                            },
                        })
                    }
                }
            }
        }

        return list.sort((a, b) => (a.category === "menu" ? -1 : b.category === "menu" ? 1 : 0))
    }

    rootPromptNode = usePrompt(globalPromptProvider)

    let promptItems = $derived.by(() => {
        const activeNode = currentActivePromptNode || rootPromptNode
        return activeNode.getAllItems({
            value: promptValue,
            mode: uiStore.promptMode,
        })
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
        <Prompt
            bind:value={promptValue}
            items={promptItems}
            placeholder={promptPlaceholder}
            onClose={() => {
                uiStore.isPromptOpen = false
                promptValue = ""
                uiStore.nodeToMoveId = null
            }}
        />
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

    @media (--tablet) {
        .app {
            padding: calc(20px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right))
                calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
        }
    }
</style>
