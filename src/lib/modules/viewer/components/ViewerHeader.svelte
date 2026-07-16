<script lang="ts">
    import { viewport } from "$lib/shared/state/viewport.svelte"
    import * as m from "$lib/paraglide/messages"
    import AppUpdateButton from "$lib/shared/ui/AppUpdateButton.svelte"
    import Button from "$lib/shared/ui/Button.svelte"
    import MenuIcon from "$lib/shared/icons/MenuIcon.svelte"
    import SettingsIcon from "$lib/shared/icons/SettingsIcon.svelte"
    import BookmarkPlusIcon from "$lib/shared/icons/BookmarkPlusIcon.svelte"
    import BookmarkIcon from "$lib/shared/icons/BookmarkIcon.svelte"
    import { getContext } from "svelte"
    import {
        COMMANDS_CONTEXT_KEY,
        type CommandScope,
        getShortcutHint,
        commandsStore,
    } from "$lib/modules/commands"

    let {
        name,
        isLoaded,
        isOutlineOpen = $bindable(),
        isSettingsOpen = $bindable(),
        isBookmarked = false,
    } = $props<{
        name: string
        isLoaded: boolean
        isOutlineOpen?: boolean
        isSettingsOpen?: boolean
        isBookmarked?: boolean
    }>()

    const commandsNode = getContext<CommandScope>(COMMANDS_CONTEXT_KEY)
</script>

<div class="viewer-header">
    <div class="doc-info">
        {#if isLoaded}
            <Button
                variant="action"
                size={viewport.isCompact ? "default" : "small"}
                square={viewport.isCompact}
                open={isOutlineOpen}
                onclick={() => void commandsStore.execute("viewer.sidebar.outline.toggle")}
                aria-label={m.outline()}
                tooltip={m.outline() +
                    getShortcutHint(commandsNode, "viewer.sidebar.outline.toggle")}
            >
                <MenuIcon />
                <span class="outline-text">{m.outline()}</span>
            </Button>
        {/if}
        <span class="file-badge">PDF</span>
        <span class="file-name" title={name}>{name || "document.pdf"}</span>
    </div>

    <div class="header-actions">
        <AppUpdateButton />

        {#if isLoaded}
            {#if isBookmarked}
                <Button
                    class="remove-bookmark-btn"
                    variant="action"
                    square={true}
                    onclick={() => void commandsStore.execute("viewer.bookmark.toggle-page")}
                    aria-label={m.remove_bookmark()}
                    tooltip={`${m.remove_bookmark()}${getShortcutHint(commandsNode, "viewer.bookmark.toggle-page")}`}
                >
                    <BookmarkIcon />
                </Button>
            {:else}
                <Button
                    variant="action"
                    square={true}
                    onclick={() => void commandsStore.execute("viewer.bookmark.toggle-page")}
                    aria-label={m.add_bookmark()}
                    tooltip={`${m.add_bookmark()}${getShortcutHint(commandsNode, "viewer.bookmark.toggle-page")}`}
                >
                    <BookmarkPlusIcon />
                </Button>
            {/if}
            <Button
                variant="action"
                size={viewport.isCompact ? "default" : "small"}
                square={viewport.isCompact}
                open={isSettingsOpen}
                onclick={() => void commandsStore.execute("viewer.sidebar.settings.toggle")}
                aria-label={m.settings()}
                tooltip={m.settings() +
                    getShortcutHint(commandsNode, "viewer.sidebar.settings.toggle")}
            >
                <SettingsIcon />
                <span class="settings-text">{m.settings()}</span>
            </Button>
        {/if}

        <Button
            variant="close"
            square={true}
            onclick={() => void commandsStore.execute("viewer.close")}
            aria-label={m.close_document()}
            tooltip={m.close_document() + getShortcutHint(commandsNode, "viewer.close")}
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
    .header-actions {
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
            padding: 8px 12px;
            padding-top: calc(8px + env(safe-area-inset-top));
            padding-left: calc(12px + env(safe-area-inset-left));
            padding-right: calc(12px + env(safe-area-inset-right));
            border-bottom-width: 2px;
        }

        .doc-info {
            gap: 8px;
            overflow: hidden;
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
