<script lang="ts">
    import type { Snippet } from "svelte"
    import Button from "../Button.svelte"

    let {
        side = "left",
        title,
        children,
        onClose,
        closeLabel = "Close",
        closeTooltip,
    } = $props<{
        side?: "left" | "right"
        title?: string
        children?: Snippet
        onClose?: () => void
        closeLabel?: string
        closeTooltip?: string
    }>()
</script>

<header class={["sidebar-header", side]}>
    <div class="sidebar-header-content">
        {#if children}
            {@render children()}
        {:else if title}
            <h2>{title}</h2>
        {/if}
    </div>
    {#if onClose}
        <Button
            variant="close"
            size="default"
            square
            onclick={onClose}
            aria-label={closeLabel}
            tooltip={closeTooltip}
            class="sidebar-close-btn"
        >
            ×
        </Button>
    {/if}
</header>

<style>
    .sidebar-header {
        position: relative;
        z-index: var(--z-10);
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        height: 56px;
        gap: 12px;
        overflow: hidden;
        border-bottom: 3px solid var(--border-color);
        background: color-mix(in srgb, var(--accent-active-color) 85%, transparent);
    }

    .sidebar-header.left {
        padding: env(safe-area-inset-top) 12px 0 calc(12px + env(safe-area-inset-left));
    }

    .sidebar-header.right {
        padding: calc(10px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) 10px
            16px;
    }

    .sidebar-header-content {
        flex: 1;
        min-width: 0;
    }

    h2 {
        margin: 0;
        color: var(--text-color);
        font-size: var(--font-size-lg);
        font-weight: 900;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    :global(.sidebar-close-btn) {
        flex-shrink: 0;
    }

    @media (max-height: 500px) {
        .sidebar-header {
            height: 48px;
        }
    }
</style>
