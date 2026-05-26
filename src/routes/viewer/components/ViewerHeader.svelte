<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/Button.svelte"
    import MenuIcon from "$lib/components/icons/MenuIcon.svelte"

    let {
        name,
        isLoaded,
        isOutlineOpen = $bindable(),
        onClose,
    } = $props<{
        name: string
        isLoaded: boolean
        isOutlineOpen?: boolean
        onClose: () => void
    }>()
</script>

<div class="viewer-header">
    <div class="doc-info">
        {#if isLoaded}
            <button
                class="burger-btn"
                onclick={() => (isOutlineOpen = !isOutlineOpen)}
                aria-label={m.outline()}
                class:open={isOutlineOpen}
            >
                <MenuIcon />
            </button>
        {/if}
        <span class="file-badge">PDF</span>
        <span class="file-name" title={name}>{name || "document.pdf"}</span>
    </div>
    <div class="header-actions">
        <Button onclick={onClose} aria-label={m.close_document()}>
            {m.close()} ×
        </Button>
    </div>
</div>

<style>
    .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--viewer-header-bg);
        border-bottom: 3px solid var(--border-color);
        padding: 12px 20px;
        color: var(--doc-text-color);
    }

    .doc-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .file-badge {
        background: var(--doc-file-badge-bg);
        color: var(--doc-file-badge-text);
        font-size: 10px;
        font-weight: 900;
        padding: 3px 8px;
        border-radius: 2px;
        letter-spacing: 0.5px;
        border: 1.5px solid var(--border-color);
    }

    .file-name {
        font-size: 14px;
        font-weight: 800;
        color: var(--doc-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
    }

    .header-actions :global(.action-btn) {
        background: var(--button-bg);
        font-size: 11px;
        padding: 4px 10px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-color);
    }

    .header-actions :global(.action-btn:hover) {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--button-hover-bg, #faf8f5);
    }

    .header-actions :global(.action-btn:active) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .burger-btn {
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        color: var(--text-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        margin-right: 8px;
        flex-shrink: 0;
    }

    .burger-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--viewer-accent);
    }

    .burger-btn:active,
    .burger-btn.open {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--viewer-accent-active);
    }
</style>
