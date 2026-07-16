<script lang="ts">
    import { settingsStore } from "$lib/modules/settings"
    import { onMount } from "svelte"
    import { searchStore, viewerStore } from "$lib/modules/viewer"
    import { vfsStore } from "$lib/modules/documents"
    import { type CommandScope, useCommands, commandsStore } from "$lib/modules/commands"
    import * as m from "$lib/paraglide/messages"
    import { KeymapHelp } from "$lib/modules/prompt"
    import { Prompt } from "$lib/modules/prompt"
    import {
        FloatingNotification,
        notificationStore,
        resolveContextualNotification,
    } from "$lib/modules/notifications"
    import { promptStore } from "$lib/modules/prompt"
    import { localizeHref } from "$lib/paraglide/runtime"
    import { page, updated } from "$app/state"
    import { afterNavigate, goto } from "$app/navigation"
    import { resolve } from "$app/paths"
    import { bookmarksStore } from "$lib/modules/viewer"
    import { settingsCommands } from "$lib/modules/settings"
    import { openCommandPalette } from "$lib/modules/prompt"
    import { createViewerOpenCommand } from "$lib/modules/viewer"
    import { createViewerBookmarkCommands } from "$lib/modules/viewer"
    import {
        LibraryRelinkHost,
        libraryBookOpenCommand,
        requestLibraryRelink,
    } from "$lib/modules/library"
    import "$lib/shared/styles/variables.css"
    import "$lib/shared/styles/global.css"

    let { children } = $props()

    let rootNode: CommandScope = undefined as any

    let currentActiveNode = $derived(
        commandsStore.activeScope === rootNode ? null : commandsStore.activeScope,
    )
    let isHelpOpen = $state(false)
    let isUpdating = $state(false)
    let isViewerPage = $derived(page.url.pathname.includes("/viewer"))

    let contextualNotification = $derived(
        notificationStore.current ??
            resolveContextualNotification({
                isViewerPage,
                isLibrarySelectionActive: vfsStore.selectedIds.size > 0,
                selectedCount: vfsStore.selectedIds.size,
                isViewerSearchActive: searchStore.isActive,
                currentMatchIndex: searchStore.currentMatchIndex,
                matchCount: searchStore.matches.length,
                importCount: vfsStore.activeImportCount,
                selectedLabel: m.selected_label(),
                matchedLabel: m.matched_label(),
                importingLabel: m.importing_book().replace("...", "").trim().toUpperCase(),
            }),
    )

    const viewerOpenCommand = createViewerOpenCommand({
        onFileAccessFailure: ({ bookId }) =>
            requestLibraryRelink(bookId, () =>
                commandsStore.execute("viewer.open", { bookId }).then(() => undefined),
            ),
    })

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
        libraryBookOpenCommand,
        rootBookmarkCommands["viewer.bookmark.open"],
        settingsCommands["settings.theme"],
        settingsCommands["settings.layout"],
        settingsCommands["settings.language"],
        settingsCommands["settings.animations.toggle"],
        settingsCommands["settings.pdf-title.toggle"],
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

    async function updateApp() {
        if (isUpdating) return
        isUpdating = true

        try {
            if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.getRegistration()

                if (registration) {
                    const controllerChanged = new Promise<void>((resolve) => {
                        const timeout = window.setTimeout(resolve, 10_000)
                        navigator.serviceWorker.addEventListener(
                            "controllerchange",
                            () => {
                                window.clearTimeout(timeout)
                                resolve()
                            },
                            { once: true },
                        )
                    })

                    await registration.update()
                    await controllerChanged
                }
            }
        } finally {
            location.reload()
        }
    }

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
        <KeymapHelp animations={settingsStore.animations} onClose={() => (isHelpOpen = false)} />
    {/if}
    {#if promptStore.isOpen}
        <Prompt />
    {/if}
{/snippet}

<div id="app-root">
    {#if isViewerPage}
        {@render children()}
        {@render modals()}
    {:else}
        <div class="app">
            {@render children()}
            {@render modals()}
        </div>
    {/if}

    <LibraryRelinkHost />

    {#if updated.current}
        <aside class="update-banner" aria-live="polite">
            <div>
                <strong>{m.new_version_available()}</strong>
                <span>{m.new_version_description()}</span>
            </div>
            <button type="button" onclick={updateApp} disabled={isUpdating}>
                {isUpdating ? m.updating_app() : m.update_app()}
            </button>
        </aside>
    {/if}

    <FloatingNotification
        notification={contextualNotification}
        animations={settingsStore.animations}
        viewerMode={isViewerPage}
    />
</div>

<style>
    .update-banner {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: var(--z-toast);
        display: flex;
        align-items: center;
        gap: 1.25rem;
        max-width: min(30rem, calc(100vw - 2rem));
        padding: 0.85rem 0.9rem 0.85rem 1rem;
        color: var(--text-color);
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-left: 0.35rem solid var(--accent-color);
        border-radius: var(--radius-md);
        box-shadow: 5px 5px 0 var(--shadow-color);
    }

    .update-banner div {
        display: grid;
        gap: 0.2rem;
    }

    .update-banner strong {
        font-size: var(--font-size-base);
    }

    .update-banner span {
        color: var(--faded-text-color);
        font-size: var(--font-size-sm);
    }

    .update-banner button {
        flex: none;
        padding: 0.55rem 0.8rem;
        color: var(--text-color);
        font: inherit;
        font-weight: 700;
        background: var(--accent-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        cursor: pointer;
    }

    .update-banner button:hover:not(:disabled) {
        background: var(--accent-active-color);
    }

    .update-banner button:focus-visible {
        outline: 3px solid var(--accent-active-color);
        outline-offset: 2px;
    }

    .update-banner button:disabled {
        cursor: wait;
        opacity: 0.65;
    }

    @media (max-width: 480px) {
        .update-banner {
            right: 0.75rem;
            bottom: 0.75rem;
            left: 0.75rem;
            max-width: none;
        }
    }
</style>
