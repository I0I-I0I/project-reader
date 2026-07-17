<script lang="ts">
    import type { Snippet } from "svelte"
    import { cubicOut } from "svelte/easing"

    let {
        side = "left",
        showBackdrop = true,
        backdropLabel = "Close sidebar",
        onClose,
        onMouseLeave,
        duration = 150,
        width,
        ariaLabel = "Sidebar",
        header,
        search,
        children,
        footer,
    } = $props<{
        side?: "left" | "right"
        showBackdrop?: boolean
        backdropLabel?: string
        onClose?: () => void
        onMouseLeave?: (event: MouseEvent) => void
        duration?: number
        width?: string
        ariaLabel?: string
        header?: Snippet
        search?: Snippet
        children: Snippet
        footer?: Snippet
    }>()

    function closeFromBackdrop(event: MouseEvent) {
        event.stopPropagation()
        onClose?.()
    }

    function slideFromSide(_: HTMLElement, options: { duration?: number }) {
        return {
            duration: options.duration ?? duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                const translateX = side === "left" ? (eased - 1) * 100 : (1 - eased) * 100
                return `transform: translateX(${translateX}%);`
            },
        }
    }
</script>

{#if showBackdrop}
    <button
        class="sidebar-backdrop"
        type="button"
        aria-label={backdropLabel}
        onclick={closeFromBackdrop}
    ></button>
{/if}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<aside
    class={["sidebar", side]}
    style:--sidebar-width={width}
    transition:slideFromSide={{ duration }}
    onmouseleave={onMouseLeave}
    onclick={(event) => event.stopPropagation()}
    aria-label={ariaLabel}
>
    {@render header?.()}
    {@render search?.()}
    <div class="sidebar-body">{@render children()}</div>
    {@render footer?.()}
</aside>

<style>
    .sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: var(--z-fixed);
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        overflow: visible;
        background: color-mix(in srgb, var(--surface-color) 85%, transparent);
        backdrop-filter: blur(16px);
    }

    .sidebar.left {
        left: 0;
        width: var(--sidebar-width, 380px);
        border-right: 3px solid var(--border-color);
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar.right {
        right: 0;
        width: var(--sidebar-width, 280px);
        border-left: 3px solid var(--border-color);
        box-shadow: -10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar-body {
        display: flex;
        flex: 1;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
    }

    .sidebar-backdrop {
        position: absolute;
        inset: 0;
        z-index: 190;
        display: block;
        width: 100%;
        height: 100%;
        padding: 0;
        cursor: pointer;
        border: 0;
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(4px);
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
            z-index: var(--z-modal-backdrop);
            height: 100%;
            border-right: 0;
            border-left: 0;
        }

        .sidebar.left,
        .sidebar.right {
            width: 100%;
        }

        .sidebar-backdrop {
            position: fixed;
            z-index: 290;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .sidebar-backdrop {
            animation: none;
        }
    }
</style>
