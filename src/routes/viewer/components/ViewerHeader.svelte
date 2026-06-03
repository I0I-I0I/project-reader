<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import MenuIcon from "$lib/components/icons/MenuIcon.svelte"
    import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte"
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import MinusIcon from "$lib/components/icons/MinusIcon.svelte"
    import { CONSTANTS, settingsStore } from "$lib/stores/settingsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { onMount, getContext } from "svelte"
    import {
        COMMANDS_CONTEXT_KEY,
        type CommandNode,
        getShortcutHint,
    } from "$lib/stores/commandsStore.svelte"

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

    let isShortHeight = $state(false)
    const commandsNode = getContext<CommandNode>(COMMANDS_CONTEXT_KEY)

    onMount(() => {
        const heightQuery = window.matchMedia("(max-height: 500px)")
        isShortHeight = heightQuery.matches

        const heightHandler = (e: MediaQueryListEvent) => {
            isShortHeight = e.matches
        }
        heightQuery.addEventListener("change", heightHandler)

        return () => {
            heightQuery.removeEventListener("change", heightHandler)
        }
    })
</script>

<div class="viewer-header">
    <div class="doc-info">
        {#if isLoaded}
            <Button
                variant="action"
                square={true}
                open={isOutlineOpen}
                onclick={() => (isOutlineOpen = !isOutlineOpen)}
                aria-label={m.outline()}
                tooltip={m.outline() + getShortcutHint(commandsNode, "toggle-outline")}
            >
                <MenuIcon />
            </Button>
        {/if}
        <span class="file-badge">PDF</span>
        <span class="file-name" title={name}>{name || "document.pdf"}</span>
    </div>
    <div class="header-actions">
        {#if isLoaded}
            {#if !uiStore.isCompact || isShortHeight}
                <Button
                    variant="action"
                    square={true}
                    onclick={() =>
                        (settingsStore.scale = Math.max(
                            settingsStore.scale - 0.1,
                            CONSTANTS.minScale,
                        ))}
                    aria-label={m.zoom_out ? m.zoom_out() : "Zoom Out"}
                    tooltip={(m.zoom_out ? m.zoom_out() : "Zoom Out") +
                        getShortcutHint(commandsNode, "zoom-out")}
                >
                    <MinusIcon />
                </Button>
                <Button
                    variant="action"
                    square={true}
                    onclick={() =>
                        (settingsStore.scale = Math.min(
                            settingsStore.scale + 0.1,
                            CONSTANTS.maxScale,
                        ))}
                    aria-label={m.zoom_in ? m.zoom_in() : "Zoom In"}
                    tooltip={(m.zoom_in ? m.zoom_in() : "Zoom In") +
                        getShortcutHint(commandsNode, "zoom-in")}
                >
                    <PlusIcon />
                </Button>
            {/if}
            <Button
                variant="action"
                square={uiStore.isCompact}
                open={isSettingsOpen}
                onclick={() => (isSettingsOpen = !isSettingsOpen)}
                aria-label={m.settings()}
                tooltip={m.settings() + getShortcutHint(commandsNode, "toggle-settings")}
            >
                <SettingsIcon />
                <span class="settings-text">{m.settings()}</span>
            </Button>
        {/if}

        <Button
            variant="close"
            square={uiStore.isCompact}
            onclick={onClose}
            aria-label={m.close_document()}
            tooltip={m.close_document() + getShortcutHint(commandsNode, "close-viewer")}
        >
            <span class="close-icon">×</span>
            <span class="close-text">{m.close()}</span>
        </Button>
    </div>
</div>

<style>
    .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
        z-index: 50;
    }

    .doc-info {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
    }

    .file-badge {
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
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
        color: var(--text-color);
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

    .close-icon {
        display: inline-block;
        font-size: 24px;
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

        .file-name {
            font-size: 12px;
        }

        .file-badge {
            font-size: 9px;
            padding: 2px 6px;
        }

        .settings-text,
        .close-text {
            display: none;
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
    }

    @media (--tiny-mobile) {
        .file-badge {
            display: none;
        }
    }
</style>
