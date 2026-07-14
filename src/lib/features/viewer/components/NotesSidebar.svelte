<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Input from "$lib/core/components/ui/Input.svelte"
    import {
        useCommands,
        KeyboardHandler,
        commandsStore,
    } from "$lib/features/commands/commandsStore.svelte"
    import { MediaQuery } from "svelte/reactivity"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { resolveSelectionIndex } from "$lib/core/state/listSelection"
    import { notesStore } from "$lib/features/viewer/stores/notesStore.svelte"
    import TrashIcon from "$lib/core/components/icons/TrashIcon.svelte"
    import EditIcon from "$lib/core/components/icons/EditIcon.svelte"
    import type { UserNote } from "$lib/core/vfs/vfsStore.types"
    import {
        executeViewerNoteDelete,
        executeViewerNoteEdit,
    } from "$lib/features/viewer/commands/viewerMutationExecution"
    import { createViewerMutationCommands } from "$lib/features/viewer/commands/viewerMutationCommands"
    import { viewerUIStore } from "$lib/features/viewer/stores/viewerUIStore.svelte"
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

    let filteredNotes = $derived(
        notesStore.notes.filter(
            (n) =>
                n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.noteContent.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )

    function selectNote(note: UserNote) {
        if (note.pageNumber !== undefined) {
            notesStore.scrollingToNoteId = note.id
            void commandsStore.execute("viewer.page.go-to", {
                page: note.pageNumber,
                isJump: true,
            })
            if (window.innerWidth <= 480) {
                onClose()
            }
        }
    }

    let selectedIndex = $derived(
        resolveSelectionIndex(
            manualSelectedIndex,
            filteredNotes.length,
            phoneQuery.current ? -1 : 0,
        ),
    )

    function navigateSelection(direction: "next" | "prev") {
        if (filteredNotes.length === 0) return
        manualSelectedIndex =
            direction === "next"
                ? (selectedIndex + 1) % filteredNotes.length
                : (selectedIndex - 1 + filteredNotes.length) % filteredNotes.length
        scrollSelectedIntoView()
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault()
            const note = filteredNotes[selectedIndex]
            if (note) {
                selectNote(note)
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
            const selectedEl = contentRef.querySelector(".note-card.selected")
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: "nearest" })
            }
        })
    }

    function queryChanged() {
        manualSelectedIndex = null
    }

    function trackSelection(_index: number, _notes: UserNote[]) {
        return (_content: HTMLElement) => {
            scrollSelectedIntoView()
        }
    }

    const sidebarMutationCommands = createViewerMutationCommands({
        addBookmark: () => {},
        editBookmark: () => {},
        deleteBookmark: () => {},
        addNote: () => {},
        editNote: (payload: { noteId?: string; x?: number; y?: number } | undefined) => {
            const noteId = payload?.noteId ?? filteredNotes[selectedIndex]?.id
            const note = notesStore.notes.find(({ id }) => id === noteId)
            if (!note) return
            notesStore.editingNote = note
            notesStore.editorCoords = {
                x: payload?.x ?? window.innerWidth / 2,
                y: payload?.y ?? window.innerHeight / 2,
            }
        },
        saveNote: () => {},
        deleteNote: async (payload: { noteId?: string; confirmed?: boolean } | undefined) => {
            const noteId = payload?.noteId ?? filteredNotes[selectedIndex]?.id
            if (!noteId) return
            if (!payload?.confirmed) {
                viewerUIStore.noteToDeleteId = noteId
                return
            }
            await notesStore.deleteNote(noteId)
            viewerUIStore.noteToDeleteId = null
        },
    })

    const listCommandsDisabled = () =>
        uiStore.isModalOpen || !!notesStore.editingNote || !!notesStore.activePopup
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
            nextLabel: () => "Next Note",
            previousLabel: () => "Previous Note",
            selectLabel: () => "Jump to Note",
            searchLabel: () => "Search Notes",
            disabled: listCommandsDisabled,
            shouldHandleNavigationKey: shouldHandleListNavigation,
            next: () => navigateSelection("next"),
            previous: () => navigateSelection("prev"),
            select: () => {
                const note = filteredNotes[selectedIndex]
                if (note) {
                    selectNote(note)
                    onClose()
                }
            },
            search: () => {
                searchInputRef?.focus()
                searchInputRef?.select()
            },
        }),
        withViewerInputShortcut(
            sidebarMutationCommands["viewer.note.edit"]!,
            ["e", "ctrl+e"],
            listCommandsDisabled,
            (event) => shouldHandleMutationKey(event, "ctrl+e"),
        ),
        withViewerInputShortcut(
            sidebarMutationCommands["viewer.note.delete"]!,
            ["d", "ctrl+d"],
            listCommandsDisabled,
            (event) => shouldHandleMutationKey(event, "ctrl+d"),
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

    function formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
        })
    }

    function triggerEdit(note: UserNote, e: MouseEvent) {
        e.stopPropagation()
        void executeViewerNoteEdit({ noteId: note.id, x: e.clientX, y: e.clientY })
    }

    function triggerDelete(note: UserNote, e: MouseEvent) {
        e.stopPropagation()
        void executeViewerNoteDelete({ noteId: note.id })
    }
