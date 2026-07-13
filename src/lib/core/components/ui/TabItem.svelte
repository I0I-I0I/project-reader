<script lang="ts">
    import type { Component } from "svelte"
    import { tooltip as tooltipAction } from "$lib/core/actions/tooltip"

    interface Props {
        active?: boolean
        onclick?: (e: MouseEvent) => void
        label?: string
        Icon?: Component
        tooltip?: string
        tooltipAlign?: "left" | "right" | "center"
        title?: string
        class?: string
    }

    let {
        active = false,
        onclick,
        label,
        Icon,
        tooltip,
        tooltipAlign,
        title,
        class: className = "",
    }: Props = $props()

    function scrollActiveIntoView(isActive: boolean) {
        return (element: HTMLElement) => {
            if (!isActive) return
            element.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
            })
        }
    }

    const displayTooltip = $derived(tooltip || title)
</script>

<button
    {@attach scrollActiveIntoView(active)}
    class="tab-item {className}"
    class:active
    {onclick}
    use:tooltipAction={displayTooltip ? { text: displayTooltip, align: tooltipAlign } : undefined}
    aria-selected={active}
    role="tab"
>
    {#if Icon}
        <Icon />
    {/if}
    {#if label}
        <span class="tab-label">{label}</span>
    {/if}
</button>

<style>
    .tab-item {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 16px;
        background: transparent;
        border: none;
        color: var(--text-color);
        font-family: inherit;
        font-size: var(--font-size-sm);
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        flex-shrink: 0;
        flex: 1;
        min-width: max-content;
        position: relative;
        z-index: var(--z-2);
        box-sizing: border-box;
    }

    @media (hover: hover) {
        .tab-item:hover:not(.active) {
            background: var(--surface-hover-color);
        }
    }

    .tab-item.active {
        color: var(--text-color);
    }

    /* Vertical separators that don't touch the edges */
    .tab-item:not(:last-child)::after {
        content: "";
        position: absolute;
        right: 0;
        top: 25%;
        bottom: 25%;
        width: 2px;
        background-color: var(--border-color);
        opacity: 0.2;
        transition: opacity 0.1s ease;
    }

    /* Hide separator adjacent to active tab to keep it clean */
    .tab-item.active::after,
    :global(.tab-item):has(+ :global(.tab-item.active))::after {
        opacity: 0;
    }

    :global(.tab-item svg) {
        width: 16px;
        height: 16px;
        stroke-width: 2.5;
    }

    @media (max-width: 480px) {
        .tab-label {
            display: none;
        }

        .tab-item {
            padding: 0 10px;
            min-width: 0;
        }
    }
</style>
