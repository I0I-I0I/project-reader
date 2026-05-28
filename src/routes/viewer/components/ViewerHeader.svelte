<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/Button.svelte"
    import MenuIcon from "$lib/components/icons/MenuIcon.svelte"
    import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte"

    let {
        name,
        isLoaded,
        isOutlineOpen = $bindable(),
        isSettingsOpen = $bindable(),
        onClose,
    } = $props<{
        name: string
        isLoaded: boolean
        isOutlineOpen?: boolean
        isSettingsOpen?: boolean
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
        {#if isLoaded}
            <button
                class="burger-btn settings-btn"
                onclick={() => (isSettingsOpen = !isSettingsOpen)}
                aria-label={m.settings()}
                class:open={isSettingsOpen}
            >
                <SettingsIcon />
            </button>
        {/if}

        <Button onclick={onClose} aria-label={m.close_document()}>
            <span class="close-text">{m.close()} ×</span>
            <span class="close-icon">×</span>
        </Button>
    </div>
</div>

<style>
    .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--viewer-header-bg);
        background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
        );
        border-bottom: 3px solid var(--border-color);
        padding: 16px 24px;
        color: var(--doc-text-color);
        position: relative;
    }

    .doc-info {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
    }

    .file-badge {
        background: var(--doc-file-badge-bg);
        color: var(--doc-file-badge-text);
        font-size: 11px;
        font-weight: 900;
        padding: 4px 10px;
        border-radius: 2px;
        letter-spacing: 1px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .file-name {
        font-size: 16px;
        font-weight: 900;
        color: var(--doc-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .header-actions :global(.action-btn) {
        background: var(--button-bg);
        font-size: 12px;
        font-weight: 800;
        padding: 8px 14px;
        border: 2.5px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 6px;
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

    .settings-btn {
        display: inline-flex;
        margin-right: 0;
        margin-left: 4px;
    }

    .close-icon {
        display: none;
    }

    @media (max-width: 600px) {
        .viewer-header {
            padding: 8px 12px;
            border-bottom-width: 2px;
        }

        .burger-btn {
            width: 32px;
            height: 32px;
            margin-right: 4px;
        }

        .settings-btn {
            margin-right: 0;
            margin-left: 4px;
        }

        .file-name {
            font-size: 12px;
        }

        .file-badge {
            font-size: 9px;
            padding: 2px 6px;
        }

        .close-text {
            display: none;
        }

        .close-icon {
            display: inline-block;
            font-size: 16px;
            font-weight: 900;
            line-height: 1;
        }

        .header-actions :global(.action-btn) {
            min-width: unset;
            padding: 4px 8px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    @media (max-width: 480px) {
        .file-badge {
            display: none;
        }
    }
</style>
