<script lang="ts">
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { onMount } from "svelte"
    import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
    import {
        type CommandScope,
        useCommands,
        commandsStore,
    } from "$lib/features/commands/commandsStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import KeymapHelp from "$lib/features/prompt/components/KeymapHelp.svelte"
    import Prompt from "$lib/features/prompt/components/Prompt.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import FloatingNotification from "$lib/core/components/FloatingNotification.svelte"
    import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"
    import { localizeHref } from "$lib/paraglide/runtime"
    import { page, updated } from "$app/state"
    import { afterNavigate, goto } from "$app/navigation"
    import { resolve } from "$app/paths"
    import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
    import { settingsCommands } from "$lib/core/commands/settingsCommands"
    import { openCommandPalette } from "$lib/features/commands/commandPalette"
    import { viewerOpenCommand } from "$lib/features/viewer/commands/viewerOpenCommand"
    import { createViewerBookmarkCommands } from "$lib/features/viewer/commands/viewerBookmarkCommandFactory"
    import "$lib/core/styles/variables.css"
    import "$lib/core/styles/global.css"

    let { children } = $props()

    let rootNode: CommandScope = undefined as any

    let currentActiveNode = $derived(
        commandsStore.activeScope === rootNode ? null : commandsStore.activeScope,
    )
    let isHelpOpen = $state(false)

    onMount(() => uiStore.registerModal(() => isHelpOpen))
    onMount(() => uiStore.registerModal(() => promptStore.isOpen))

    const rootBookmarkCommands = createViewerBookmarkCommands({
        prompt: promptStore,
        scope: { onDestroy: (callback) => rootNode.onDestroy(callback) },
        bookmarks: {
            list: () => bookmarksStore.bookmarks,
            resolveBookName: (bookId) => vfsStore.nodes[bookId]?.name ?? m.unknown_book(),
            open: async (bookmarkId) => {
                const bookmark = bookmarksStore.bookmarks.find(({ id }) => id === bookmarkId)
                if (!bookmark) return
                const result = await commandsStore.execute("viewer.open", {
                    bookId: bookmark.bookId,
                })
                if (result.status === "executed") {
                    viewerStore.goToPage?.(bookmark.pageNumber, { isJump: true })
                }
            },
            isToggleBlocked: () => true,
            isCurrentPageBookmarked: () => false,
            toggleCurrentPage: () => undefined,
        },
    })
    rootNode = useCommands([
        {
            id: "prompt.open",
            keymap: ["ctrl+k", "shift+:"],
            label: () => m.keymap_prompt(),
            englishLabel: () => m.keymap_prompt({}, { locale: "en" }),
            allowInInputs: true,
            category: "commands",
            run: async (payload) => {
                if (promptStore.isOpen && payload?.initialQuery === undefined) {
                    promptStore.close()
                    return
                }
                await openCommandPalette(currentActiveNode || rootNode, payload?.initialQuery)
            },
        },
        { ...viewerOpenCommand, keymap: "shift+o" },
        rootBookmarkCommands["viewer.bookmark.open"],
        settingsCommands["settings.theme"],
        settingsCommands["settings.layout"],
        settingsCommands["settings.language"],
        settingsCommands["settings.animations.toggle"],
        {
            id: "viewer.scroll",
            keymap: ["arrowdown", "j", "arrowup", "k", "pagedown", "d", "pageup", "u"],
            label: () => m.keymap_scroll_down(),
            englishLabel: () => m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
            keyboardPayload: (event) => {
                const key = event.key.toLowerCase()
                return {
                    direction:
                        key === "arrowup" || key === "k" || key === "pageup" || key === "u"
                            ? "up"
                            : "down",
                    amount:
                        key === "pagedown" || key === "d" || key === "pageup" || key === "u"
                            ? "page"
                            : "step",
                    repeated: event.repeat,
                }
            },
            run: (payload) => {
                const { direction, amount, repeated } = payload ?? {
                    direction: "down",
                    amount: "step",
                    repeated: false,
                }
                window.scrollBy({
                    top:
                        (direction === "up" ? -1 : 1) *
                        window.innerHeight *
                        (amount === "page" ? 0.6 : 0.2),
                    behavior: !repeated && settingsStore.animations ? "smooth" : "auto",
                })
            },
        },
        {
            id: "help.toggle",
            keymap: "?",
            label: () => m.keymap_toggle_help(),
            englishLabel: () => m.keymap_toggle_help({}, { locale: "en" }),
            category: "commands",
            run: () => {
                isHelpOpen = !isHelpOpen
            },
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

    afterNavigate(({ to }) => {
        if (!to) return
        const { pathname, search } = to.url
        if (
            pathname === "/" ||
            pathname === "/viewer" ||
            pathname === "/en" ||
            pathname === "/en/viewer"
        ) {
            localStorage.setItem("last_visited_url", pathname + search)
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
</script>

{#snippet modals()}
    {#if isHelpOpen}
        <KeymapHelp onClose={() => (isHelpOpen = false)} />
    {/if}
    {#if promptStore.isOpen}
        <Prompt />
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
