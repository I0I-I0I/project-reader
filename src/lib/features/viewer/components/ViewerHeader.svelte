<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/core/components/ui/Button.svelte"
    import MenuIcon from "$lib/core/components/icons/MenuIcon.svelte"
    import SettingsIcon from "$lib/core/components/icons/SettingsIcon.svelte"
    import PlusIcon from "$lib/core/components/icons/PlusIcon.svelte"
    import MinusIcon from "$lib/core/components/icons/MinusIcon.svelte"
    import BookmarkPlusIcon from "$lib/core/components/icons/BookmarkPlusIcon.svelte"
    import BookmarkIcon from "$lib/core/components/icons/BookmarkIcon.svelte"
    import { CONSTANTS, settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { stepAndClampScale } from "$lib/core/utils/zoom"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { getContext } from "svelte"
    import {
        COMMANDS_CONTEXT_KEY,
        type CommandNode,
        getShortcutHint,
    } from "$lib/features/prompt/stores/commandsStore.svelte"

    let {
        name,
        isLoaded,
        isOutlineOpen = $bindable(),
        isSettingsOpen = $bindable(),
        isBookmarked = false,
        onBookmarkClick,
        onClose,
    } = $props<{
        name: string
        isLoaded: boolean
        isOutlineOpen?: boolean
        isSettingsOpen?: boolean
        isBookmarked?: boolean
        onBookmarkClick?: () => void
        onClose: () => void
    }>()

    const commandsNode = getContext<CommandNode>(COMMANDS_CONTEXT_KEY)
    let canZoomOut = $derived(settingsStore.scale > CONSTANTS.minScale)
    let canZoomIn = $derived(settingsStore.scale < CONSTANTS.maxScale)
</script>

{#snippet outlineButton()}
    <Button
        variant="action"
        size={uiStore.isCompact ? "default" : "small"}
        square={uiStore.isCompact}
        open={isOutlineOpen}
        onclick={() => (isOutlineOpen = !isOutlineOpen)}
        aria-label={m.outline()}
        tooltip={m.outline() + getShortcutHint(commandsNode, "toggle-outline")}
    >
        <MenuIcon />
        <span class="outline-text">{m.outline()}</span>
    </Button>
{/snippet}

<div class="viewer-header">
    <div class="doc-info">
        {#if isLoaded && !uiStore.isCompact}
            {@render outlineButton()}
        {/if}
        <span class="file-badge">PDF</span>
        <span class="file-name" title={name}>{name || "document.pdf"}</span>
    </div>

    {#if isLoaded}
        <div class="header-actions">
            {#if uiStore.isCompact}
                {@render outlineButton()}
            {/if}
            <Button
                variant="action"
                square={true}
                disabled={!canZoomOut}
                onclick={() =>
                    (settingsStore.scale = stepAndClampScale(
                        settingsStore.scale,
                        -1,
                        CONSTANTS.minScale,
                        CONSTANTS.maxScale,
                    ))}
                aria-label={m.zoom_out()}
                tooltip={m.zoom_out() + getShortcutHint(commandsNode, "zoom-out")}
            >
                <MinusIcon />
            </Button>
            <Button
                variant="action"
                square={true}
                disabled={!canZoomIn}
                onclick={() =>
                    (settingsStore.scale = stepAndClampScale(
                        settingsStore.scale,
                        1,
                        CONSTANTS.minScale,
                        CONSTANTS.maxScale,
                    ))}
                aria-label={m.zoom_in()}
                tooltip={m.zoom_in() + getShortcutHint(commandsNode, "zoom-in")}
            >
                <PlusIcon />
            </Button>
            {#if isBookmarked}
                <Button
                    class="remove-bookmark-btn"
                    variant="action"
                    square={true}
                    onclick={onBookmarkClick}
                    aria-label={m.remove_bookmark()}
                    tooltip={`${m.remove_bookmark()}${getShortcutHint(commandsNode, "toggle-bookmark-page")}`}
                >
                    <BookmarkIcon />
                </Button>
            {:else}
                <Button
                    variant="action"
                    square={true}
                    onclick={onBookmarkClick}
                    aria-label={m.add_bookmark()}
                    tooltip={`${m.add_bookmark()}${getShortcutHint(commandsNode, "toggle-bookmark-page")}`}
                >
                    <BookmarkPlusIcon />
                </Button>
            {/if}
            <Button
                variant="action"
                size={uiStore.isCompact ? "default" : "small"}
                square={uiStore.isCompact}
                open={isSettingsOpen}
                onclick={() => (isSettingsOpen = !isSettingsOpen)}
                aria-label={m.settings()}
                tooltip={m.settings() + getShortcutHint(commandsNode, "toggle-settings")}
            >
                <SettingsIcon />
                <span class="settings-text">{m.settings()}</span>
            </Button>
        </div>
    {/if}

    <div class="close-action">
        <Button
            variant="close"
            square={true}
            onclick={onClose}
            aria-label={m.close_document()}
            tooltip={m.close_document() + getShortcutHint(commandsNode, "close")}
        >
            <span class="close-icon">×</span>
        </Button>
    </div>
</div>

<style>
    :global(
        .viewer-header
            .remove-bookmark-btn:hover:not(:disabled):not(:active):not(.active):not(.open)
    ) {
        background: var(--danger-active-color, #ff4d4d) !important;
        color: var(--danger-text-color, #ffffff) !important;
    }

    .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        background: var(--accent-active-color);
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
        color: var(--text-color);
        position: relative;
        z-index: var(--z-dropdown);
    }

    .doc-info,
    .header-actions,
    .close-action {
        display: flex;
        align-items: center;
    }

    .doc-info {
        gap: 16px;
        min-width: 0;
        flex: 1;
    }

    .header-actions {
        gap: 12px;
        flex-shrink: 0;
    }

    .close-action {
        flex-shrink: 0;
    }

    .file-badge {
        flex-shrink: 0;
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        font-size: var(--font-size-sm);
        font-weight: 900;
        padding: 4px 10px;
        border-radius: var(--radius-sm);
        letter-spacing: 1px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .file-name {
        min-width: 0;
        font-size: var(--font-size-xl);
        font-weight: 900;
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .close-icon {
        display: inline-block;
        font-size: var(--font-size-4xl);
        font-weight: 900;
        line-height: 1;
    }

    @media (--mobile) {
        .viewer-header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            grid-template-rows: auto auto;
            gap: 6px 8px;
            padding: 8px 12px;
            padding-top: calc(8px + env(safe-area-inset-top));
            padding-left: calc(12px + env(safe-area-inset-left));
            padding-right: calc(12px + env(safe-area-inset-right));
            border-bottom-width: 2px;
        }

        .doc-info {
            grid-column: 1;
            grid-row: 1;
            gap: 8px;
            overflow: hidden;
        }

        .close-action {
            grid-column: 2;
            grid-row: 1;
        }

        .header-actions {
            grid-column: 1 / -1;
            grid-row: 2;
            justify-content: space-between;
            gap: 4px;
            min-width: 0;
        }

        .file-name {
            font-size: var(--font-size-base);
        }

        .file-badge {
            font-size: var(--font-size-2xs);
            padding: 2px 6px;
        }

        .settings-text,
        .outline-text {
            display: none;
        }
    }

    @media (max-height: 500px) and (min-width: 801px) {
        .viewer-header {
            padding: 6px 16px;
            padding-top: calc(6px + env(safe-area-inset-top));
            padding-left: calc(16px + env(safe-area-inset-left));
            padding-right: calc(16px + env(safe-area-inset-right));
        }

        .file-name {
            font-size: var(--font-size-md);
        }
    }

    @media (--tiny-mobile) {
        .file-badge {
            display: none;
        }
    }
</style>
