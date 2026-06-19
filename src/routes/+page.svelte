<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Header from "$lib/components/Header.svelte"
    import BookImporter from "$lib/components/BookImporter.svelte"
    import BookIcon from "$lib/components/icons/BookIcon.svelte"
    import TerminalIcon from "$lib/components/icons/TerminalIcon.svelte"
    import Breadcrumbs from "$lib/components/ui/Breadcrumbs.svelte"
    import TrashIcon from "$lib/components/icons/TrashIcon.svelte"
    import NavigationIcon from "$lib/components/icons/NavigationIcon.svelte"
    import CheckIcon from "$lib/components/icons/CheckIcon.svelte"
    import MinusIcon from "$lib/components/icons/MinusIcon.svelte"
    import Button from "$lib/components/ui/Button.svelte"

    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import Card from "$lib/components/Card.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import Folder from "$lib/components/Folder.svelte"
    import NewFolderModal from "$lib/components/NewFolderModal.svelte"
    import DeleteConfirmModal from "$lib/components/DeleteConfirmModal.svelte"
    import EditBookMetadataModal from "$lib/components/EditBookMetadataModal.svelte"
    import RelinkModal from "$lib/components/RelinkModal.svelte"
    import { useCommands } from "$lib/stores/commandsStore.svelte"
    import { page } from "$app/state"
    import { goto } from "$app/navigation"
    import { localizedPath } from "$lib/language"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { fileNodeToBook } from "$lib/stores/viewerStore.types"
    import type { FileNode, VFSNode } from "$lib/stores/vfsStore.types"
    import PickerModeKeymaps from "$lib/components/PickerModeKeymaps.svelte"
    import PickerKey from "$lib/components/PickerKey.svelte"
    import { PICKER_KEYS, generateHints } from "$lib/constants"
    import { untrack, tick } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"

    let pickingMode = $state<"startSelection" | "openFileFolder" | "focusCard">("openFileFolder")

    const currentNodes = $derived(vfsStore.sortedCurrentNodes)

    let pickerKeyBuffer = $state("")
    const currentHints = $derived(generateHints(currentNodes.length, PICKER_KEYS))

    $effect(() => {
        if (!vfsStore.initialized) return

        const folderParam = page.url.searchParams.get("folder")
        let resolvedId: string | null = null
        if (folderParam) {
            if (folderParam.startsWith("/")) {
                resolvedId = vfsStore.getFolderIdByPath(folderParam)
            } else {
                const node = vfsStore.nodes[folderParam]
                if (node && node.type === "folder") {
                    resolvedId = folderParam
                } else {
                    resolvedId = vfsStore.getFolderIdByPath(folderParam)
                }
            }
        }

        if (vfsStore.currentFolderId !== resolvedId) {
            vfsStore.currentFolderId = resolvedId
        }
    })

    let breadcrumbs = $derived.by(() => {
        const segments: Array<{ name: string; id: string | null }> = [
            { name: m.library(), id: null },
        ]
        let currentId = vfsStore.currentFolderId
        const pathNodes: any[] = []
        while (currentId !== null) {
            const node = vfsStore.nodes[currentId]
            if (node && node.type === "folder") {
                pathNodes.unshift(node)
                currentId = node.parentId
            } else {
                break
            }
        }
        for (const node of pathNodes) {
            segments.push({ name: node.name, id: node.id })
        }
        return segments
    })

    const allSelected = $derived(
        currentNodes.length > 0 && currentNodes.every((node) => vfsStore.selectedIds.has(node.id)),
    )

    async function handleBulkDelete() {
        const ids = [...vfsStore.selectedIds]
        if (ids.length === 0) return
        uiStore.nodesToDeleteIds = ids
        uiStore.isDeleteModalOpen = true
    }

    async function handleNodeClick(e: MouseEvent | KeyboardEvent | null, node: VFSNode) {
        const isEnter = e && e instanceof KeyboardEvent && e.key === "Enter"
        if (!isEnter && (uiStore.isSelectionMode || e?.metaKey || e?.ctrlKey)) {
            uiStore.isSelectionMode = true
            vfsStore.toggleSelection(node.id)
            return
        }

        vfsStore.clearForwardHistory()
        if (node.type === "folder") {
            const path = vfsStore.getFolderPath(node.id)
            goto(localizedPath("/") + `?folder=${encodeURIComponent(path)}`)
        } else {
            try {
                let fileNode = node as FileNode
                const isLocked = vfsStore.isLockedMap[fileNode.id]

                if (isLocked) {
                    await vfsStore.restoreFileAccess(fileNode.id)
                }

                // setCurrentBook will handle fetching the full URL lazily
                await viewerStore.setCurrentBook(fileNodeToBook(fileNode))
                goto(localizedPath("/viewer"))
            } catch (err) {
                console.error("[+page] Failed to open book:", err)
                uiStore.relinkNodeId = node.id
                uiStore.isRelinkModalOpen = true
            }
        }
    }

    function handlePickerSelect(node: VFSNode) {
        if (pickingMode === "startSelection") {
            uiStore.isSelectionMode = true
            vfsStore.toggleSelection(node.id)
        } else if (pickingMode === "openFileFolder") {
            handleNodeClick(null as any, node)
            uiStore.isPickingMode = false
        } else if (pickingMode === "focusCard") {
            tick().then(() => {
                const el = document.querySelector(
                    `.card[data-id="${node.id}"]`,
                ) as HTMLElement | null
                if (el) {
                    el.focus()
                    lastFocusedCardId = node.id
                }
            })
            uiStore.isPickingMode = false
        }
    }

    function navigateGrid(direction: "up" | "down" | "left" | "right", event?: KeyboardEvent) {
        const cards = Array.from(
            document.querySelectorAll(".card_list.grid .card:not(:disabled)"),
        ) as HTMLElement[]
        if (cards.length === 0) return

        const activeEl = document.activeElement as HTMLElement | null
        let currentIndex = -1
        if (activeEl) {
            currentIndex = cards.indexOf(activeEl)
            if (currentIndex === -1) {
                const cardAncestor = activeEl.closest(".card") as HTMLElement | null
                if (cardAncestor) {
                    currentIndex = cards.indexOf(cardAncestor)
                }
            }
        }

        // Helper to check if a card is currently visible in the viewport
        const isCardVisible = (card: HTMLElement) => {
            const rect = card.getBoundingClientRect()
            return rect.bottom > 0 && rect.top < window.innerHeight
        }

        // If the focused card is scrolled out of view, treat it as if we have no focus.
        if (currentIndex !== -1 && !isCardVisible(cards[currentIndex])) {
            currentIndex = -1
        }

        // If no active element is a visible card, try the lastFocusedCardId ONLY if it is still visible.
        if (currentIndex === -1 && lastFocusedCardId) {
            const lastFocusedEl = cards.find((c) => c.getAttribute("data-id") === lastFocusedCardId)
            if (lastFocusedEl && isCardVisible(lastFocusedEl)) {
                currentIndex = cards.indexOf(lastFocusedEl)
            }
        }

        let nextIndex = currentIndex

        if (currentIndex === -1) {
            // Find all cards currently visible in the viewport
            const visibleIndices = cards
                .map((card, index) => ({ card, index }))
                .filter(({ card }) => isCardVisible(card))
                .map(({ index }) => index)

            if (visibleIndices.length > 0) {
                if (direction === "left" || direction === "up") {
                    // Focus the last visible card on screen when going backward
                    nextIndex = visibleIndices[visibleIndices.length - 1]
                } else {
                    // Focus the first visible card on screen when going forward
                    nextIndex = visibleIndices[0]
                }
            } else {
                // Fallback to absolute boundaries if absolutely nothing is visible
                if (direction === "left" || direction === "up") {
                    nextIndex = cards.length - 1
                } else {
                    nextIndex = 0
                }
            }
        } else {
            const cols = getGridColumns(cards)
            if (direction === "left") {
                nextIndex = currentIndex - 1
                if (nextIndex < 0) {
                    nextIndex = 0
                }
            } else if (direction === "right") {
                nextIndex = currentIndex + 1
                if (nextIndex >= cards.length) {
                    nextIndex = cards.length - 1
                }
            } else if (direction === "up") {
                nextIndex = currentIndex - cols
                if (nextIndex < 0) {
                    nextIndex = currentIndex
                }
            } else if (direction === "down") {
                nextIndex = currentIndex + cols
                if (nextIndex >= cards.length) {
                    const totalRows = Math.ceil(cards.length / cols)
                    const currentRow = Math.floor(currentIndex / cols)
                    if (currentRow < totalRows - 1) {
                        nextIndex = cards.length - 1
                    } else {
                        nextIndex = currentIndex
                    }
                }
            }
        }

        if (cards[nextIndex]) {
            cards[nextIndex].focus({ preventScroll: true })
            const isRepeat = event?.repeat || false
            const behavior = !isRepeat && settingsStore.animations ? "smooth" : "auto"
            cards[nextIndex].scrollIntoView({ block: "nearest", behavior })
        }
    }

    function getGridColumns(cards: HTMLElement[]): number {
        if (cards.length <= 1) return 1
        const firstTop = cards[0].getBoundingClientRect().top
        for (let i = 1; i < cards.length; i++) {
            // Use a tolerance of 20px because focused cards shift by 4px via CSS transform (translate(-4px, -4px)).
            if (Math.abs(cards[i].getBoundingClientRect().top - firstTop) > 20) {
                return i
            }
        }
        return cards.length
    }

    useCommands([
        {
            id: "grid-select-next",
            keys: ["j", "arrowdown"],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                navigateGrid("down", event)
            },
            description: m.keymap_grid_select_down(),
            englishDescription: "Select item below",
            category: "navigation",
            disabled: () => uiStore.isPickingMode,
        },
        {
            id: "grid-select-prev",
            keys: ["k", "arrowup"],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                navigateGrid("up", event)
            },
            description: m.keymap_grid_select_up(),
            englishDescription: "Select item above",
            category: "navigation",
            disabled: () => uiStore.isPickingMode,
        },
        {
            id: "grid-select-left",
            keys: ["h", "arrowleft"],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                navigateGrid("left", event)
            },
            description: m.keymap_grid_select_left(),
            englishDescription: "Select item left",
            category: "navigation",
            disabled: () => uiStore.isPickingMode,
        },
        {
            id: "grid-select-right",
            keys: ["l", "arrowright"],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                navigateGrid("right", event)
            },
            description: m.keymap_grid_select_right(),
            englishDescription: "Select item right",
            category: "navigation",
            disabled: () => uiStore.isPickingMode,
        },
        {
            id: "open-file-recursive",
            keys: "o",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "files-recursive"
                uiStore.prompt.isOpen = true
            },
            description: m.keymap_open_books_recursive(),
            englishDescription: m.keymap_open_books_recursive({}, { locale: "en" }),
            category: "menu",
        },
        {
            id: "go-to-folder",
            keys: "g",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "folders"
                uiStore.prompt.isOpen = true
            },
            description: m.keymap_go_to_folder(),
            englishDescription: m.keymap_go_to_folder({}, { locale: "en" }),
            category: "menu",
        },
        {
            id: "toggle-select-all-or-new-folder",
            keys: "shift+a",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                if (uiStore.isSelectionMode) {
                    if (allSelected) {
                        vfsStore.clearSelection()
                    } else {
                        vfsStore.selectAll(currentNodes.map((n) => n.id))
                    }
                } else {
                    uiStore.isNewFolderModalOpen = true
                }
            },
            get description() {
                return uiStore.isSelectionMode ? m.select_all() : m.new_folder()
            },
            get englishDescription() {
                return uiStore.isSelectionMode ? "Select all" : m.new_folder({}, { locale: "en" })
            },
            subtitle: () => {
                if (uiStore.isSelectionMode) {
                    return allSelected ? m.deselect_all() : m.select_all()
                }
                return m.new_folder()
            },
            category: "commands",
        },
        {
            id: "pick-file-to-open",
            keys: "f",
            action: () => {
                if (!uiStore.isSelectionMode) {
                    pickingMode = "openFileFolder"
                }
                pickerKeyBuffer = ""
                uiStore.isPickingMode = true
            },
            description: m.pick_file_to_open(),
            englishDescription: m.pick_file_to_open({}, { locale: "en" }),
            category: "commands",
        },
        {
            id: "pick-file-to-focus",
            keys: "v",
            action: () => {
                pickingMode = "focusCard"
                pickerKeyBuffer = ""
                uiStore.isPickingMode = true
            },
            description: m.pick_file_to_focus(),
            englishDescription: m.pick_file_to_focus({}, { locale: "en" }),
            category: "commands",
        },
        {
            id: "pick-file-to-open-start-selection",
            keys: "s",
            action: () => {
                pickingMode = "startSelection"
                pickerKeyBuffer = ""
                uiStore.isPickingMode = true
            },
            description: m.pick_file_to_open(),
            englishDescription: m.pick_file_to_open({}, { locale: "en" }),
            category: "commands",
        },
        {
            id: "go-up-folder",
            keys: "-",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                if (vfsStore.currentFolderId !== null) {
                    const currentFolder = vfsStore.nodes[vfsStore.currentFolderId]
                    if (currentFolder) {
                        const parentId = currentFolder.parentId
                        if (parentId) {
                            const path = vfsStore.getFolderPath(parentId)
                            goto(localizedPath("/") + `?folder=${encodeURIComponent(path)}`)
                        } else {
                            goto(localizedPath("/"))
                        }
                    }
                }
            },
            description: m.keymap_up_folder(),
            englishDescription: m.keymap_up_folder({}, { locale: "en" }),
            category: "navigation",
        },
        {
            id: "continue-reading",
            keys: "shift+c",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                const currentBook = viewerStore.getCurrentBook()
                if (currentBook) {
                    goto(localizedPath("/viewer"))
                }
            },
            description: m.keymap_continue_reading(),
            englishDescription: m.keymap_continue_reading({}, { locale: "en" }),
            category: "navigation",
            disabled: () => !viewerStore.getCurrentBook() || uiStore.isPickingMode,
        },
        {
            id: "exit-selection-mode",
            keys: ["escape", "ctrl+c", "ctrl+["],
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                if (uiStore.isPickingMode) {
                    uiStore.isPickingMode = false
                    return
                }
                uiStore.isSelectionMode = false
                vfsStore.clearSelection()
            },
            allowInInputs: true,
            description: m.keymap_exit_selection_mode(),
            category: "commands",
            disabled: () => !uiStore.isSelectionMode,
        },
        {
            id: "close-alt",
            keys: "q",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.isSelectionMode = false
                vfsStore.clearSelection()
            },
            description: m.keymap_exit_selection_mode(),
            allowInInputs: false,
            disabled: () => !uiStore.isSelectionMode,
        },
        {
            id: "move-selected",
            keys: "shift+m",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                if (vfsStore.selectedIds.size > 0) {
                    uiStore.nodeToMoveId = null
                    uiStore.prompt.mode = "move"
                    uiStore.prompt.isOpen = true
                }
            },
            description: m.move(),
            category: "commands",
            disabled: () => !uiStore.isSelectionMode,
        },
        {
            id: "delete-selected-shortcut",
            keys: "shift+d",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                handleBulkDelete()
            },
            description: m.delete_selected(),
            category: "commands",
            disabled: () => !uiStore.isSelectionMode,
        },
    ])

    let lastFocusedCardId = $state<string | null>(null)

    function handleCardFocus(e: FocusEvent) {
        const card = (e.target as HTMLElement).closest(".card") as HTMLElement | null
        if (card) {
            const id = card.getAttribute("data-id")
            if (id) {
                lastFocusedCardId = id
            }
        }
    }

    async function restoreCardFocus() {
        if (!lastFocusedCardId) return
        await tick()
        const card = document.querySelector(
            `.card[data-id="${lastFocusedCardId}"]`,
        ) as HTMLElement | null
        if (card) {
            card.focus()
        } else {
            // Fallback: if the card is gone (e.g. deleted), focus the first card in the list
            const firstCard = document.querySelector(
                ".card_list.grid .card:not(:disabled)",
            ) as HTMLElement | null
            if (firstCard) {
                firstCard.focus()
            }
        }
    }

    let wasModalOpen = false
    $effect(() => {
        const isModalOpen = uiStore.isModalOpen
        if (!isModalOpen && wasModalOpen) {
            restoreCardFocus()
        }
        wasModalOpen = isModalOpen
    })

    $effect(() => {
        const _ = vfsStore.currentFolderId
        untrack(() => {
            uiStore.isSelectionMode = false
            uiStore.isPickingMode = false
            vfsStore.clearSelection()
            pickerKeyBuffer = ""
            lastFocusedCardId = null
        })
    })

    $effect(() => {
        if (uiStore.isSelectionMode && vfsStore.selectedIds.size === 0) {
            untrack(() => {
                uiStore.isSelectionMode = false
            })
        }
    })

    $effect(() => {
        if (!uiStore.isPickingMode) {
            untrack(() => {
                pickerKeyBuffer = ""
            })
        }
    })
