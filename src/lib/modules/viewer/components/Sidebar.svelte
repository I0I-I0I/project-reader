<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import MenuIcon from "$lib/shared/icons/MenuIcon.svelte"
    import NoteIcon from "$lib/shared/icons/NoteIcon.svelte"
    import BookmarkIcon from "$lib/shared/icons/BookmarkIcon.svelte"
    import { settingsStore } from "$lib/modules/settings"
    import { commandsStore, getShortcutHint, useCommands } from "$lib/modules/commands"
    import { createViewerSidebarCloseCommand } from "../commands/viewerSidebarCloseCommand"
    import { untrack } from "svelte"
    import type { FlatHeading } from "$lib/modules/pdf"
    import { Sidebar as GlobalSidebar, SidebarHeader } from "$lib/shared/ui/sidebar"
    import Tabs from "$lib/shared/ui/Tabs.svelte"
    import TabItem from "$lib/shared/ui/TabItem.svelte"
    import OutlineSidebar from "./OutlineSidebar.svelte"
    import NotesSidebar from "./NotesSidebar.svelte"
    import BookmarksSidebar from "./BookmarksSidebar.svelte"
    import SettingsSidebar from "./SettingsSidebar.svelte"
    import { notesStore } from "../stores/notesStore.svelte"
    import { modalManager } from "$lib/shared/ui/modal/modalManager.svelte"

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
        onMouseLeave?: (event: MouseEvent) => void
        showBackdrop?: boolean
        isOutlineLoading?: boolean
        outlineList?: FlatHeading[] | null
        currentPage?: number
        scrollPosition?: number
        activeHeadings?: Set<FlatHeading>
    }>()

    const initialSide = untrack(() => side)
    const isSettingsSidebar = initialSide === "right"
    const shortcutScope = commandsStore.activeScope ?? commandsStore.root

    function isEditableTarget(target: EventTarget | null) {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        )
    }

    const sidebarCommand = createViewerSidebarCloseCommand({
        label: () => (isSettingsSidebar ? m.keymap_close_settings() : m.keymap_close_sidebar()),
        englishLabel: () =>
            isSettingsSidebar
                ? m.keymap_close_settings({}, { locale: "en" })
                : m.keymap_close_sidebar({}, { locale: "en" }),
        disabled: () =>
            (!isSettingsSidebar && modalManager.hasBlockingModal) ||
            !!notesStore.editingNote ||
            !!notesStore.activePopup,
        shouldHandleKey: (event: KeyboardEvent) => {
            if (!isEditableTarget(event.target)) return true

            const key = event.key.toLowerCase()
            return key !== "q" && (isSettingsSidebar || key !== "escape")
        },
        close: () => onClose(),
    })
    const sidebarCommandsNode = useCommands(
        [sidebarCommand],
        isSettingsSidebar ? shortcutScope : undefined,
    )

    function closeSidebar() {
        void sidebarCommandsNode.execute("viewer.sidebar.close")
    }
</script>

{#snippet header()}
    <SidebarHeader
        {side}
        onClose={closeSidebar}
        closeLabel={m.close()}
        closeTooltip={m.close() + getShortcutHint(sidebarCommandsNode, "viewer.sidebar.close")}
    >
        {#if side === "left"}
            <Tabs class="sidebar-tabs-list" activeValue={activeTab}>
                <TabItem
                    active={activeTab === "outline"}
                    onclick={() => void shortcutScope.execute("viewer.sidebar.outline.toggle")}
                    Icon={MenuIcon}
                    tooltip={m.outline() +
                        getShortcutHint(shortcutScope, "viewer.sidebar.outline.toggle")}
                />
                <TabItem
                    active={activeTab === "notes"}
                    onclick={() => void shortcutScope.execute("viewer.sidebar.notes.toggle")}
                    Icon={NoteIcon}
                    tooltip={m.notes_highlights() +
                        getShortcutHint(shortcutScope, "viewer.sidebar.notes.toggle")}
                />
                <TabItem
                    active={activeTab === "bookmarks"}
                    onclick={() => void shortcutScope.execute("viewer.sidebar.bookmarks.toggle")}
                    Icon={BookmarkIcon}
                    tooltip={m.bookmarks() +
                        getShortcutHint(shortcutScope, "viewer.sidebar.bookmarks.toggle")}
                />
            </Tabs>
        {:else}
            <h3>{m.settings()}</h3>
        {/if}
    </SidebarHeader>
{/snippet}

<GlobalSidebar
    {side}
    {showBackdrop}
    onClose={closeSidebar}
    {onMouseLeave}
    duration={settingsStore.animations ? 150 : 0}
    backdropLabel={m.close()}
    ariaLabel={side === "right" ? m.settings() : m.outline()}
    {header}
>
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
</GlobalSidebar>

<style>
    :global(.sidebar-tabs-list) {
        flex: 1;
        min-width: 0;
    }

    h3 {
        margin: 0;
        color: var(--text-color);
        font-size: var(--font-size-lg);
        font-weight: 900;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }
</style>
