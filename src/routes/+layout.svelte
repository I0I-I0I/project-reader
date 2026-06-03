<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { onMount, setContext, untrack } from "svelte"
    import { viewerStore, fileNodeToBook } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
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
    import { goto } from "$app/navigation"
    import { resolve } from "$app/paths"
    import type { FileNode, FolderNode } from "$lib/stores/vfsStore.types"
    import { locales, localizeHref, getLocale } from "$lib/paraglide/runtime"
    import { getLanguageName } from "$lib/locale"
    import { page } from "$app/state"
    import type { Pathname } from "$app/types"

    let { children } = $props()

    let currentActiveNode = $state.raw<CommandNode | null>(null)
    let currentActivePromptNode = $state.raw<PromptNode | null>(null)
    let isHelpOpen = $state(false)
    let promptValue = $state("")

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
            id: "open-file",
            keys: "shift+o",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode("files")
                uiStore.prompt.isOpen(true)
            },
            description: m.keymap_open_book(),
            category: "menu",
        },
        {
            id: "open-prompt",
            keys: "ctrl+k",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode("global")
                uiStore.prompt.isOpen(!uiStore.prompt.isOpen())
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
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode("theme")
                uiStore.prompt.isOpen(true)
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
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode("layout")
                uiStore.prompt.isOpen(true)
            },
        },
        {
            description: m.keymap_change_language(),
            category: "settings",
            subtitle: () => `${getLanguageName(getLocale())}`,
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode("language")
                uiStore.prompt.isOpen(true)
            },
        },
        {
            id: "scroll-down-layout",
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
            id: "scroll-down-layout-alt",
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
            id: "scroll-up-layout",
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
            id: "scroll-up-layout-alt",
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
            id: "scroll-page-down-layout",
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
            id: "scroll-page-down-layout-alt",
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
            id: "scroll-page-up-layout",
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
            id: "scroll-page-up-layout-alt",
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
        // Clear search input whenever the prompt mode changes
        const _mode = uiStore.prompt.mode()
        untrack(() => {
            promptValue = ""
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

    const translationCache = new Map<string, string>()

    const getEnglishTranslation = (localizedText: string): string | undefined => {
        if (typeof localizedText !== "string" || !localizedText) return undefined
        if (translationCache.has(localizedText)) {
            return translationCache.get(localizedText)
        }

        for (const key of Object.keys(m)) {
            const fn = (m as any)[key]
            if (typeof fn === "function" && fn.length === 0) {
                try {
                    if (fn() === localizedText) {
                        const engText = fn({}, { locale: "en" })
                        translationCache.set(localizedText, engText)
                        return engText
                    }
                } catch (e) {}
            }
        }
        return undefined
    }

    let promptPlaceholder = $derived.by(() => {
        if (uiStore.prompt.mode() === "files" || uiStore.prompt.mode() === "files-recursive") {
            const base = m.prompt_placeholder()
            return base.split(",")[0].trim() + "..."
        }
        if (uiStore.prompt.mode() === "page") {
            return m.enter_page_number()
        }
        if (uiStore.prompt.mode() === "move") {
            return m.move_to ? m.move_to() : "Move to..."
        }
        if (uiStore.prompt.mode() === "theme") {
            return m.select_theme ? m.select_theme() : "SELECT THEME"
        }
        if (uiStore.prompt.mode() === "layout") {
            return m.select_layout ? m.select_layout() : "SELECT LAYOUT"
        }
        if (uiStore.prompt.mode() === "language") {
            return m.select_language ? m.select_language() : "SELECT LANGUAGE"
        }
        if (uiStore.prompt.mode() === "folders") {
            return m.keymap_go_to_folder ? m.keymap_go_to_folder() + "..." : "Go to folder..."
        }
        return m.prompt_placeholder()
    })

    const globalPromptProvider: PromptProvider = ({ mode }) => {
        const list: SearchItem[] = []

        if (mode === "folders") {
            if (vfsStore.currentFolderId !== null) {
                list.push({
                    id: "folder-root",
                    title: m.root ? m.root() : "ROOT",
                    englishTitle: m.root ? m.root({}, { locale: "en" }) : "ROOT",
                    category: "navigation",
                    action: () => {
                        goto("/")
                        uiStore.prompt.mode("global")
                        uiStore.prompt.isOpen(false)
                    },
                })
            }

            const allFolders = Object.values(vfsStore.nodes).filter(
                (n) => n.type === "folder" && n.id !== vfsStore.currentFolderId,
            ) as FolderNode[]

            for (const folder of allFolders) {
                const folderPath = vfsStore.getFolderPath(folder.id)
                list.push({
                    id: `folder-${folder.id}`,
                    title: vfsStore.getNodePath(folder.id),
                    category: "navigation",
                    action: () => {
                        goto(`?folder=${encodeURIComponent(folderPath)}`)
                        uiStore.prompt.mode("global")
                        uiStore.prompt.isOpen(false)
                    },
                })
            }
        }

        if (mode === "move") {
            const nodeIdsToMove = uiStore.nodeToMoveId
                ? [uiStore.nodeToMoveId]
                : [...vfsStore.selectedIds]

            if (nodeIdsToMove.length > 0) {
                // Add Root option if any node is not already at root
                const anyNotAtRoot = nodeIdsToMove.some(
                    (id) => vfsStore.nodes[id]?.parentId !== null,
                )
                if (anyNotAtRoot) {
                    list.push({
                        id: "folder-root",
                        title: m.root ? m.root() : "ROOT",
                        category: "navigation",
                        action: async () => {
                            for (const id of nodeIdsToMove) {
                                try {
                                    await vfsStore.moveNode(id, null)
                                } catch (e) {
                                    console.error(`Failed to move node ${id} to root:`, e)
                                }
                            }
                            uiStore.prompt.mode("global")
                            uiStore.prompt.isOpen(false)

                            uiStore.nodeToMoveId = null
                            uiStore.isSelectionMode = false
                            vfsStore.clearSelection()
                        },
                    })
                }

                // Add all folders except the nodes themselves and their descendants
                const allFolders = Object.values(vfsStore.nodes).filter(
                    (n) => n.type === "folder",
                ) as FolderNode[]
                const invalidParents = new Set<string>()

                for (const id of nodeIdsToMove) {
                    const node = vfsStore.nodes[id]
                    if (node) {
                        invalidParents.add(node.id)
                        if (node.type === "folder") {
                            const collectDescendants = (folderId: string) => {
                                const n = vfsStore.nodes[folderId]
                                if (n && n.type === "folder") {
                                    for (const cid of n.childrenIds) {
                                        invalidParents.add(cid)
                                        collectDescendants(cid)
                                    }
                                }
                            }
                            collectDescendants(node.id)
                        }
                    }
                }

                for (const folder of allFolders) {
                    const allAlreadyThere = nodeIdsToMove.every(
                        (id) => vfsStore.nodes[id]?.parentId === folder.id,
                    )
                    if (!allAlreadyThere && !invalidParents.has(folder.id)) {
                        list.push({
                            id: `folder-${folder.id}`,
                            title: vfsStore.getNodePath(folder.id),
                            category: "navigation",
                            action: async () => {
                                for (const id of nodeIdsToMove) {
                                    try {
                                        await vfsStore.moveNode(id, folder.id)
                                    } catch (e) {
                                        console.error(
                                            `Failed to move node ${id} to ${folder.id}:`,
                                            e,
                                        )
                                    }
                                }
                                uiStore.prompt.mode("global")
                                uiStore.prompt.isOpen(false)

                                uiStore.nodeToMoveId = null
                                uiStore.isSelectionMode = false
                                vfsStore.clearSelection()
                            },
                        })
                    }
                }
            }
        }

        if (mode === "theme") {
            list.push({
                id: "theme-light",
                title: m.light(),
                englishTitle: m.light({}, { locale: "en" }),
                category: "settings",
                subtitle: settingsStore.theme === "light" ? "✓" : undefined,
                action: () => {
                    settingsStore.theme = "light"
                    uiStore.prompt.isOpen(false)
                    uiStore.prompt.mode("global")
                },
            })
            list.push({
                id: "theme-dark",
                title: m.dark(),
                englishTitle: m.dark({}, { locale: "en" }),
                category: "settings",
                subtitle: settingsStore.theme === "dark" ? "✓" : undefined,
                action: () => {
                    settingsStore.theme = "dark"
                    uiStore.prompt.isOpen(false)
                    uiStore.prompt.mode("global")
                },
            })
            list.push({
                id: "theme-system",
                title: m.system(),
                englishTitle: m.system({}, { locale: "en" }),
                category: "settings",
                subtitle: settingsStore.theme === "system" ? "✓" : undefined,
                action: () => {
                    settingsStore.theme = "system"
                    uiStore.prompt.isOpen(false)
                    uiStore.prompt.mode("global")
                },
            })
        }

        if (mode === "layout") {
            list.push({
                id: "layout-single",
                title: m.single_page(),
                englishTitle: m.single_page({}, { locale: "en" }),
                category: "settings",
                subtitle: settingsStore.layout === "single" ? "✓" : undefined,
                action: () => {
                    settingsStore.layout = "single"
                    uiStore.prompt.isOpen(false)
                    uiStore.prompt.mode("global")
                },
            })
            list.push({
                id: "layout-split",
                title: m.split_pages(),
                englishTitle: m.split_pages({}, { locale: "en" }),
                category: "settings",
                subtitle: settingsStore.layout === "split" ? "✓" : undefined,
                action: () => {
                    settingsStore.layout = "split"
                    uiStore.prompt.isOpen(false)
                    uiStore.prompt.mode("global")
                },
            })
            list.push({
                id: "layout-scroll",
                title: m.scroll_pages(),
                englishTitle: m.scroll_pages({}, { locale: "en" }),
                category: "settings",
                subtitle: settingsStore.layout === "scroll" ? "✓" : undefined,
                action: () => {
                    settingsStore.layout = "scroll"
                    uiStore.prompt.isOpen(false)
                    uiStore.prompt.mode("global")
                },
            })
        }

        if (mode === "language") {
            for (const locale of locales) {
                list.push({
                    id: `language-${locale}`,
                    title: getLanguageName(locale),
                    category: "settings",
                    subtitle: getLocale() === locale ? "✓" : undefined,
                    action: () => {
                        settingsStore.language = locale as "en" | "ru"
                        uiStore.prompt.isOpen(false)
                        uiStore.prompt.mode("global")
                        const resolvedHref = resolve(
                            localizeHref(page.url.pathname, { locale }) as Pathname,
                        )
                        window.location.href = resolvedHref
                    },
                })
            }
        }

        if (mode === "files" || mode === "global" || mode === "files-recursive") {
            let files = Object.values(vfsStore.nodes).filter(
                (node) => node.type === "file",
            ) as FileNode[]
            files.sort((a, b) => b.updatedAt - a.updatedAt)

            if (mode === "files-recursive") {
                const targetFolderId = vfsStore.currentFolderId
                if (targetFolderId !== null) {
                    files = files.filter((file) => {
                        let currentId = file.parentId
                        while (currentId) {
                            if (currentId === targetFolderId) return true
                            const current = vfsStore.nodes[currentId]
                            currentId = current ? current.parentId : null
                        }
                        return false
                    })
                }
            }

            for (const fileNode of files) {
                const book = fileNodeToBook(fileNode)
                const parentPath = fileNode.parentId
                    ? vfsStore.getNodePath(fileNode.parentId)
                    : m.root
                      ? m.root()
                      : "ROOT"
                const pageInfo = book.pageNumber
                    ? `${m.page()} ${book.pageNumber}`
                    : m.not_read_yet()

                list.push({
                    id: `book-${book.id}`,
                    title: book.name,
                    subtitle: `${parentPath} / ${pageInfo}`,
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
                        vfsStore.clearForwardHistory()
                        goto(resolve("/viewer"))
                        uiStore.prompt.mode("global")
                        uiStore.prompt.isOpen(false)
                    },
                })
            }
        }

        if (mode === "global") {
            const activeNode = currentActiveNode || rootNode
            if (activeNode) {
                const commands = activeNode.getAllCommands()
                const commandGroups = new Map<string, typeof commands>()
                for (const cmd of commands) {
                    const uniqueId = cmd.id || cmd.description
                    if (cmd.description) {
                        if (!commandGroups.has(uniqueId)) {
                            commandGroups.set(uniqueId, [])
                        }
                        commandGroups.get(uniqueId)!.push(cmd)
                    }
                }

                for (const [uniqueId, group] of commandGroups) {
                    const primaryCmd = group.reduce((best, current) => {
                        if (!current.keys) return best
                        if (!best.keys) return current
                        if (current.keys.includes("arrow")) return current
                        return best.keys.length <= current.keys.length ? best : current
                    }, group[0])

                    const engTitle = getEnglishTranslation(primaryCmd.description)
                    list.push({
                        id: primaryCmd.id ? `command-${primaryCmd.id}` : `command-${uniqueId}`,
                        title: primaryCmd.description,
                        englishTitle: engTitle,
                        subtitle: primaryCmd.subtitle
                            ? primaryCmd.subtitle()
                            : primaryCmd.keys
                              ? m.shortcut_hint({ keys: primaryCmd.keys.toUpperCase() })
                              : undefined,
                        englishSubtitle: primaryCmd.subtitle
                            ? undefined
                            : primaryCmd.keys
                              ? m.shortcut_hint
                                  ? m.shortcut_hint(
                                        { keys: primaryCmd.keys.toUpperCase() },
                                        { locale: "en" },
                                    )
                                  : undefined
                              : undefined,
                        category: primaryCmd.category || "commands",
                        keys: primaryCmd.keys,
                        action: () => {
                            const event = new KeyboardEvent("keydown", {
                                bubbles: true,
                                cancelable: true,
                            })
                            uiStore.prompt.isOpen(false)
                            uiStore.prompt.mode("global")
                            primaryCmd.action(event)
                        },
                    })
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
            mode: uiStore.prompt.mode(),
        })
    })
</script>

{#snippet modals()}
    {#if isHelpOpen}
        <KeymapHelp onClose={() => (isHelpOpen = false)} />
    {/if}
    {#if uiStore.prompt.isOpen()}
        <Prompt
            bind:value={promptValue}
            items={promptItems}
            placeholder={promptPlaceholder}
            onClose={() => {
                uiStore.prompt.mode("global")
                uiStore.prompt.isOpen(false)
                promptValue = ""
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