</script>

<div class="container">
    <Header />
    <Breadcrumbs {breadcrumbs} />

    {#if uiStore.isNewFolderModalOpen}
        <NewFolderModal
            onCreate={(name) => vfsStore.createFolder(name, vfsStore.currentFolderId)}
        />
    {/if}

    {#if uiStore.isDeleteModalOpen}
        <DeleteConfirmModal
            message={uiStore.nodesToDeleteIds.length > 1
                ? m.delete_confirmation_multiple({ count: uiStore.nodesToDeleteIds.length })
                : m.delete_confirmation_single()}
            onConfirm={async () => {
                const ids = [...uiStore.nodesToDeleteIds]
                uiStore.isDeleteModalOpen = false
                for (const id of ids) {
                    await vfsStore.deleteNode(id)
                }
                uiStore.nodesToDeleteIds = []
                if (uiStore.isSelectionMode && vfsStore.selectedIds.size === 0) {
                    uiStore.isSelectionMode = false
                }
            }}
            onCancel={() => {
                uiStore.isDeleteModalOpen = false
                uiStore.nodesToDeleteIds = []
            }}
        />
    {/if}

    {#if uiStore.isEditMetadataModalOpen && uiStore.nodeToEditMetadataId}
        <EditBookMetadataModal nodeId={uiStore.nodeToEditMetadataId} />
    {/if}

    {#if uiStore.isRelinkModalOpen && uiStore.relinkNodeId}
        <RelinkModal />
    {/if}

    {#if uiStore.isPickingMode}
        <PickerModeKeymaps
            {currentNodes}
            {currentHints}
            bind:keyBuffer={pickerKeyBuffer}
            onSelect={handlePickerSelect}
        />
    {/if}

    <main class:selection-mode={uiStore.isSelectionMode} onfocusin={handleCardFocus}>
        {#if currentNodes.length !== 0 || vfsStore.currentFolderId !== null || vfsStore.uploadingFiles.some((f) => f.parentId === vfsStore.currentFolderId)}
            <ul class="card_list grid">
                <li class="card_item">
                    <Folder class="card_inner" type="new-folder" />
                </li>
                {#each currentNodes as node, idx (node.id)}
                    <li class="card_item">
                        <Card
                            class="card_inner"
                            {node}
                            data-id={node.id}
                            Icon={BookIcon}
                            onclick={(e) => handleNodeClick(e, node)}
                        />
                        {#if uiStore.isPickingMode}
                            {@const hint = currentHints[idx]}
                            {#if hint && hint.startsWith(pickerKeyBuffer)}
                                <PickerKey
                                    onSelect={() => handlePickerSelect(node)}
                                    keyChar={hint.slice(pickerKeyBuffer.length)}
                                />
                            {/if}
                        {/if}
                    </li>
                {/each}
                {#each vfsStore.uploadingFiles.filter((f) => f.parentId === vfsStore.currentFolderId) as uploading (uploading.id)}
                    <li class="card_item">
                        <Card class="card_inner" isPlaceholder={true} name={uploading.name} />
                    </li>
                {/each}
                <li class="card_item">
                    <BookImporter class="card_inner" variant="card" />
                </li>
            </ul>
        {:else}
            <BookImporter />
        {/if}
    </main>

    {#if uiStore.isSelectionMode}
        <div class="selection-bar">
            <div class="selection-actions">
                <Button
                    variant="brutalist"
                    size="small"
                    Icon={allSelected ? MinusIcon : CheckIcon}
                    onclick={() => {
                        if (allSelected) {
                            vfsStore.clearSelection()
                        } else {
                            vfsStore.selectAll(currentNodes.map((n) => n.id))
                        }
                    }}
                >
                    <span>{allSelected ? m.deselect_all() : m.select_all()}</span>
                </Button>
                <Button
                    variant="brutalist"
                    size="small"
                    onclick={() => {
                        uiStore.nodeToMoveId = null
                        uiStore.prompt.mode = "move"
                        uiStore.prompt.isOpen = true
                    }}
                    disabled={vfsStore.selectedIds.size === 0}
                >
                    <NavigationIcon />
                    <span>{m.move()}</span>
                </Button>
                <Button
                    variant="brutalist"
                    size="small"
                    class="danger-btn"
                    onclick={handleBulkDelete}
                    disabled={vfsStore.selectedIds.size === 0}
                >
                    <TrashIcon />
                    <span>{m.delete_selected()}</span>
                </Button>
            </div>
        </div>
    {/if}

    {#if uiStore.isCompact && !uiStore.isSelectionMode}
        <div class="mobile-controls-container">
            <button
                class="mobile-prompt-btn"
                onclick={() => {
                    uiStore.prompt.mode = "global"
                    uiStore.prompt.isOpen = true
                }}
                aria-label={m.keymap_prompt()}
                title={m.keymap_prompt()}
            >
                <TerminalIcon />
            </button>
        </div>
    {/if}
</div>

<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        padding-bottom: 100px;
    }

    .card_list {
        padding: 0;
        margin: 0;
        list-style: none;
    }

    .card_item {
        position: relative;
        scroll-margin-bottom: 120px;
    }

    :global(.card_inner) {
        min-width: 100%;
        min-height: 100%;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
    }

    main.selection-mode .grid {
        pointer-events: auto;
    }

    @media (--mobile-width) {
        .grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
        }
    }

    .selection-bar {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface-color);
        border: 3px solid var(--border-color);
        box-shadow: 6px 6px 0 var(--shadow-color);
        padding: 12px 24px;
        display: flex;
        align-items: center;
        gap: 32px;
        z-index: var(--z-modal);
        min-width: 400px;
        max-width: 90vw;
        box-sizing: border-box;
    }

    .selection-actions {
        display: flex;
        align-items: stretch;
        gap: 12px;
        flex: 1;
        justify-content: flex-end;
    }

    .selection-actions :global(.button) {
        height: auto;
        align-self: stretch;
    }

    :global(.danger-btn) {
        color: var(--danger-active-color) !important;
    }

    @media (--mobile-width) {
        .selection-bar {
            bottom: 16px;
            padding: 8px 16px;
            gap: 16px;
            min-width: auto;
            flex-direction: row;
            align-items: center;
        }

        .selection-actions {
            justify-content: flex-end;
            flex-wrap: nowrap;
            gap: 8px;
        }

        .selection-actions :global(.button span) {
            display: none;
        }

        .selection-actions :global(.button) {
            width: 36px;
            height: 36px;
            padding: 0;
            justify-content: center;
        }
    }

    .mobile-controls-container {
        position: fixed;
        bottom: calc(16px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: var(--z-sticky);
    }

    .mobile-prompt-btn {
        width: 44px;
        height: 44px;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-color);
        padding: 0;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mobile-prompt-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--surface-hover-color);
    }

    .mobile-prompt-btn :global(svg) {
        width: 18px;
        height: 18px;
    }
</style>
