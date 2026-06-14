<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import { cubicOut } from "svelte/easing"
    import { useCommands, getShortcutHint } from "$lib/stores/commandsStore.svelte"
    import { untrack } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { notesStore } from "$lib/stores/notesStore.svelte"
    import TrashIcon from "$lib/components/icons/TrashIcon.svelte"
    import EditIcon from "$lib/components/icons/EditIcon.svelte"
    import type { UserNote } from "$lib/stores/vfsStore.types"
    import DeleteConfirmModal from "$lib/components/DeleteConfirmModal.svelte"

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
    let noteToDeleteId = $state<string | null>(null)
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
            if (viewerStore.goToPage) {
                viewerStore.goToPage(note.pageNumber, { isJump: true })
            }
            if (window.innerWidth <= 480) {
                onClose()
            }
        }
    }

    function navigateSelection(direction: "next" | "prev") {
        if (filteredNotes.length === 0) return
        if (direction === "next") {
            selectedIndex = (selectedIndex + 1) % filteredNotes.length
        } else {
            selectedIndex = (selectedIndex - 1 + filteredNotes.length) % filteredNotes.length
        }
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

    let lastQuery = ""

    $effect(() => {
        if (!filteredNotes || filteredNotes.length === 0) return

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
        const __ = filteredNotes.length
        untrack(() => {
            scrollSelectedIntoView()
        })
    })

    const sidebarCommandsNode = useCommands([
        {
            id: "scroll-down",
            keys: "j",
            description: "Next Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                navigateSelection("next")
            },
        },
        {
            id: "scroll-down-alt",
            keys: ["arrowdown", "ctrl+n", "ctrl+j"],
            description: "Next Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                navigateSelection("next")
            },
            allowInInputs: true,
        },
        {
            id: "scroll-up",
            keys: "k",
            description: "Previous Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                navigateSelection("prev")
            },
        },
        {
            id: "scroll-up-alt",
            keys: ["arrowup", "ctrl+p", "ctrl+k"],
            description: "Previous Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                navigateSelection("prev")
            },
            allowInInputs: true,
        },
        {
            id: "select-note",
            keys: "enter",
            description: "Jump to Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                const note = filteredNotes[selectedIndex]
                if (note) {
                    selectNote(note)
                    onClose()
                }
            },
        },
        {
            id: "search-notes",
            keys: "/",
            description: "Search Notes",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                searchInputRef?.focus()
                searchInputRef?.select()
            },
        },
        {
            id: "edit-selected-note",
            keys: "e",
            description: "Edit Selected Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                const note = filteredNotes[selectedIndex]
                if (note) {
                    triggerEditKeyboard(note)
                }
            },
        },
        {
            id: "delete-selected-note",
            keys: "d",
            description: "Delete Selected Note",
            disabled: () => !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                const note = filteredNotes[selectedIndex]
                if (note) {
                    triggerDeleteKeyboard(note)
                }
            },
        },
        {
            id: "edit-selected-note-input",
            keys: "ctrl+e",
            description: "Edit Selected Note",
            disabled: () =>
                !isSearchFocused || !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                const note = filteredNotes[selectedIndex]
                if (note) {
                    triggerEditKeyboard(note)
                }
            },
            allowInInputs: true,
        },
        {
            id: "delete-selected-note-input",
            keys: "ctrl+d",
            description: "Delete Selected Note",
            disabled: () =>
                !isSearchFocused || !!notesStore.editingNote || !!notesStore.activePopup,
            action: (event) => {
                event.preventDefault()
                const note = filteredNotes[selectedIndex]
                if (note) {
                    triggerDeleteKeyboard(note)
                }
            },
            allowInInputs: true,
        },
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

    let selectShortcut = $derived.by(() => {
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "select-note" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let searchShortcut = $derived.by(() => {
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "search-notes" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let editShortcut = $derived.by(() => {
        if (isSearchFocused) {
            return formatKey("ctrl+e")
        }
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "edit-selected-note" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let deleteShortcut = $derived.by(() => {
        if (isSearchFocused) {
            return formatKey("ctrl+d")
        }
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "delete-selected-note" && c.keys)
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

    function formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
        })
    }

    function triggerEdit(note: UserNote, e: MouseEvent) {
        e.stopPropagation()
        notesStore.editingNote = note
        notesStore.editorCoords = { x: e.clientX, y: e.clientY }
    }

    function triggerDelete(note: UserNote, e: MouseEvent) {
        e.stopPropagation()
        noteToDeleteId = note.id
    }

    function triggerEditKeyboard(note: UserNote) {
        notesStore.editingNote = note
        notesStore.editorCoords = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    }

    function triggerDeleteKeyboard(note: UserNote) {
        noteToDeleteId = note.id
    }
</script>

{#snippet sidebarContent()}
    <div class="sidebar-search">
        <input
            bind:this={searchInputRef}
            type="text"
            bind:value={searchQuery}
            placeholder={`${m.search_notes_placeholder()}${getShortcutHint(sidebarCommandsNode, "search-notes")}`}
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
        {#if notesStore.notes.length === 0}
            <div class="no-notes">
                {m.no_notes()}
            </div>
        {:else if filteredNotes.length === 0}
            <div class="no-notes">{m.no_matching_notes()}</div>
        {:else}
            <div class="notes-list">
                {#each filteredNotes as note, index (note.id)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="note-card color-{note.color}"
                        class:selected={index === selectedIndex}
                        onclick={() => {
                            selectNote(note)
                            selectedIndex = index
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

    {#if noteToDeleteId}
        <DeleteConfirmModal
            message="Delete this highlight and note?"
            onConfirm={() => {
                if (noteToDeleteId) {
                    notesStore.deleteNote(noteToDeleteId)
                }
                noteToDeleteId = null
            }}
            onCancel={() => {
                noteToDeleteId = null
            }}
        />
    {/if}
{/snippet}

{#if minimal}
    {@render sidebarContent()}
{:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="notes-sidebar"
        transition:slideAndFly={{ duration: settingsStore.animations ? 150 : 0 }}
        onmouseleave={onMouseLeave}
        onclick={(e) => e.stopPropagation()}
    >
        <div class="sidebar-header">
            <h3>Notes & Highlights</h3>
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
    .notes-sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 320px;
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
        background: transparent;
        overscroll-behavior: contain;
    }

    .no-notes {
        padding: 24px;
        text-align: center;
        font-size: 13px;
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
        font-size: 10px;
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
        border-radius: 2px;
    }

    .note-highlight {
        margin: 0;
        font-style: italic;
        font-size: 11px;
        color: var(--text-color);
        background: rgba(0, 0, 0, 0.03);
        padding: 4px 8px;
        border-left: 2px solid var(--border-color);
        max-height: 120px;
        overflow-y: auto;
        word-break: break-word;
    }

    .note-text-content {
        font-size: 12px;
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
        border-radius: 2px;
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

    .hint-divider {
        opacity: 0.5;
    }

    .hint-item {
        line-height: 1.5;
    }

    @media (max-width: 640px) {
        .notes-sidebar {
            width: 100%;
            border-right: none;
        }

        .note-card-actions {
            opacity: 1;
        }

        .action-btn {
            padding: 8px;
        }

        .sidebar-search {
            padding: 6px 12px;
        }

        .search-input {
            padding: 6px 28px 6px 10px;
            font-size: 14px;
        }

        .clear-search-btn {
            right: 18px;
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
