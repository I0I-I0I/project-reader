<script lang="ts">
    import { viewport } from "$lib/shared/state/viewport.svelte"
    import * as m from "$lib/paraglide/messages"
    import { SidebarFooter, SidebarSearch } from "$lib/shared/ui/sidebar"
    import { useCommands, KeyboardHandler, commandsStore } from "$lib/modules/commands"
    import { MediaQuery } from "svelte/reactivity"
    import { modalManager } from "$lib/shared/ui/modal/modalManager.svelte"
    import { resolveSelectionIndex } from "$lib/shared/state/listSelection"
    import { notesStore } from "../stores/notesStore.svelte"
    import TrashIcon from "$lib/shared/icons/TrashIcon.svelte"
    import EditIcon from "$lib/shared/icons/EditIcon.svelte"
    import type { UserNote } from "$lib/modules/documents"
    import {
        executeViewerNoteDelete,
        executeViewerNoteEdit,
    } from "../commands/viewerMutationExecution"
    import { createViewerMutationCommands } from "../commands/viewerMutationCommands"
    import { useViewerUIStore } from "../stores/viewerUIStore.svelte"
    import { createViewerListCommands } from "../commands/viewerListCommands"
    import { withViewerInputShortcut } from "../commands/viewerInputShortcutCommand"
    import { tick } from "svelte"

    const viewerUIStore = useViewerUIStore()

    let { onClose } = $props<{
        onClose: () => void
    }>()

    let searchQuery = $state("")
    let manualSelectedIndex = $state<number | null>(null)
    const phoneQuery = new MediaQuery("(max-width: 480px)")
    let searchInputRef = $state<HTMLInputElement | null>(null)
    let contentRef = $state<HTMLElement | undefined>()
    let isSearchFocused = $state(false)

    let normalizedSearchQuery = $derived(searchQuery.toLowerCase())
    let filteredNotes = $derived(
        notesStore.notes.filter(
            (note) =>
                note.text.toLowerCase().includes(normalizedSearchQuery) ||
                note.noteContent.toLowerCase().includes(normalizedSearchQuery),
        ),
    )

    async function selectNote(note: UserNote) {
        if (note.pageNumber === undefined) return

        notesStore.scrollingToNoteId = note.id
        if (window.innerWidth <= 480) {
            onClose()
            // Commit the closed sidebar before pushState snapshots the current history entry.
            await tick()
        }

        void commandsStore.execute("viewer.page.go-to", {
            page: note.pageNumber,
            isJump: true,
        })
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
            contentRef.querySelector(".note-card.selected")?.scrollIntoView({ block: "nearest" })
        })
    }

    function resetSelection() {
        manualSelectedIndex = null
    }

    function trackSelection(_index: number, _notes: UserNote[]) {
        return (content: HTMLElement) => {
            contentRef = content
            scrollSelectedIntoView()
            return () => {
                if (contentRef === content) contentRef = undefined
            }
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
        modalManager.hasBlockingModal || !!notesStore.editingNote || !!notesStore.activePopup

    function isEditableTarget(target: EventTarget | null) {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        )
    }

    const shouldHandleListNavigation = (event: KeyboardEvent) =>
        !(
            isEditableTarget(event.target) &&
            (KeyboardHandler.matches(event, "j") || KeyboardHandler.matches(event, "k"))
        )

    const shouldHandleMutationKey = (event: KeyboardEvent, inputKey: string) =>
        !isEditableTarget(event.target) ||
        (isSearchFocused && KeyboardHandler.matches(event, inputKey))

    useCommands([
        ...createViewerListCommands({
            nextLabel: () => m.keymap_next_note(),
            // Preserve English search terms in localized keyboard help.
            nextEnglishLabel: () => m.keymap_next_note({}, { locale: "en" }),
            previousLabel: () => m.keymap_prev_note(),
            previousEnglishLabel: () => m.keymap_prev_note({}, { locale: "en" }),
            selectLabel: () => m.keymap_open_note(),
            selectEnglishLabel: () => m.keymap_open_note({}, { locale: "en" }),
            searchLabel: () => m.keymap_search_notes(),
            searchEnglishLabel: () => m.keymap_search_notes({}, { locale: "en" }),
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

    function formatKey(keys: string): string {
        const modifiers = ["ctrl", "meta", "alt", "shift"]
        const parts = keys.split("+")
        parts.sort((a, b) => {
            const aLower = a.toLowerCase().trim()
            const bLower = b.toLowerCase().trim()
            const aIdx = modifiers.indexOf(aLower)
            const bIdx = modifiers.indexOf(bLower)

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

    function triggerEdit(note: UserNote, event: MouseEvent) {
        event.stopPropagation()
        void executeViewerNoteEdit({
            noteId: note.id,
            x: event.clientX,
            y: event.clientY,
        })
    }

    function triggerDelete(note: UserNote, event: MouseEvent) {
        event.stopPropagation()
        void executeViewerNoteDelete({ noteId: note.id })
    }
</script>

<SidebarSearch
    bind:ref={searchInputRef}
    bind:value={searchQuery}
    oninput={resetSelection}
    onClear={resetSelection}
    placeholder={`${m.search_notes_placeholder()} [${searchShortcut}]`}
    onkeydown={handleSearchKeydown}
    onfocus={() => {
        isSearchFocused = true
    }}
    onblur={() => {
        isSearchFocused = false
    }}
    clearLabel={m.clear_search_aria()}
/>

<div class="sidebar-content" {@attach trackSelection(selectedIndex, filteredNotes)}>
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
                    onkeydown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
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
                            onclick={(event) => triggerEdit(note, event)}
                            title="Edit Note"
                        >
                            <EditIcon width="14" height="14" />
                        </button>
                        <button
                            class="action-btn delete"
                            onclick={(event) => triggerDelete(note, event)}
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

{#if !viewport.isCompact}
    <SidebarFooter>
        <span class="hint-item">
            {#each navigateShortcuts as pair, i (pair.display)}
                {#if i > 0},
                {/if}<kbd>{pair.display}</kbd>
            {/each}
            Navigate
        </span>
        <span class="hint-divider">•</span>
        <span class="hint-item">
            <kbd>{selectShortcut}</kbd> Go
        </span>
        <span class="hint-divider">•</span>
        <span class="hint-item">
            <kbd>{searchShortcut}</kbd> Search
        </span>
        <span class="hint-divider">•</span>
        <span class="hint-item">
            <kbd>{editShortcut}</kbd> Edit
        </span>
        <span class="hint-divider">•</span>
        <span class="hint-item">
            <kbd>{deleteShortcut}</kbd> Delete
        </span>
        <span class="hint-divider">•</span>
    </SidebarFooter>
{/if}

<style>
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

    @media (max-width: 640px) {
        .note-card-actions {
            opacity: 1;
        }

        .action-btn {
            padding: 8px;
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
