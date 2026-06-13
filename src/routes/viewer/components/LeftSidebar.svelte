<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import MenuIcon from "$lib/components/icons/MenuIcon.svelte"
    import NoteIcon from "$lib/components/icons/NoteIcon.svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { cubicOut } from "svelte/easing"
    import { getShortcutHint, type CommandNode } from "$lib/stores/commandsStore.svelte"
    import { getContext } from "svelte"
    import type { FlatHeading } from "$lib/pdf"

    import Tabs from "$lib/components/ui/Tabs.svelte"
    import TabItem from "$lib/components/ui/TabItem.svelte"
    import OutlineSidebar from "./OutlineSidebar.svelte"
    import NotesSidebar from "./NotesSidebar.svelte"
    import BookmarksSidebar from "./BookmarksSidebar.svelte"
    import BookmarkIcon from "$lib/components/icons/BookmarkIcon.svelte"

    let {
        activeTab = $bindable("outline"),
        onClose,
        onMouseLeave,
        isOutlineLoading,
        outlineList,
        currentPage = $bindable(),
        scrollPosition = $bindable(),
        activeHeadings,
    } = $props<{
        activeTab: "outline" | "notes" | "bookmarks"
        onClose: () => void
        onMouseLeave?: (e: MouseEvent) => void
        isOutlineLoading: boolean
        outlineList: FlatHeading[] | null
        currentPage: number
        scrollPosition: number
        activeHeadings: Set<FlatHeading>
    }>()

    const commandsNode = getContext<CommandNode>("commands_node")

    function slideFromLeft(_: HTMLElement, { duration = 150 }) {
        return {
            duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                return `
                    transform: translateX(${(eased - 1) * 100}%);
                `
            },
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="left-sidebar"
    transition:slideFromLeft={{ duration: settingsStore.animations ? 150 : 0 }}
    onmouseleave={onMouseLeave}
    onclick={(e) => e.stopPropagation()}
>
    <div class="sidebar-tabs">
        <Tabs class="sidebar-tabs-list" activeValue={activeTab}>
            <TabItem
                active={activeTab === "outline"}
                onclick={() => (activeTab = "outline")}
                label={m.outline()}
                Icon={MenuIcon}
                title={m.outline()}
            />
            <TabItem
                active={activeTab === "notes"}
                onclick={() => (activeTab = "notes")}
                label={m.notes_highlights()}
                Icon={NoteIcon}
                title={m.notes_highlights()}
            />
            <TabItem
                active={activeTab === "bookmarks"}
                onclick={() => (activeTab = "bookmarks")}
                label={m.bookmarks ? m.bookmarks() : "Bookmarks"}
                Icon={BookmarkIcon}
                title={m.bookmarks ? m.bookmarks() : "Bookmarks"}
            />
        </Tabs>
        <Button
            variant="close"
            size="default"
            square={true}
            onclick={onClose}
            aria-label={m.close()}
            tooltip={m.close()}
            class="sidebar-close-btn"
        >
            ×
        </Button>
    </div>

    <div class="tab-content">
        {#if activeTab === "outline"}
            <OutlineSidebar
                minimal={true}
                {isOutlineLoading}
                {outlineList}
                bind:currentPage
                bind:scrollPosition
                {activeHeadings}
                onCloseOutline={onClose}
            />
        {:else if activeTab === "notes"}
            <NotesSidebar minimal={true} {onClose} />
        {:else if activeTab === "bookmarks"}
            <BookmarksSidebar minimal={true} {onClose} />
        {/if}
    </div>
</div>

<style>
    .left-sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 380px;
        background: color-mix(in srgb, var(--surface-color) 85%, transparent);
        backdrop-filter: blur(16px);
        border-right: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: visible;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar-tabs {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: color-mix(in srgb, var(--accent-active-color) 85%, transparent);
        border-bottom: 3px solid var(--border-color);
        padding: 0 8px;
        padding-top: env(safe-area-inset-top);
        padding-left: calc(8px + env(safe-area-inset-left));
        flex-shrink: 0;
        position: relative;
        z-index: 10;
        height: 56px;
        overflow: hidden;
        gap: 12px;
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

    @media (--tiny-mobile) {
        .left-sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 300;
            border-right: none;
        }
    }

    @media (max-height: 500px) {
        .sidebar-tabs {
            height: 48px;
        }
    }
</style>
