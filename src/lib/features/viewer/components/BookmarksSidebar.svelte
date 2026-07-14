<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import {
        useCommands,
        KeyboardHandler,
        commandsStore,
        type CommandScope,
    } from "$lib/features/commands/commandsStore.svelte"
    import { onMount } from "svelte"
    import { MediaQuery } from "svelte/reactivity"
    import Button from "$lib/core/components/ui/Button.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { resolveSelectionIndex } from "$lib/core/state/listSelection"
    import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
    import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
    import type { Bookmark } from "$lib/core/vfs/vfsStore.types"
    import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"
    import TrashIcon from "$lib/core/components/icons/TrashIcon.svelte"
    import EditIcon from "$lib/core/components/icons/EditIcon.svelte"
    import Modal from "$lib/core/components/ui/Modal.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import DeleteConfirmModal from "$lib/features/library/components/DeleteConfirmModal.svelte"
    import BookmarkEditKeymaps from "./BookmarkEditKeymaps.svelte"
    import { createViewerMutationCommands } from "$lib/features/viewer/commands/viewerMutationCommands"
    import {
        executeViewerBookmarkDelete,
        executeViewerBookmarkEdit,
    } from "$lib/features/viewer/commands/viewerMutationExecution"
    import { createViewerListCommands } from "$lib/features/viewer/commands/viewerListCommands"
    import { withViewerInputShortcut } from "$lib/features/viewer/commands/viewerInputShortcutCommand"

    let { onClose } = $props<{
        onClose: () => void
    }>()

    let searchQuery = $state("")
    let manualSelectedIndex = $state<number | null>(null)
    const phoneQuery = new MediaQuery("(max-width: 480px)")
    let searchInputRef = $state<HTMLInputElement | null>(null)
    let contentRef = $state<HTMLElement | undefined>()
    let isSearchFocused = $state(false)

    // Inline editing state for items in list
    let editingBookmarkId = $state<string | null>(null)
    let editingName = $state("")
    let bookmarkToDeleteId = $state<string | null>(null)
    let bookmarkEditScope = $state.raw<CommandScope>()

    onMount(() => uiStore.registerModal(() => !!(editingBookmarkId || bookmarkToDeleteId)))

    function focusBookmarkName(input: HTMLInputElement) {
        const frame = requestAnimationFrame(() => {
            input.focus()
            input.select()
        })
        return () => cancelAnimationFrame(frame)
    }

    let currentBook = $derived(viewerStore.getCurrentBook())
    let currentBookId = $derived(currentBook?.id)

    let filteredBookmarks = $derived(
        bookmarksStore.bookmarks
            .filter(
                (b) =>
                    b.bookId === currentBookId &&
                    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .sort((a, b) => a.pageNumber - b.pageNumber),
    )

    function getBookmarkEditPayload(): NonNullable<AppCommandPayloads["viewer.bookmark.edit"]> {
        return {
            bookmarkId: editingBookmarkId ?? undefined,
            name: editingName.trim(),
        }
    }

    function selectBookmark(bookmark: any) {
        if (bookmark.pageNumber !== undefined) {
            void commandsStore.execute("viewer.bookmark.open", { bookmarkId: bookmark.id })
            if (window.innerWidth <= 480) {
                onClose()
            }
        }
    }

    let selectedIndex = $derived(
        resolveSelectionIndex(
            manualSelectedIndex,
            filteredBookmarks.length,
            phoneQuery.current ? -1 : 0,
        ),
    )

    function navigateSelection(direction: "next" | "prev") {
        if (filteredBookmarks.length === 0) return
        manualSelectedIndex =
            direction === "next"
                ? (selectedIndex + 1) % filteredBookmarks.length
                : (selectedIndex - 1 + filteredBookmarks.length) % filteredBookmarks.length
        scrollSelectedIntoView()
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

    function queryChanged() {
        manualSelectedIndex = null
    }

    function trackSelection(_index: number, _bookmarks: Bookmark[]) {
        return (_content: HTMLElement) => {
            scrollSelectedIntoView()
        }
    }

    const applyBookmarkEdit = async (
        payload: { bookmarkId?: string; name?: string } | undefined,
    ) => {
        const bookmarkId = payload?.bookmarkId ?? filteredBookmarks[selectedIndex]?.id
        const bookmark = bookmarksStore.bookmarks.find(({ id }) => id === bookmarkId)
        if (!bookmark) return
        if (payload?.name?.trim()) {
            await bookmarksStore.updateBookmark(bookmark.id, payload.name.trim())
            editingBookmarkId = null
            return
        }
        editingBookmarkId = bookmark.id
        editingName = bookmark.name
    }

    const sidebarMutationCommands = createViewerMutationCommands({
        addBookmark: () => {},
        editBookmark: applyBookmarkEdit,
        deleteBookmark: async (
            payload: { bookmarkId?: string; confirmed?: boolean } | undefined,
        ) => {
            const bookmarkId = payload?.bookmarkId ?? filteredBookmarks[selectedIndex]?.id
            if (!bookmarkId) return
            if (!payload?.confirmed) {
                bookmarkToDeleteId = bookmarkId
                return
            }
            await bookmarksStore.deleteBookmark(bookmarkId)
            bookmarkToDeleteId = null
        },
        addNote: () => {},
        editNote: () => {},
        saveNote: () => {},
        deleteNote: () => {},
    })

    const listCommandsDisabled = () =>
        filteredBookmarks.length === 0 ||
        uiStore.isModalOpen ||
        !!editingBookmarkId ||
        !!bookmarkToDeleteId
    const shouldHandleListNavigation = (event: KeyboardEvent) => {
        const target = event.target
        const isInput =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        return !(
            isInput &&
            (KeyboardHandler.matches(event, "j") || KeyboardHandler.matches(event, "k"))
        )
    }
    const shouldHandleMutationKey = (event: KeyboardEvent, inputKey: string) => {
        const target = event.target
        const isInput =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        return !isInput || (isSearchFocused && KeyboardHandler.matches(event, inputKey))
    }

    useCommands([
        ...createViewerListCommands({
            nextLabel: () => "Next Bookmark",
            previousLabel: () => "Previous Bookmark",
            selectLabel: () => "Jump to Bookmark",
            searchLabel: () => "Search Bookmarks",
            disabled: listCommandsDisabled,
            shouldHandleNavigationKey: shouldHandleListNavigation,
            next: () => navigateSelection("next"),
            previous: () => navigateSelection("prev"),
            select: () => {
                const bookmark = filteredBookmarks[selectedIndex]
                if (bookmark) {
                    selectBookmark(bookmark)
                    onClose()
                }
            },
            search: () => {
                searchInputRef?.focus()
                searchInputRef?.select()
            },
        }),
        withViewerInputShortcut(
            sidebarMutationCommands["viewer.bookmark.edit"]!,
            ["e", "ctrl+e"],
            listCommandsDisabled,
            (event) => shouldHandleMutationKey(event, "ctrl+e"),
        ),
        withViewerInputShortcut(
            sidebarMutationCommands["viewer.bookmark.delete"]!,
            ["d", "ctrl+d"],
            listCommandsDisabled,
            (event) => !bookmarkToDeleteId && shouldHandleMutationKey(event, "ctrl+d"),
        ),
    ])

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

    const navigateShortcuts = [
        { display: `${formatKey("j")}/${formatKey("k")}` },
        { display: `${formatKey("arrowdown")}/${formatKey("arrowup")}` },
        KeyboardHandler.isChromiumNonMac()
            ? { display: `${formatKey("ctrl+j")}/${formatKey("ctrl+k")}` }
            : { display: `${formatKey("ctrl+n")}/${formatKey("ctrl+p")}` },
    ]
    const selectShortcut = formatKey("enter")
    const searchShortcut = formatKey("/")
    let editShortcut = $derived(formatKey(isSearchFocused ? "ctrl+e" : "e"))
    let deleteShortcut = $derived(formatKey(isSearchFocused ? "ctrl+d" : "d"))
</script>

{#snippet sidebarContent()}
    <div class="sidebar-search">
        <Input
            unstyled
            bind:ref={searchInputRef}
            type="text"
            bind:value={searchQuery}
            oninput={queryChanged}
            placeholder={`${m.search_bookmarks_placeholder()} [${searchShortcut}]`}
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
                    queryChanged()
                    searchInputRef?.focus()
                }}
                aria-label={m.clear_search_aria()}
            >
                ×
            </button>
        {/if}
    </div>

    <div
        class="sidebar-content"
        bind:this={contentRef}
        {@attach trackSelection(selectedIndex, filteredBookmarks)}
    >
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
                            manualSelectedIndex = index
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
                                    void executeViewerBookmarkEdit({ bookmarkId: bookmark.id })
                                }}
                                title={m.edit_bookmark()}
                            >
                                <EditIcon width="14" height="14" />
                            </button>
                            <button
                                class="action-btn delete"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    void executeViewerBookmarkDelete({ bookmarkId: bookmark.id })
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
            onConfirm={applyBookmarkEdit}
            getPayload={getBookmarkEditPayload}
            onCancel={() => (editingBookmarkId = null)}
            bind:scope={bookmarkEditScope}
        />
        <Modal
            onClose={() => void bookmarkEditScope?.execute("modal.cancel")}
            title={m.rename_bookmark()}
            autofocusClose={false}
        >
            <div class="modal-form">
                <Input
                    id="edit-bookmark-name-input"
                    attachment={focusBookmarkName}
                    placeholder={m.bookmark_name_placeholder()}
                    label={m.rename_bookmark()}
                    bind:value={editingName}
                    onkeydown={(e) => {
                        if (
                            e.key === "Enter" &&
                            !e.ctrlKey &&
                            !e.metaKey &&
                            !e.altKey &&
                            !e.shiftKey
                        ) {
                            e.preventDefault()
                            void bookmarkEditScope?.execute("viewer.bookmark.edit", {
                                bookmarkId: editingBookmarkId ?? undefined,
                                name: editingName.trim(),
                            })
                        }
                    }}
                />
                <div class="modal-actions">
                    <Button
                        variant="brutalist"
                        onclick={() =>
                            void bookmarkEditScope?.execute("viewer.bookmark.edit", {
                                bookmarkId: editingBookmarkId ?? undefined,
                                name: editingName.trim(),
                            })}
                    >
                        {m.save()}
                    </Button>
                    <Button
                        variant="ghost"
                        onclick={() => void bookmarkEditScope?.execute("modal.cancel")}
                    >
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
                    await executeViewerBookmarkDelete({
                        bookmarkId: bookmarkToDeleteId,
                        confirmed: true,
                    })
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

    .sidebar-search :global(.search-input) {
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

    .sidebar-search :global(.search-input:focus) {
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

        .sidebar-search :global(.search-input) {
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
