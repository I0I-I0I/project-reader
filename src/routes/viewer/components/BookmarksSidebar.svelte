<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import { cubicOut } from "svelte/easing"
    import {
        useCommands,
        getShortcutHint,
        type CommandNode,
    } from "$lib/stores/commandsStore.svelte"
    import { getContext, untrack, tick } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { bookmarksStore } from "$lib/stores/bookmarksStore.svelte"
    import type { Bookmark } from "$lib/stores/vfsStore.types"
    import TrashIcon from "$lib/components/icons/TrashIcon.svelte"
    import EditIcon from "$lib/components/icons/EditIcon.svelte"
    import BookmarkIcon from "$lib/components/icons/BookmarkIcon.svelte"
    import CheckIcon from "$lib/components/icons/CheckIcon.svelte"
    import Modal from "$lib/components/ui/Modal.svelte"
    import Input from "$lib/components/ui/Input.svelte"
    import DeleteConfirmModal from "$lib/components/DeleteConfirmModal.svelte"
    import BookmarkEditKeymaps from "./BookmarkEditKeymaps.svelte"

    let {
        onClose,
        onMouseLeave,
        minimal = false,
    } = $props<{
        onClose: () => void
        onMouseLeave?: (e: MouseEvent) => void
        minimal?: boolean
    }>()

    let searchQuery = $state("")
    let selectedIndex = $state(-1)
    let searchInputRef = $state<HTMLInputElement | undefined>()
    let contentRef = $state<HTMLElement | undefined>()
    let isSearchFocused = $state(false)

    // Inline editing state for items in list
    let editingBookmarkId = $state<string | null>(null)
    let editingName = $state("")
    let bookmarkToDeleteId = $state<string | null>(null)

    $effect(() => {
        if (editingBookmarkId) {
            tick().then(() => {
                const input = document.getElementById(
                    "edit-bookmark-name-input",
                ) as HTMLInputElement | null
                if (input) {
                    input.focus()
                    input.select()
                }
            })
        }
    })

    let currentBook = $derived(viewerStore.getCurrentBook())
    let currentBookId = $derived(currentBook?.id)
    let currentPage = $derived(viewerStore.currentPage)

    let isCurrentPageBookmarked = $derived(
        currentBookId
            ? bookmarksStore.bookmarks.some(
                  (b) => b.bookId === currentBookId && b.pageNumber === currentPage,
              )
            : false,
    )

    let currentPageBookmark = $derived(
        currentBookId
            ? bookmarksStore.bookmarks.find(
                  (b) => b.bookId === currentBookId && b.pageNumber === currentPage,
              )
            : null,
    )

    let filteredBookmarks = $derived(
        bookmarksStore.bookmarks
            .filter(
                (b) =>
                    b.bookId === currentBookId &&
                    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .sort((a, b) => a.pageNumber - b.pageNumber),
    )

    async function handleSaveRename(id: string | null) {
        if (!id || !editingName.trim()) return
        await bookmarksStore.updateBookmark(id, editingName.trim())
        editingBookmarkId = null
    }

    function selectBookmark(bookmark: any) {
        if (bookmark.pageNumber !== undefined) {
            viewerStore.goToPage(bookmark.pageNumber, { isJump: true })
            if (window.innerWidth <= 480) {
                onClose()
            }
        }
    }

    function navigateSelection(direction: "next" | "prev") {
        if (filteredBookmarks.length === 0) return
        if (direction === "next") {
            selectedIndex = (selectedIndex + 1) % filteredBookmarks.length
        } else {
            selectedIndex =
                (selectedIndex - 1 + filteredBookmarks.length) % filteredBookmarks.length
        }
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault()
            const bookmark = filteredBookmarks[selectedIndex]
            if (bookmark) {
                selectBookmark(bookmark)
                onClose()
            }
        } else if (event.key === "Escape") {
            event.preventDefault()
            searchInputRef?.blur()
        }
    }

    function scrollSelectedIntoView() {
        requestAnimationFrame(() => {
            if (!contentRef) return
            const selectedEl = contentRef.querySelector(".bookmark-card.selected")
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: "nearest" })
            }
        })
    }

    let lastQuery = ""

    $effect(() => {
        if (!filteredBookmarks || filteredBookmarks.length === 0) return

        const currentQuery = searchQuery
        untrack(() => {
            if (selectedIndex === -1) {
                selectedIndex = 0
                lastQuery = currentQuery
            } else if (currentQuery !== lastQuery) {
                lastQuery = currentQuery
                selectedIndex = 0
            }
        })
    })

    $effect(() => {
        const _ = selectedIndex
        const __ = filteredBookmarks.length
        untrack(() => {
            scrollSelectedIntoView()
        })
    })

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    const sidebarCommandsNode = useCommands(
        [
            {
                id: "close",
                keys: ["ctrl+c", "ctrl+["],
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: () => {
                    onClose()
                },
                description: "Close Bookmarks Sidebar",
                allowInInputs: true,
            },
            {
                id: "close-alt",
                keys: ["escape", "q"],
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: () => {
                    onClose()
                },
                description: "Close Bookmarks Sidebar",
                allowInInputs: false,
            },
            {
                id: "scroll-down",
                keys: "j",
                description: "Next Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                id: "scroll-down-alt",
                keys: ["arrowdown", "ctrl+n", "ctrl+j"],
                description: "Next Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
                allowInInputs: true,
            },
            {
                id: "scroll-up",
                keys: "k",
                description: "Previous Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
                id: "scroll-up-alt",
                keys: ["arrowup", "ctrl+p", "ctrl+k"],
                description: "Previous Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
                allowInInputs: true,
            },
            {
                id: "select-bookmark",
                keys: "enter",
                description: "Jump to Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    const bookmark = filteredBookmarks[selectedIndex]
                    if (bookmark) {
                        selectBookmark(bookmark)
                        onClose()
                    }
                },
            },
            {
                id: "search-bookmarks",
                keys: "/",
                description: "Search Bookmarks",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    searchInputRef?.focus()
                    searchInputRef?.select()
                },
            },
            {
                id: "edit-selected-bookmark",
                keys: "e",
                description: "Edit Selected Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    const bookmark = filteredBookmarks[selectedIndex]
                    if (bookmark) {
                        triggerEditKeyboard(bookmark)
                    }
                },
            },
            {
                id: "delete-selected-bookmark",
                keys: "d",
                description: "Delete Selected Bookmark",
                disabled: () => !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    const bookmark = filteredBookmarks[selectedIndex]
                    if (bookmark) {
                        triggerDeleteKeyboard(bookmark)
                    }
                },
            },
            {
                id: "edit-selected-bookmark-input",
                keys: "ctrl+e",
                description: "Edit Selected Bookmark",
                disabled: () => !isSearchFocused || !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    const bookmark = filteredBookmarks[selectedIndex]
                    if (bookmark) {
                        triggerEditKeyboard(bookmark)
                    }
                },
                allowInInputs: true,
            },
            {
                id: "delete-selected-bookmark-input",
                keys: "ctrl+d",
                description: "Delete Selected Bookmark",
                disabled: () => !isSearchFocused || !!editingBookmarkId || !!bookmarkToDeleteId,
                action: (event) => {
                    event.preventDefault()
                    const bookmark = filteredBookmarks[selectedIndex]
                    if (bookmark) {
                        triggerDeleteKeyboard(bookmark)
                    }
                },
                allowInInputs: true,
            },
        ],
        activeNodeBeforeOpen,
    )

    function triggerEditKeyboard(bookmark: Bookmark) {
        editingBookmarkId = bookmark.id
        editingName = bookmark.name
    }

    function triggerDeleteKeyboard(bookmark: Bookmark) {
        bookmarkToDeleteId = bookmark.id
    }

    function formatKey(keys: string | string[]): string {
        if (Array.isArray(keys)) {
            return keys.map((k) => formatKey(k)).join("/")
        }
        const MODIFIERS = ["ctrl", "meta", "alt", "shift"]
        const parts = keys.split("+")
        parts.sort((a, b) => {
            const aLower = a.toLowerCase().trim()
            const bLower = b.toLowerCase().trim()
            const aIdx = MODIFIERS.indexOf(aLower)
            const bIdx = MODIFIERS.indexOf(bLower)

            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return aLower.localeCompare(bLower)
        })
        return parts
            .map((part) => {
                const lower = part.toLowerCase().trim()
                if (lower === "arrowup") return "↑"
                if (lower === "arrowdown") return "↓"
                if (lower === "ctrl") return "C"
                if (lower === "meta") return "M"
                if (lower === "alt") return "A"
                if (lower === "shift") return "S"
                if (lower === "escape") return "Esc"
                if (lower === "enter") return "Enter"
                if (lower.length === 1) return lower
                return part
            })
            .join("-")
    }

    let navigateShortcuts = $derived.by(() => {
        if (!sidebarCommandsNode) return []
        const cmds = sidebarCommandsNode.getAllCommands()
        const downCmds = cmds.filter((c) => c.id === "scroll-down" || c.id === "scroll-down-alt")
        const upCmds = cmds.filter((c) => c.id === "scroll-up" || c.id === "scroll-up-alt")
        if (downCmds.length === 0 || upCmds.length === 0) return []

        const downKeys = downCmds.flatMap((c) =>
            Array.isArray(c.keys) ? c.keys : c.keys ? [c.keys] : [],
        )
        const upKeys = upCmds.flatMap((c) =>
            Array.isArray(c.keys) ? c.keys : c.keys ? [c.keys] : [],
        )

        const pairs: { display: string }[] = []
        const keyPairs = [
            { down: "j", up: "k" },
            { down: "arrowdown", up: "arrowup" },
            { down: "ctrl+n", up: "ctrl+p" },
        ]
        for (const pair of keyPairs) {
            if (downKeys.includes(pair.down) && upKeys.includes(pair.up)) {
                pairs.push({
                    display: `${formatKey(pair.down)}/${formatKey(pair.up)}`,
                })
            }
        }
        return pairs
    })

    let closeShortcuts = $derived.by(() => {
        if (!sidebarCommandsNode) return []
        const cmds = sidebarCommandsNode.getAllCommands()
        const closeCmd = cmds.find((c) => c.id === "close" && c.keys)
        const closeAltCmd = cmds.find((c) => c.id === "close-alt" && c.keys)
        const keys: string[] = []
        if (closeCmd && closeCmd.keys) {
            if (Array.isArray(closeCmd.keys)) keys.push(...closeCmd.keys)
            else keys.push(closeCmd.keys)
        }
        if (closeAltCmd && closeAltCmd.keys) {
            if (Array.isArray(closeAltCmd.keys)) keys.push(...closeAltCmd.keys)
            else keys.push(closeAltCmd.keys)
        }
        return keys.map((k) => formatKey(k))
    })

    let selectShortcut = $derived.by(() => {
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "select-bookmark" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let searchShortcut = $derived.by(() => {
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "search-bookmarks" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let editShortcut = $derived.by(() => {
        if (isSearchFocused) {
            return formatKey("ctrl+e")
        }
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "edit-selected-bookmark" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let deleteShortcut = $derived.by(() => {
        if (isSearchFocused) {
            return formatKey("ctrl+d")
        }
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "delete-selected-bookmark" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    function slideAndFly(_: HTMLElement, { duration = 150 }) {
        return {
            duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                return `transform: translateX(${(eased - 1) * 100}%);`
            },
        }
    }
</script>

{#snippet sidebarContent()}
    <div class="bookmarks-sidebar-wrapper">
        <div class="sidebar-search">
            <input
                bind:this={searchInputRef}
                type="text"
                bind:value={searchQuery}
                placeholder={`${m.search_bookmarks_placeholder ? m.search_bookmarks_placeholder() : "Search bookmarks in this book..."}${getShortcutHint(sidebarCommandsNode, "search-bookmarks")}`}
                class="search-input"
                onkeydown={handleSearchKeydown}
                onfocus={() => {
                    isSearchFocused = true
                }}
                onblur={() => {
                    isSearchFocused = false
                }}
            />
            {#if searchQuery}
                <button
                    class="clear-search-btn"
                    onclick={() => {
                        searchQuery = ""
                        searchInputRef?.focus()
                    }}
                    aria-label={m.clear_search_aria ? m.clear_search_aria() : "Clear search"}
                >
                    ×
                </button>
            {/if}
        </div>

        <div class="sidebar-content" bind:this={contentRef}>
            {#if filteredBookmarks.length === 0}
                <div class="no-bookmarks">
                    {m.no_bookmarks ? m.no_bookmarks() : "No bookmarks saved yet"}
                </div>
            {:else}
                <div class="bookmarks-list">
                    {#each filteredBookmarks as bookmark, index (bookmark.id)}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            class="bookmark-card"
                            class:selected={index === selectedIndex}
                            onclick={() => {
                                selectBookmark(bookmark)
                                selectedIndex = index
                            }}
                        >
                            <div class="bookmark-card-header">
                                <span class="bookmark-page">Page {bookmark.pageNumber}</span>
                            </div>
                            <div class="bookmark-text-content">
                                {bookmark.name}
                            </div>
                            <div class="bookmark-card-actions">
                                <button
                                    class="action-btn edit"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        editingBookmarkId = bookmark.id
                                        editingName = bookmark.name
                                    }}
                                    title={m.edit_bookmark ? m.edit_bookmark() : "Rename"}
                                >
                                    <EditIcon width="14" height="14" />
                                </button>
                                <button
                                    class="action-btn delete"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        bookmarkToDeleteId = bookmark.id
                                    }}
                                    title={m.remove_bookmark ? m.remove_bookmark() : "Delete"}
                                >
                                    <TrashIcon width="14" height="14" />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        {#if !uiStore.isCompact}
            <div class="sidebar-footer-hint">
                {#if navigateShortcuts.length > 0}
                    <span class="hint-item">
                        {#each navigateShortcuts as pair, i (pair.display)}
                            {#if i > 0},
                            {/if}<kbd>{pair.display}</kbd>
                        {/each}
                        Navigate
                    </span>
                    <span class="hint-divider">•</span>
                {/if}
                {#if selectShortcut}
                    <span class="hint-item">
                        <kbd>{selectShortcut}</kbd> Go
                    </span>
                    <span class="hint-divider">•</span>
                {/if}
                {#if searchShortcut}
                    <span class="hint-item">
                        <kbd>{searchShortcut}</kbd> Search
                    </span>
                    <span class="hint-divider">•</span>
                {/if}
                {#if editShortcut}
                    <span class="hint-item">
                        <kbd>{editShortcut}</kbd> Edit
                    </span>
                    <span class="hint-divider">•</span>
                {/if}
                {#if deleteShortcut}
                    <span class="hint-item">
                        <kbd>{deleteShortcut}</kbd> Delete
                    </span>
                    <span class="hint-divider">•</span>
                {/if}
                {#if closeShortcuts.length > 0}
                    <span class="hint-item">
                        {#each closeShortcuts as shortcut, i (shortcut)}
                            {#if i > 0}/{/if}<kbd>{shortcut}</kbd>
                        {/each}
                        Close
                    </span>
                {/if}
            </div>
        {/if}

        {#if editingBookmarkId}
            <BookmarkEditKeymaps
                onConfirm={() => handleSaveRename(editingBookmarkId)}
                onCancel={() => (editingBookmarkId = null)}
            />
            <Modal
                onClose={() => (editingBookmarkId = null)}
                title={m.rename_bookmark ? m.rename_bookmark() : "Rename Bookmark"}
                autofocusClose={false}
            >
                <div class="modal-form">
                    <Input
                        id="edit-bookmark-name-input"
                        placeholder={m.bookmark_name_placeholder
                            ? m.bookmark_name_placeholder()
                            : "Bookmark name..."}
                        label={m.rename_bookmark ? m.rename_bookmark() : "Rename Bookmark"}
                        bind:value={editingName}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                handleSaveRename(editingBookmarkId)
                            }
                        }}
                    />
                    <div class="modal-actions">
                        <Button
                            variant="brutalist"
                            onclick={() => handleSaveRename(editingBookmarkId)}
                        >
                            {m.save ? m.save() : "Save"}
                        </Button>
                        <Button variant="ghost" onclick={() => (editingBookmarkId = null)}>
                            {m.cancel ? m.cancel() : "Cancel"}
                        </Button>
                    </div>
                </div>
            </Modal>
        {/if}

        {#if bookmarkToDeleteId}
            <DeleteConfirmModal
                message="Delete this bookmark?"
                onConfirm={async () => {
                    if (bookmarkToDeleteId) {
                        await bookmarksStore.deleteBookmark(bookmarkToDeleteId)
                    }
                    bookmarkToDeleteId = null
                }}
                onCancel={() => {
                    bookmarkToDeleteId = null
                }}
            />
        {/if}
    </div>
{/snippet}

{#if minimal}
    {@render sidebarContent()}
{:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="bookmarks-sidebar"
        transition:slideAndFly={{ duration: settingsStore.animations ? 150 : 0 }}
        onmouseleave={onMouseLeave}
        onclick={(e) => e.stopPropagation()}
    >
        <div class="sidebar-header">
            <h3>{m.bookmarks ? m.bookmarks() : "Bookmarks"}</h3>
            <Button
                variant="close"
                size="small"
                square={true}
                onclick={onClose}
                aria-label={m.close()}
                tooltip={m.close()}
            >
                ×
            </Button>
        </div>

        {@render sidebarContent()}
    </div>
{/if}

<style>
    .bookmarks-sidebar-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .bookmarks-sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 380px;
        background: color-mix(in srgb, var(--surface-color) 85%, transparent);
        backdrop-filter: blur(16px);
        border-right: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: visible;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: color-mix(in srgb, var(--accent-active-color) 85%, transparent);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top));
        padding-left: calc(16px + env(safe-area-inset-left));
        flex-shrink: 0;
        position: relative;
        z-index: 10;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .sidebar-search {
        position: relative;
        padding: 10px 16px;
        background: color-mix(in srgb, var(--accent-active-color) 70%, transparent);
        border-bottom: 3px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
        z-index: 5;
    }

    .search-input {
        width: 100%;
        padding: 6px 32px 6px 12px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .search-input:focus-visible {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-color: var(--border-color);
    }

    .clear-search-btn {
        position: absolute;
        right: 22px;
        background: none;
        border: none;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        color: var(--text-color);
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.1s ease;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        overscroll-behavior: contain;
    }

    .no-bookmarks {
        padding: 24px;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        color: var(--faded-text-color);
        line-height: 1.5;
    }

    .bookmarks-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .bookmark-card {
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        padding: 10px;
        cursor: pointer;
        transition: all 0.15s ease-out;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .bookmark-card:hover {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 var(--shadow-color);
    }

    .bookmark-card.selected {
        background: var(--accent-color);
        border-color: var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
    }

    .bookmark-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        color: var(--faded-text-color);
    }

    .bookmark-card.selected .bookmark-card-header {
        color: var(--text-color);
    }

    .bookmark-page {
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        border: 1px solid var(--border-color);
        padding: 1px 4px;
        border-radius: 2px;
    }

    .bookmark-text-content {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-color);
        line-height: 1.4;
        word-break: break-word;
    }

    .bookmark-card-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 4px;
    }

    .action-btn {
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        padding: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-color);
        transition: all 0.1s ease;
    }

    .action-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .action-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 0 0 0 var(--shadow-color);
    }

    .sidebar-footer-hint {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 6px;
        padding: 10px 8px;
        background: var(--accent-active-color);
        border-top: 3px solid var(--border-color);
        font-size: 9px;
        font-weight: 900;
        color: var(--text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        flex-shrink: 0;
        box-sizing: border-box;
    }

    .sidebar-footer-hint kbd {
        background: var(--surface-color);
        border: 1.5px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        border-radius: 2px;
        padding: 1px 4px;
        font-family: monospace;
        font-weight: 900;
    }

    .modal-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        margin-top: 10px;
        box-sizing: border-box;
        padding: 0 24px 24px 24px;
    }

    .modal-actions {
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 8px;
    }
</style>
