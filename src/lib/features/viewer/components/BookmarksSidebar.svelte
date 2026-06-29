<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import {
        useCommands,
        getShortcutHint,
        KeyboardHandler,
    } from "$lib/features/prompt/stores/commandsStore.svelte"
    import { untrack, tick } from "svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
    import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
    import type { Bookmark } from "$lib/core/vfs/vfsStore.types"
    import TrashIcon from "$lib/core/components/icons/TrashIcon.svelte"
    import EditIcon from "$lib/core/components/icons/EditIcon.svelte"
    import Modal from "$lib/core/components/ui/Modal.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import DeleteConfirmModal from "$lib/features/library/components/DeleteConfirmModal.svelte"
    import BookmarkEditKeymaps from "./BookmarkEditKeymaps.svelte"

    let { onClose } = $props<{
        onClose: () => void
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
        return uiStore.registerModal(() => !!(editingBookmarkId || bookmarkToDeleteId))
    })

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
            const isPhone = typeof window !== "undefined" && window.innerWidth <= 480
            if (isPhone) {
                if (selectedIndex === -1) {
                    lastQuery = currentQuery
                } else if (currentQuery !== lastQuery) {
                    lastQuery = currentQuery
                    selectedIndex = -1
                }
            } else {
                if (selectedIndex === -1) {
                    selectedIndex = 0
                    lastQuery = currentQuery
                } else if (currentQuery !== lastQuery) {
                    lastQuery = currentQuery
                    selectedIndex = 0
                }
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

    const sidebarCommandsNode = useCommands([
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
    ])

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
            KeyboardHandler.isChromiumNonMac()
                ? { down: "ctrl+j", up: "ctrl+k" }
                : { down: "ctrl+n", up: "ctrl+p" },
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
</script>

{#snippet sidebarContent()}
    <div class="sidebar-search">
        <input
            bind:this={searchInputRef}
            type="text"
            bind:value={searchQuery}
            placeholder={`${m.search_bookmarks_placeholder()}${getShortcutHint(sidebarCommandsNode, "search-bookmarks")}`}
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
                aria-label={m.clear_search_aria()}
            >
                ×
            </button>
        {/if}
    </div>

    <div class="sidebar-content" bind:this={contentRef}>
        {#if filteredBookmarks.length === 0}
            <div class="no-bookmarks">
                {m.no_bookmarks()}
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
                                title={m.edit_bookmark()}
                            >
                                <EditIcon width="14" height="14" />
                            </button>
                            <button
                                class="action-btn delete"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    bookmarkToDeleteId = bookmark.id
                                }}
                                title={m.remove_bookmark()}
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
        </div>
    {/if}

    {#if editingBookmarkId}
        <BookmarkEditKeymaps
            onConfirm={() => handleSaveRename(editingBookmarkId)}
            onCancel={() => (editingBookmarkId = null)}
        />
        <Modal
            onClose={() => (editingBookmarkId = null)}
            title={m.rename_bookmark()}
            autofocusClose={false}
        >
            <div class="modal-form">
                <Input
                    id="edit-bookmark-name-input"
                    placeholder={m.bookmark_name_placeholder()}
                    label={m.rename_bookmark()}
                    bind:value={editingName}
                    onkeydown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            handleSaveRename(editingBookmarkId)
                        }
                    }}
                />
                <div class="modal-actions">
                    <Button variant="brutalist" onclick={() => handleSaveRename(editingBookmarkId)}>
                        {m.save()}
                    </Button>
                    <Button variant="ghost" onclick={() => (editingBookmarkId = null)}>
                        {m.cancel()}
                    </Button>
                </div>
            </div>
        </Modal>
    {/if}

    {#if bookmarkToDeleteId}
        <DeleteConfirmModal
            message={m.delete_bookmark_confirm()}
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
{/snippet}

{@render sidebarContent()}

<style>
    .sidebar-search {
        position: relative;
        padding: 0;
        background: var(--surface-color);
        border-bottom: 3px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
        z-index: var(--z-5);
    }

    .search-input {
        width: 100%;
        padding: 12px 36px 12px 16px;
        font-family: inherit;
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: none;
        outline: none;
        transition: all 0.15s ease;
        box-sizing: border-box;
    }

    .search-input:focus {
        background: color-mix(in srgb, var(--accent-color) 6%, var(--surface-color));
        box-shadow: inset 4px 0 0 var(--accent-color);
    }

    .clear-search-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: var(--faded-color);
        border: none;
        border-radius: var(--radius-full);
        width: 18px;
        height: 18px;
        font-size: var(--font-size-sm);
        font-weight: 800;
        cursor: pointer;
        color: var(--text-color);
        opacity: 0.6;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        padding: 0;
        line-height: 1;
    }

    @media (hover: hover) {
        .clear-search-btn:hover {
            opacity: 1;
            background: var(--border-color);
            color: var(--surface-color);
        }
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
        font-size: var(--font-size-md);
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
        font-size: var(--font-size-xs);
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
        border-radius: var(--radius-sm);
    }

    .bookmark-text-content {
        font-size: var(--font-size-md);
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
        opacity: 0.7;
        transition: opacity 0.15s ease;
    }

    .bookmark-card:hover .bookmark-card-actions {
        opacity: 1;
    }

    .action-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: var(--text-color);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        transition: all 0.1s ease;
    }

    .action-btn:hover {
        background: var(--accent-color);
        border-color: var(--border-color);
    }

    .action-btn.delete:hover {
        color: #e53935;
        background: rgba(229, 57, 53, 0.1);
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
        font-size: var(--font-size-2xs);
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
        border-radius: var(--radius-sm);
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

    @media (max-width: 640px) {
        .bookmark-card-actions {
            opacity: 1;
        }

        .action-btn {
            padding: 8px;
        }

        .sidebar-search {
            padding: 0;
        }

        .search-input {
            padding: 10px 32px 10px 14px;
        }

        .clear-search-btn {
            right: 10px !important;
        }

        .bookmark-card {
            padding: 14px;
        }
    }

    @media (max-width: 480px) {
        .action-btn :global(svg) {
            width: 16px !important;
            height: 16px !important;
        }
    }
</style>
