<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import FolderIcon from "./icons/FolderIcon.svelte"
    import NewFolderIcon from "./icons/NewFolderIcon.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"

    interface Props {
        type?: "new-folder" | "folder"
        onclick?: () => void
        class?: string
    }

    const { type = "folder", onclick, class: className }: Props = $props()

    function handleClick() {
        if (type === "new-folder") {
            uiStore.isNewFolderModalOpen = true
        }
        if (onclick) {
            onclick()
        }
    }
</script>

<button
    type="button"
    class={`card ${className}`}
    class:card-action={type === "new-folder"}
    onclick={handleClick}
>
    <div class="card-cover-container">
        <div class="card-icon" aria-hidden="true">
            {#if type === "new-folder"}
                <NewFolderIcon />
            {:else}
                <FolderIcon />
            {/if}
        </div>
    </div>
    <div class="card-metadata">
        <p class="card-title">
            {type === "new-folder" ? (m.new_folder ? m.new_folder() : "New Folder") : "Folder"}
        </p>
        {#if type === "new-folder"}
            <p class="card-author">&nbsp;</p>
        {/if}
    </div>
</button>

<style>
    .card {
        background: var(--surface-color);
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: inherit;
        width: 100%;
        height: 100%;
        user-select: none;
    }

    .card-action {
        background-color: transparent;
    }

    @media (hover: hover) {
        .card:hover {
            transform: translate(-4px, -4px);
            box-shadow: 8px 8px 0 var(--shadow-color);
            background-color: var(--surface-hover-color);
        }
    }

    .card:active {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .card-cover-container {
        position: relative;
        width: 100%;
        aspect-ratio: 2/3;
        background: var(--bg-color);
        border-bottom: 2px solid var(--border-color);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
    }

    .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-color);
    }

    .card-icon :global(svg) {
        width: 48px;
        height: 48px;
        stroke-width: 2;
    }

    .card-metadata {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        box-sizing: border-box;
        text-align: left;
    }

    .card-title {
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        width: 100%;
        word-wrap: break-word;
        color: var(--text-color);
        display: -webkit-box;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.3;
    }

    .card-author {
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        width: 100%;
        word-wrap: break-word;
        color: var(--text-color);
        opacity: 0.7;
        display: -webkit-box;
        line-clamp: 1;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.2;
    }

    @media (--mobile-width) {
        .card-metadata {
            padding: 8px;
            gap: 2px;
        }

        .card-title {
            font-size: 11px;
        }

        .card-author {
            font-size: 9.5px;
        }

        .card-icon :global(svg) {
            width: 36px;
            height: 36px;
        }
    }
</style>
