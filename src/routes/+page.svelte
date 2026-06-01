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
    import SelectionKeymaps from "$lib/components/SelectionKeymaps.svelte"
    import { useKeymap } from "$lib/stores/keymapStore.svelte"

    const currentNodes = $derived(
        [...vfsStore.currentNodes].sort((a, b) => {
            if (a.type === "folder" && b.type !== "folder") return -1
            if (a.type !== "folder" && b.type === "folder") return 1
            return b.updatedAt - a.updatedAt
        }),
    )

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
        for (const id of ids) {
            await vfsStore.deleteNode(id)
        }
        uiStore.isSelectionMode = false
        vfsStore.clearSelection()
    }

    useKeymap([
        {
            id: "open-new-folder-modal",
            keys: "shift+a",
            action: () => (uiStore.isNewFolderModalOpen = true),
            description: m.new_folder(),
            category: "commands",
            subtitle: () => m.new_folder(),
        },
    ])

    $effect(() => {
        if (uiStore.isSelectionMode && vfsStore.selectedIds.size === 0) {
            uiStore.isSelectionMode = false
        }
    })
</script>

<div class="container">
    <Header />
    <Breadcrumbs {breadcrumbs} />

    <NewFolderModal onCreate={(name) => vfsStore.createFolder(name, vfsStore.currentFolderId)} />

    <main class="grid" class:selection-mode={uiStore.isSelectionMode}>
        {#if currentNodes.length !== 0 || vfsStore.currentFolderId !== null}
            <Folder type="new-folder" />
            {#each currentNodes as node (node.id)}
                <Card {node} Icon={BookIcon} />
            {/each}
            <BookImporter variant="card" />
        {:else}
            <BookImporter />
        {/if}
    </main>

    {#if uiStore.isSelectionMode}
        <SelectionKeymaps {currentNodes} {allSelected} {handleBulkDelete} />
        <div class="selection-bar">
            <div class="selection-info">
                <span class="selection-count">
                    {m.items_selected({ count: vfsStore.selectedIds.size })}
                </span>
            </div>
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
                        uiStore.promptMode = "move"
                        uiStore.isPromptOpen = true
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
        <button
            class="mobile-prompt-btn"
            onclick={() => (uiStore.isPromptOpen = true)}
            aria-label={m.keymap_prompt ? m.keymap_prompt() : "Open Command Prompt"}
            title={m.keymap_prompt ? m.keymap_prompt() : "Open Command Prompt"}
        >
            <TerminalIcon />
        </button>
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

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
    }

    .grid.selection-mode {
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
        z-index: 1000;
        min-width: 400px;
        max-width: 90vw;
        box-sizing: border-box;
    }

    .selection-info {
        display: flex;
        align-items: center;
    }

    .selection-count {
        font-weight: 900;
        font-size: 14px;
        text-transform: uppercase;
        color: var(--danger-active-color);
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

        .selection-info {
            justify-content: flex-start;
        }
    }

    .mobile-prompt-btn {
        position: fixed;
        bottom: calc(16px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        width: 44px;
        height: 44px;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        color: var(--text-color);
        padding: 0;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mobile-prompt-btn:active {
        transform: translateX(-50%) translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--surface-hover-color);
    }

    .mobile-prompt-btn :global(svg) {
        width: 18px;
        height: 18px;
    }
</style>
