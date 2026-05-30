<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import MenuIcon from "$lib/components/icons/MenuIcon.svelte"
    import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte"
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import MinusIcon from "$lib/components/icons/MinusIcon.svelte"
    import { CONSTANTS, settingsStore } from "$lib/settingsStore.svelte"
    import { MEDIA_QUERIES } from "$lib/breakpoints"
    import { onMount } from "svelte"

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

    let isMobilePhone = $state(false)
    let isShortHeight = $state(false)

    onMount(() => {
        const mediaQuery = window.matchMedia(MEDIA_QUERIES.MOBILE)
        isMobilePhone = mediaQuery.matches

        const handler = (e: MediaQueryListEvent) => {
            isMobilePhone = e.matches
        }
        mediaQuery.addEventListener("change", handler)

        const heightQuery = window.matchMedia("(max-height: 500px)")
        isShortHeight = heightQuery.matches

        const heightHandler = (e: MediaQueryListEvent) => {
            isShortHeight = e.matches
        }
        heightQuery.addEventListener("change", heightHandler)

        return () => {
            mediaQuery.removeEventListener("change", handler)
            heightQuery.removeEventListener("change", heightHandler)
        }
    })
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
            {#if !isMobilePhone || isShortHeight}
                <button
                    class="header-zoom-btn"
                    onclick={() =>
                        (settingsStore.scale = Math.max(
                            settingsStore.scale - 0.1,
                            CONSTANTS.minScale,
                        ))}
                    aria-label={m.zoom_out ? m.zoom_out() : "Zoom Out"}
                    title={m.zoom_out ? m.zoom_out() : "Zoom Out"}
                >
                    <MinusIcon />
                </button>
                <button
                    class="header-zoom-btn"
                    onclick={() =>
                        (settingsStore.scale = Math.min(
                            settingsStore.scale + 0.1,
                            CONSTANTS.maxScale,
                        ))}
                    aria-label={m.zoom_in ? m.zoom_in() : "Zoom In"}
                    title={m.zoom_in ? m.zoom_in() : "Zoom In"}
                >
                    <PlusIcon />
                </button>
            {/if}
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
        padding-top: calc(16px + env(safe-area-inset-top));
        padding-left: calc(24px + env(safe-area-inset-left));
        padding-right: calc(24px + env(safe-area-inset-right));
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

    @media (hover: hover) {
        .header-actions :global(.action-btn:hover) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--button-hover-bg, #faf8f5);
        }
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

    @media (hover: hover) {
        .burger-btn:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--viewer-accent);
        }
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

    .header-zoom-btn {
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
        margin-right: 4px;
        flex-shrink: 0;
    }

    .header-zoom-btn :global(svg) {
        width: 16px;
        height: 16px;
    }

    @media (hover: hover) {
        .header-zoom-btn:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--viewer-accent);
        }
    }

    @media (width >= 1200px) {
        .header-zoom-btn {
            display: none;
        }
    }

    .header-zoom-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--viewer-accent-active);
    }

    .close-icon {
        display: none;
    }

    @media (max-width: 800px), (max-height: 500px) {
        .viewer-header {
            padding: 8px 12px;
            padding-top: calc(8px + env(safe-area-inset-top));
            padding-left: calc(12px + env(safe-area-inset-left));
            padding-right: calc(12px + env(safe-area-inset-right));
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

    @media (max-height: 500px) {
        .viewer-header {
            padding: 6px 16px;
            padding-top: calc(6px + env(safe-area-inset-top));
            padding-left: calc(16px + env(safe-area-inset-left));
            padding-right: calc(16px + env(safe-area-inset-right));
        }

        .file-name {
            font-size: 13px;
        }

        .file-badge {
            font-size: 9px;
            padding: 2px 6px;
        }

        .burger-btn,
        .settings-btn {
            width: 30px;
            height: 30px;
        }

        .header-actions :global(.action-btn) {
            height: 30px;
            padding: 4px 10px;
            font-size: 11px;
        }
    }

    @media (max-width: 480px) {
        .file-badge {
            display: none;
        }
    }
</style>
