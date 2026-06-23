<script lang="ts">
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { onMount, setContext, untrack } from "svelte"
    import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
    import { searchStore } from "$lib/features/prompt/stores/searchStore.svelte"
    import {
        type CommandNode,
        useCommands,
        commandDispatcher,
    } from "$lib/features/prompt/stores/commandsStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import KeymapHelp from "$lib/features/prompt/components/KeymapHelp.svelte"
    import Prompt from "$lib/features/prompt/components/Prompt.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import FloatingNotification from "$lib/core/components/FloatingNotification.svelte"
    import {
        type PromptNode,
        usePrompt,
        type SearchItem,
        type PromptProvider,
    } from "$lib/features/prompt/stores/promptStore.svelte"
    import { getLocale, localizeHref } from "$lib/paraglide/runtime"
    import { getLanguageName } from "$lib/core/language/locale"
    import { page, updated } from "$app/state"
    import { goto } from "$app/navigation"
    import { resolve } from "$app/paths"
    import { browser } from "$app/environment"
    import {
        getFoldersPromptItems,
        getMovePromptItems,
        getThemePromptItems,
        getLayoutPromptItems,
        getLanguagePromptItems,
        getFilesPromptItems,
        getCommandsPromptItems,
        getBookmarksPromptItems,
    } from "$lib/features/prompt/stores/promptProviders.svelte"
    import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
    import "$lib/core/styles/variables.css"
    import "$lib/core/styles/global.css"

    let { children } = $props()

    let rootNode: CommandNode = undefined as any
    let rootPromptNode: PromptNode = undefined as any

    let currentActiveNode = $derived(
        commandDispatcher.activeRegistry === rootNode ? null : commandDispatcher.activeRegistry,
    )
    let currentActivePromptNode = $state.raw<PromptNode | null>(null)
    let isHelpOpen = $state(false)

    $effect(() => {
        return uiStore.registerModal(() => isHelpOpen)
    })

    setContext("set_active_commands_node", (node: CommandNode | null) => {
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
            keys: ["ctrl+k", "shift+:"],
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
            keys: ["arrowdown", "j"],
            action: (event?: KeyboardEvent) => {
                window.scrollBy({
                    top: window.innerHeight * 0.2,
                    behavior: !event?.repeat && settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-up",
            keys: ["arrowup", "k"],
            action: (event?: KeyboardEvent) => {
                window.scrollBy({
                    top: -window.innerHeight * 0.2,
                    behavior: !event?.repeat && settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-page-down",
            keys: ["pagedown", "d"],
            action: (event?: KeyboardEvent) => {
                window.scrollBy({
                    top: window.innerHeight * 0.6,
                    behavior: !event?.repeat && settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "scroll-page-up",
            keys: ["pageup", "u"],
            action: (event?: KeyboardEvent) => {
                window.scrollBy({
                    top: -window.innerHeight * 0.6,
                    behavior: !event?.repeat && settingsStore.animations ? "smooth" : "auto",
                })
            },
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "search-bookmarks",
            keys: "shift+b",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "bookmarks"
                uiStore.prompt.isOpen = true
            },
            description: m.search_bookmarks(),
            englishDescription: "Search bookmarks",
            category: "menu",
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
        // Clear/initialize search input whenever the prompt mode changes
        const _mode = uiStore.prompt.mode
        untrack(() => {
            if (uiStore.prompt.initialValue) {
                uiStore.prompt.value = uiStore.prompt.initialValue
                uiStore.prompt.initialValue = ""
            }
        })
    })

    $effect(() => {
        const url = page.url
        if (browser) {
            if (url.pathname === "/" || url.pathname === "/viewer") {
                const fullPath = url.pathname + url.search
                localStorage.setItem("last_visited_url", fullPath)
            }
        }
    })

    onMount(() => {
        const pathname = page.url.pathname as string
        const hasExplicitEn = pathname === "/en" || pathname.startsWith("/en/")

        // 1. URL locale is authoritative when landing on an explicitly localized URL
        if (hasExplicitEn && settingsStore.language !== "en") {
            settingsStore.language = "en"
        }

        // 2. Redirect to English if saved preference is English but URL is unprefixed (Russian base)
        if (settingsStore.language === "en" && !hasExplicitEn) {
            let targetHref = page.url.pathname + page.url.search + page.url.hash

            // Special case for root: try to restore last visited URL first
            if (page.url.pathname === "/" && page.url.search === "") {
                const lastVisitedUrl = localStorage.getItem("last_visited_url")
                if (lastVisitedUrl && lastVisitedUrl !== "/") {
                    targetHref = lastVisitedUrl
                }
            }

            const localizedPath = localizeHref(targetHref, { locale: "en" })

            // Initialize VFS even when redirecting to avoid empty state during transition
            vfsStore.init().then(() => viewerStore.syncWithBooks())

            window.location.replace(resolve(localizedPath as any))
            return
        }

        // 3. Normal initialization
        vfsStore.init().then(async () => {
            await viewerStore.syncWithBooks()
            await bookmarksStore.loadAllBookmarks()

            // Restore last visited URL if landing on the root page with no search params
            if (page.url.pathname === "/" && page.url.search === "") {
                const lastVisitedUrl = localStorage.getItem("last_visited_url")
                if (lastVisitedUrl && lastVisitedUrl !== "/") {
                    const [p, s] = lastVisitedUrl.split("?")
                    const localizedPathname = localizeHref(p, {
                        locale: settingsStore.language,
                    })
                    const finalUrl = s ? `${localizedPathname}?${s}` : localizedPathname
                    goto(resolve(finalUrl as any), { replaceState: true })
                }
            }
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
            return m.move_to()
        }
        if (uiStore.prompt.mode === "theme") {
            return m.select_theme()
        }
        if (uiStore.prompt.mode === "layout") {
            return m.select_layout()
        }
        if (uiStore.prompt.mode === "language") {
            return m.select_language()
        }
        if (uiStore.prompt.mode === "folders") {
            return m.keymap_go_to_folder() + "..."
        }
        if (uiStore.prompt.mode === "bookmarks") {
            return m.search_bookmarks() + "..."
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
        if (mode === "bookmarks" || mode === "global") {
            list.push(...getBookmarksPromptItems())
        }
        if (mode === "global") {
            list.push(...getCommandsPromptItems(currentActiveNode || rootNode))
        }

        return list.sort((a, b) => (a.category === "menu" ? -1 : b.category === "menu" ? 1 : 0))
    }

    rootPromptNode = usePrompt(globalPromptProvider)

    let promptItems = $derived.by(() => {
        const activeNode = currentActivePromptNode || rootPromptNode
        const mode = uiStore.prompt.mode
        if (mode === "search" || mode === "page" || mode === "global") {
            return activeNode.getAllItems({
                value: uiStore.prompt.value,
                mode,
            })
        }
        // We untrack value here because currently no providers use the live value
        // to filter the initial list of items. Filtering is handled by Fuse in Prompt.svelte.
        // This prevents the entire promptItems list from being recreated on every keystroke.
        return untrack(() =>
            activeNode.getAllItems({
                value: uiStore.prompt.value,
                mode: mode,
            }),
        )
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
                uiStore.prompt.initialValue = ""
                uiStore.prompt.openedWithInitialValue = false
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

<FloatingNotification />
