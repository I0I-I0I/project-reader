<script lang="ts">
    import { page } from "$app/state"
    import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { searchStore } from "$lib/features/prompt/stores/searchStore.svelte"
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { fly } from "svelte/transition"
    import * as m from "$lib/paraglide/messages"

    let width = $state(220)

    let show = $derived.by(() => {
        const isViewer = page.url.pathname.includes("/viewer")
        if (!isViewer && uiStore.isSelectionMode && vfsStore.selectedIds.size > 0) {
            return true
        }
        if (isViewer && uiStore.isSearchModeActive && searchStore.matches.length > 0) {
            return true
        }
        if (!isViewer && vfsStore.uploadingFiles.length > 0) {
            return true
        }
        return false
    })

    let textLine1 = $derived.by(() => {
        const isViewer = page.url.pathname.includes("/viewer")
        if (!isViewer && uiStore.isSelectionMode && vfsStore.selectedIds.size > 0) {
            return `${vfsStore.selectedIds.size}`
        }
        if (isViewer && uiStore.isSearchModeActive && searchStore.matches.length > 0) {
            return `${searchStore.currentMatchIndex + 1} / ${searchStore.matches.length}`
        }
        if (!isViewer && vfsStore.uploadingFiles.length > 0) {
            return `${vfsStore.uploadingFiles.length}`
        }
        return ""
    })

    let textLine2 = $derived.by(() => {
        const isViewer = page.url.pathname.includes("/viewer")
        if (!isViewer && uiStore.isSelectionMode && vfsStore.selectedIds.size > 0) {
            return m.selected_label()
        }
        if (isViewer && uiStore.isSearchModeActive && searchStore.matches.length > 0) {
            return m.matched_label()
        }
        if (!isViewer && vfsStore.uploadingFiles.length > 0) {
            return m.importing_book
                ? m.importing_book().replace("...", "").trim().toUpperCase()
                : "IMPORTING"
        }
        return ""
    })

    let isViewerPage = $derived(page.url.pathname.includes("/viewer"))

    // Generate path for the chevron:
    // M width 2.5 (start at top-right corner)
    // L 22.5 2.5 (top-left edge)
    // L 42.5 35 (middle-left cut inward)
    // L 22.5 67.5 (bottom-left edge)
    // L width 67.5 (bottom-right corner)
    // Note: Do not close the path (omit Z) to avoid drawing a right border.
    let pathD = $derived(`M ${width} 2.5 L 22.5 2.5 L 42.5 35 L 22.5 67.5 L ${width} 67.5`)
</script>

{#if show}
    <div
        class="floating-notification"
        class:viewer-mode={isViewerPage}
        bind:clientWidth={width}
        transition:fly={{ x: 50, duration: settingsStore.animations ? 250 : 0 }}
    >
        <svg class="notification-svg" {width} height="70" viewBox="0 0 {width} 70">
            <path
                d={pathD}
                fill="var(--surface-color)"
                stroke="var(--accent-color)"
                stroke-width="5"
                stroke-linejoin="miter"
            />
        </svg>
        {#key textLine1}
            <div
                class="notification-text"
                in:fly={{ y: 8, duration: settingsStore.animations ? 120 : 0 }}
            >
                <div class="line1">{textLine1}</div>
                <div class="line2">{textLine2}</div>
            </div>
        {/key}
    </div>
{/if}

<style>
    .floating-notification {
        position: fixed;
        top: 24px;
        right: 0;
        z-index: 9999;
        display: inline-block;
        min-width: 180px;
        height: 70px;
        pointer-events: none;
        filter: drop-shadow(-6px 6px 0 var(--shadow-color));
        box-sizing: border-box;
    }

    .floating-notification.viewer-mode {
        top: 100px;
    }

    .notification-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: var(--z-1);
    }

    .notification-text {
        position: relative;
        z-index: var(--z-2);
        width: max-content;
        height: 70px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding-left: 55px;
        padding-right: 20px;
        box-sizing: border-box;
        font-family: inherit;
    }

    .line1 {
        font-size: var(--font-size-2xl);
        font-weight: 900;
        color: var(--text-color);
        line-height: 1.2;
    }

    .line2 {
        font-size: var(--font-size-sm);
        font-weight: 900;
        color: var(--faded-text-color);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        line-height: 1.2;
        margin-top: 2px;
    }

    @media (max-width: 800px) {
        .floating-notification {
            top: 16px;
            right: 0;
        }
        .floating-notification.viewer-mode {
            top: 76px;
        }
    }
</style>