</script>

{#snippet sidebarContent()}
    <div class="sidebar-search">
        <Input
            unstyled
            bind:ref={searchInputRef}
            type="text"
            bind:value={searchQuery}
            oninput={queryChanged}
            placeholder={`${m.search_notes_placeholder()} [${searchShortcut}]`}
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
        {@attach trackSelection(selectedIndex, filteredNotes)}
    >
        {#if notesStore.notes.length === 0}
            <div class="no-notes">
                {m.no_notes()}
            </div>
        {:else if filteredNotes.length === 0}
            <div class="no-notes">{m.no_matching_notes()}</div>
        {:else}
            <div class="notes-list">
                {#each filteredNotes as note, index (note.id)}
                    <div
                        class="note-card color-{note.color}"
                        class:selected={index === selectedIndex}
                        role="button"
                        tabindex="0"
                        onclick={() => {
                            selectNote(note)
                            manualSelectedIndex = index
                        }}
                        onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                selectNote(note)
                                manualSelectedIndex = index
                            }
                        }}
                    >
                        <div class="note-card-header">
                            <span class="note-page">Page {note.pageNumber}</span>
                            <span class="note-date">{formatTimestamp(note.createdAt)}</span>
                        </div>

                        <blockquote class="note-highlight">
                            "{note.text}"
                        </blockquote>

                        {#if note.noteContent}
                            <div class="note-text-content">
                                {note.noteContent}
                            </div>
                        {/if}

                        <div class="note-card-actions">
                            <button
                                class="action-btn edit"
                                onclick={(e) => triggerEdit(note, e)}
                                title="Edit Note"
                            >
                                <EditIcon width="14" height="14" />
                            </button>
                            <button
                                class="action-btn delete"
                                onclick={(e) => triggerDelete(note, e)}
                                title="Delete Highlight"
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
        background: transparent;
        overscroll-behavior: contain;
    }

    .no-notes {
        padding: 24px;
        text-align: center;
        font-size: var(--font-size-md);
        font-weight: 700;
        color: var(--faded-text-color);
        line-height: 1.5;
    }

    .notes-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .note-card {
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        padding: 10px;
        cursor: pointer;
        transition: all 0.15s ease-out;
        border-left-width: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .note-card:hover {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 var(--shadow-color);
    }

    .note-card.selected {
        background: var(--accent-color);
        border-color: var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
    }

    /* Colors mapped */
    .note-card.color-yellow {
        border-left-color: rgb(255, 235, 59);
    }
    .note-card.color-green {
        border-left-color: rgb(76, 175, 80);
    }
    .note-card.color-blue {
        border-left-color: rgb(33, 150, 243);
    }
    .note-card.color-pink {
        border-left-color: rgb(233, 30, 99);
    }
    .note-card.color-purple {
        border-left-color: rgb(156, 39, 176);
    }

    .note-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--font-size-xs);
        font-weight: 900;
        text-transform: uppercase;
        color: var(--faded-text-color);
    }

    .note-card.selected .note-card-header {
        color: var(--text-color);
    }

    .note-page {
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        border: 1px solid var(--border-color);
        padding: 1px 4px;
        border-radius: var(--radius-sm);
    }

    .note-highlight {
        margin: 0;
        font-style: italic;
        font-size: var(--font-size-sm);
        color: var(--text-color);
        background: rgba(0, 0, 0, 0.03);
        padding: 4px 8px;
        border-left: 2px solid var(--border-color);
        max-height: 120px;
        overflow-y: auto;
        word-break: break-word;
    }

    .note-text-content {
        font-size: var(--font-size-base);
        font-weight: 700;
        color: var(--text-color);
        line-height: 1.4;
        word-break: break-word;
    }

    .note-card-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        opacity: 0.7;
        transition: opacity 0.15s ease;
    }

    .note-card:hover .note-card-actions {
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

    .hint-divider {
        opacity: 0.5;
    }

    .hint-item {
        line-height: 1.5;
    }

    @media (max-width: 640px) {
        .note-card-actions {
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

        .note-card {
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
