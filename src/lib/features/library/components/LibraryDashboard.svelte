<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Header from "$lib/core/components/Header.svelte"
    import BookImporter from "$lib/features/library/components/BookImporter.svelte"
    import BookIcon from "$lib/core/components/icons/BookIcon.svelte"
    import TerminalIcon from "$lib/core/components/icons/TerminalIcon.svelte"
    import Breadcrumbs from "$lib/core/components/ui/Breadcrumbs.svelte"
    import TrashIcon from "$lib/core/components/icons/TrashIcon.svelte"
    import NavigationIcon from "$lib/core/components/icons/NavigationIcon.svelte"
    import CheckIcon from "$lib/core/components/icons/CheckIcon.svelte"
    import MinusIcon from "$lib/core/components/icons/MinusIcon.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"

    import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
    import Card from "$lib/features/library/components/Card.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { modalManager } from "$lib/core/components/ui/modal/modalManager.svelte"
    import Folder from "$lib/features/library/components/Folder.svelte"
    import NewFolderModal from "$lib/features/library/components/NewFolderModal.svelte"
    import DeleteConfirmModal from "$lib/features/library/components/DeleteConfirmModal.svelte"
    import EditBookMetadataModal from "$lib/features/library/components/EditBookMetadataModal.svelte"
    import RelinkModal from "$lib/features/library/components/RelinkModal.svelte"
    import { useCommands } from "$lib/features/commands/commandsStore.svelte"
    import { libraryCommands } from "$lib/features/library/commands/libraryCommands"
    import { createLibraryFolder } from "$lib/features/library/commands/libraryCommandExecution"
    import { libraryPrimaryCommand } from "$lib/features/library/commands/libraryDashboardCommands"
    import { libraryRecursiveBookCommand } from "$lib/features/library/commands/libraryRecursiveBookCommand"
    import { libraryReadStateEntityCommand } from "$lib/features/library/commands/libraryBoundEntityCommands"
    import {
        libraryNodeDeleteCommand,
        libraryNodeMoveCommand,
    } from "$lib/features/library/commands/libraryNodeCommands"
    import { confirmLibraryNodeDelete } from "$lib/features/library/commands/libraryNodeDeleteConfirmation"
    import { page } from "$app/state"
    import { goto } from "$app/navigation"
    import { resolve } from "$app/paths"
    import { localizedPath } from "$lib/core/language/language"
    import type { VFSNode } from "$lib/core/vfs/vfsStore.types"
    import PickerModeKeymaps from "$lib/features/prompt/components/PickerModeKeymaps.svelte"
    import PickerKey from "$lib/features/prompt/components/PickerKey.svelte"
    import { PICKER_KEYS, generateHints } from "$lib/features/library/utils/constants"
    import { navigateGrid } from "$lib/features/library/utils/gridNavigation"
    import { tick, untrack } from "svelte"
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { createLibraryDashboardInteractionCommands } from "$lib/features/library/commands/libraryDashboardInteractionCommands"

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
            untrack(() => {
                uiStore.isSelectionMode = false
                uiStore.isPickingMode = false
                vfsStore.clearSelection()
                pickerKeyBuffer = ""
                lastFocusedCardId = null
            })
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

    async function handleNodeClick(e: MouseEvent | KeyboardEvent | null, node: VFSNode) {
        const isEnter = e && e instanceof KeyboardEvent && e.key === "Enter"
        if (!isEnter && (uiStore.isSelectionMode || e?.metaKey || e?.ctrlKey)) {
            await libraryCommandScope.execute("library.selection.toggle", { nodeId: node.id })
            return
        }
        if (node.type === "folder") {
            await libraryCommandScope.execute("library.folder.open", { folderId: node.id })
        } else {
            await libraryCommandScope.execute("viewer.open", { bookId: node.id })
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

    function startPicker(mode: typeof pickingMode) {
        if (mode !== "openFileFolder" || !uiStore.isSelectionMode) {
            pickingMode = mode
        }
        pickerKeyBuffer = ""
        uiStore.isPickingMode = true
    }

    function goUpFolder() {
        if (vfsStore.currentFolderId === null) return
        const currentFolder = vfsStore.nodes[vfsStore.currentFolderId]
        if (!currentFolder) return
        const parentId = currentFolder.parentId
        if (parentId) {
            const path = vfsStore.getFolderPath(parentId)
            void goto(resolve((localizedPath("/") + `?folder=${encodeURIComponent(path)}`) as any))
        } else {
            void goto(resolve(localizedPath("/") as any))
        }
    }

    const libraryCommandScope = useCommands([
        ...createLibraryDashboardInteractionCommands({
            gridDisabled: () => uiStore.isPickingMode,
            moveGrid: (direction, repeated) =>
                navigateGrid(direction, lastFocusedCardId, settingsStore.animations, repeated),
            startOpenPicker: () => startPicker("openFileFolder"),
            startFocusPicker: () => startPicker("focusCard"),
            startSelectionPicker: () => startPicker("startSelection"),
            goUpFolder,
            labels: {
                down: () => m.keymap_grid_select_down(),
                up: () => m.keymap_grid_select_up(),
                left: () => m.keymap_grid_select_left(),
                right: () => m.keymap_grid_select_right(),
                openPicker: () => m.pick_file_to_open(),
                focusPicker: () => m.pick_file_to_focus(),
                selectionPicker: () => m.pick_file_to_open(),
                upFolder: () => m.keymap_up_folder(),
            },
            englishLabels: {
                down: () => "Select item below",
                up: () => "Select item above",
                left: () => "Select item left",
                right: () => "Select item right",
                openPicker: () => m.pick_file_to_open({}, { locale: "en" }),
                focusPicker: () => m.pick_file_to_focus({}, { locale: "en" }),
                selectionPicker: () => m.pick_file_to_open({}, { locale: "en" }),
                upFolder: () => m.keymap_up_folder({}, { locale: "en" }),
            },
        }),
        libraryRecursiveBookCommand,
        libraryReadStateEntityCommand,
        libraryCommands["library.folder.open"],
        libraryPrimaryCommand,

        libraryCommands["library.continue-reading"],
        libraryCommands["library.selection.clear"],
        libraryCommands["library.selection.move"],
        libraryCommands["library.selection.delete"],
        libraryCommands["library.selection.toggle"],
        libraryCommands["library.selection.all"],
        libraryCommands["library.folder.create"],
        libraryNodeMoveCommand,
        libraryNodeDeleteCommand,
        libraryCommands["library.node.edit-metadata"],
        libraryCommands["library.node.relink"],
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
        const isModalOpen = modalManager.hasBlockingModal
        if (!isModalOpen && wasModalOpen) {
            restoreCardFocus()
        }
        wasModalOpen = isModalOpen
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
        <NewFolderModal onCreate={createLibraryFolder} />
    {/if}

    {#if uiStore.isDeleteModalOpen}
        <DeleteConfirmModal
            message={uiStore.nodesToDeleteIds.length > 1
                ? m.delete_confirmation_multiple({ count: uiStore.nodesToDeleteIds.length })
                : m.delete_confirmation_single()}
            onConfirm={async () => {
                const nodeIds = [...uiStore.nodesToDeleteIds]
                if (nodeIds.length === 1 && !uiStore.isSelectionMode) {
                    await confirmLibraryNodeDelete(libraryCommandScope, nodeIds[0])
                } else {
                    await libraryCommandScope.execute("library.selection.delete", {
                        nodeIds,
                        confirmed: true,
                    })
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
                    onclick={() =>
                        void libraryCommandScope.execute(
                            allSelected ? "library.selection.clear" : "library.selection.all",
                        )}
                >
                    <span>{allSelected ? m.deselect_all() : m.select_all()}</span>
                </Button>
                <Button
                    variant="brutalist"
                    size="small"
                    onclick={() => void libraryCommandScope.execute("library.selection.move")}
                    disabled={vfsStore.selectedIds.size === 0}
                >
                    <NavigationIcon />
                    <span>{m.move()}</span>
                </Button>
                <Button
                    variant="brutalist"
                    size="small"
                    class="danger-btn"
                    onclick={() => void libraryCommandScope.execute("library.selection.delete")}
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
                onclick={() => void libraryCommandScope.execute("prompt.open")}
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
        padding: 12px 24px;
        display: flex;
        align-items: center;
        z-index: var(--z-modal);
        max-width: 90dvw;
        box-sizing: border-box;
    }

    .selection-actions {
        display: flex;
        align-items: stretch;
        gap: 12px;
        flex: 1;
        justify-content: center;
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
