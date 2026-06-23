<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/core/components/ui/Button.svelte"
    import MenuIcon from "$lib/core/components/icons/MenuIcon.svelte"
    import NoteIcon from "$lib/core/components/icons/NoteIcon.svelte"
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { cubicOut } from "svelte/easing"
    import {
        getShortcutHint,
        useCommands,
        type CommandNode,
    } from "$lib/features/prompt/stores/commandsStore.svelte"
    import { getContext, untrack } from "svelte"
    import type { FlatHeading } from "$lib/core/pdf/pdf"

    import Tabs from "$lib/core/components/ui/Tabs.svelte"
    import TabItem from "$lib/core/components/ui/TabItem.svelte"
    import OutlineSidebar from "./OutlineSidebar.svelte"
    import NotesSidebar from "./NotesSidebar.svelte"
    import BookmarksSidebar from "./BookmarksSidebar.svelte"
    import SettingsSidebar from "./SettingsSidebar.svelte"
    import BookmarkIcon from "$lib/core/components/icons/BookmarkIcon.svelte"
    import { notesStore } from "$lib/features/viewer/stores/notesStore.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"

    let {
        side = "left",
        activeTab = $bindable("outline"),
        onClose,
        onMouseLeave,
        showBackdrop = true,
        isOutlineLoading = false,
        outlineList = null,
        currentPage = $bindable(1),
        scrollPosition = $bindable(0),
        activeHeadings = new Set(),
    } = $props<{
        side?: "left" | "right"
        activeTab: "outline" | "notes" | "bookmarks" | "settings"
        onClose: () => void
        onMouseLeave?: (e: MouseEvent) => void
        showBackdrop?: boolean
        isOutlineLoading?: boolean
        outlineList?: FlatHeading[] | null
        currentPage?: number
        scrollPosition?: number
        activeHeadings?: Set<FlatHeading>
    }>()

    const initialSide = untrack(() => side)
    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = initialSide === "right" && getActiveNode ? getActiveNode() : null

    const sidebarCommandsNode = useCommands(
        [
            {
                id: "close",
                keys:
                    initialSide === "right" ? ["escape", "ctrl+c", "ctrl+["] : ["ctrl+c", "ctrl+["],
                disabled: () =>
                    (initialSide === "left" && uiStore.isModalOpen) ||
                    !!notesStore.editingNote ||
                    !!notesStore.activePopup,
                action: () => {
                    onClose()
                },
                description:
                    initialSide === "right" ? m.keymap_close_settings() : m.keymap_close_sidebar(),
                allowInInputs: true,
            },
            {
                id: "close-alt",
                keys: initialSide === "right" ? "q" : ["escape", "q"],
                disabled: () =>
                    (initialSide === "left" && uiStore.isModalOpen) ||
                    !!notesStore.editingNote ||
                    !!notesStore.activePopup,
                action: () => {
                    onClose()
                },
                description:
                    initialSide === "right" ? m.keymap_close_settings() : m.keymap_close_sidebar(),
                allowInInputs: false,
            },
        ],
        activeNodeBeforeOpen || undefined,
    )

    function slideFromSide(_: HTMLElement, { duration = 150 }) {
        return {
            duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                const translateX = initialSide === "left" ? (eased - 1) * 100 : (1 - eased) * 100
                return `
                    transform: translateX(${translateX}%);
                `
            },
        }
    }
</script>

{#if showBackdrop}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="sidebar-backdrop"
        onclick={(e) => {
            e.stopPropagation()
            onClose()
        }}
    ></div>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="sidebar {side}"
    transition:slideFromSide={{ duration: settingsStore.animations ? 150 : 0 }}
    onmouseleave={onMouseLeave}
    onclick={(e) => e.stopPropagation()}
>
    <div class="sidebar-header">
        {#if side === "left"}
            <Tabs class="sidebar-tabs-list" activeValue={activeTab}>
                <TabItem
                    active={activeTab === "outline"}
                    onclick={() => (activeTab = "outline")}
                    Icon={MenuIcon}
                    tooltip={m.outline() + getShortcutHint(sidebarCommandsNode, "toggle-outline")}
                />
                <TabItem
                    active={activeTab === "notes"}
                    onclick={() => (activeTab = "notes")}
                    Icon={NoteIcon}
                    tooltip={m.notes_highlights() +
                        getShortcutHint(sidebarCommandsNode, "toggle-highlights")}
                />
                <TabItem
                    active={activeTab === "bookmarks"}
                    onclick={() => (activeTab = "bookmarks")}
                    Icon={BookmarkIcon}
                    tooltip={m.bookmarks() +
                        getShortcutHint(sidebarCommandsNode, "toggle-bookmarks")}
                />
            </Tabs>
        {:else}
            <h3>{m.settings()}</h3>
        {/if}
        <Button
            variant="close"
            size="default"
            square={true}
            onclick={onClose}
            aria-label={m.close()}
            tooltip={m.close() + getShortcutHint(sidebarCommandsNode, "close", "close-alt")}
            class="sidebar-close-btn"
        >
            ×
        </Button>
    </div>

    <div class="tab-content">
        {#if activeTab === "outline"}
            <OutlineSidebar
                {isOutlineLoading}
                {outlineList}
                bind:currentPage
                bind:scrollPosition
                {activeHeadings}
                {onClose}
            />
        {:else if activeTab === "notes"}
            <NotesSidebar {onClose} />
        {:else if activeTab === "bookmarks"}
            <BookmarksSidebar {onClose} />
        {:else if activeTab === "settings"}
            <SettingsSidebar />
        {/if}
    </div>
</div>

<style>
    .sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        background: color-mix(in srgb, var(--surface-color) 85%, transparent);
        backdrop-filter: blur(16px);
        display: flex;
        flex-direction: column;
        overflow: visible;
        z-index: var(--z-fixed);
        box-sizing: border-box;
    }

    .sidebar.left {
        left: 0;
        width: 380px;
        border-right: 3px solid var(--border-color);
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar.right {
        right: 0;
        width: 280px;
        border-left: 3px solid var(--border-color);
        box-shadow: -10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: color-mix(in srgb, var(--accent-active-color) 85%, transparent);
        border-bottom: 3px solid var(--border-color);
        flex-shrink: 0;
        position: relative;
        z-index: var(--z-10);
        height: 56px;
        overflow: hidden;
        gap: 12px;
        box-sizing: border-box;
    }

    .sidebar.left .sidebar-header {
        padding: 0 12px;
        padding-top: env(safe-area-inset-top);
        padding-left: calc(12px + env(safe-area-inset-left));
    }

    .sidebar.right .sidebar-header {
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top));
        padding-right: calc(16px + env(safe-area-inset-right));
    }

    .sidebar.right .sidebar-header h3 {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: 900;
        color: var(--text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    :global(.sidebar-tabs-list) {
        flex: 1;
        min-width: 0;
    }

    :global(.sidebar-close-btn) {
        flex-shrink: 0;
    }

    .tab-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .sidebar-backdrop {
        display: block;
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(4px);
        z-index: 190;
        cursor: pointer;
        animation: fade-in 0.2s ease-out;
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @media (--tiny-mobile) {
        .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            width: 100% !important;
            height: 100%;
            z-index: var(--z-modal-backdrop);
            border-left: none;
            border-right: none;
        }

        .sidebar.left {
            left: 0;
        }

        .sidebar.right {
            right: 0;
        }

        .sidebar-backdrop {
            position: fixed;
            z-index: 290;
        }
    }

    @media (max-height: 500px) {
        .sidebar-header {
            height: 48px;
        }
    }
</style>
