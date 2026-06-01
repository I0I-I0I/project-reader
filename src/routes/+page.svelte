<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Header from "$lib/components/Header.svelte"
    import BookImporter from "$lib/components/BookImporter.svelte"
    import BookIcon from "$lib/components/icons/BookIcon.svelte"
    import TerminalIcon from "$lib/components/icons/TerminalIcon.svelte"
    import Breadcrumbs from "$lib/components/ui/Breadcrumbs.svelte"

    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import Card from "$lib/components/Card.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import Folder from "$lib/components/Folder.svelte"

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
</script>

<div class="container">
    <Header />
    <Breadcrumbs {breadcrumbs} />

    <main class="grid">
        {#if currentNodes.length !== 0 || vfsStore.currentFolderId !== null}
            <Folder
                type="new-folder"
                onCreate={(name) => vfsStore.createFolder(name, vfsStore.currentFolderId)}
            />
            {#each currentNodes as node (node.id)}
                <Card {node} Icon={BookIcon} />
            {/each}
            <BookImporter variant="card" />
        {:else}
            <BookImporter />
        {/if}
    </main>

    {#if uiStore.isCompact}
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
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
    }

    @media (max-width: 800px) {
        .grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
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
