<script lang="ts">
    import type { Component, Snippet } from "svelte"
    import type { HTMLButtonAttributes } from "svelte/elements"

    interface Props extends HTMLButtonAttributes {
        children?: Snippet
        Icon?: Component
        tooltip?: string
        variant?: "action" | "fab" | "brutalist" | "ghost" | "none" | "close"
        size?: "none" | "small" | "default" | "large"
        square?: boolean
        open?: boolean
        href?: string
    }

    let {
        children,
        Icon,
        tooltip,
        title,
        variant = "action",
        size = "default",
        square = false,
        open = false,
        href,
        class: className = "",
        onmouseenter,
        onfocus,
        ...props
    }: Props = $props()

    const displayTooltip = $derived(tooltip || title)

    let buttonNode = $state<HTMLElement | null>(null)
    let tooltipClass = $state("tooltip-top tooltip-align-center")

    function updateTooltipPosition() {
        if (!buttonNode) return
        const rect = buttonNode.getBoundingClientRect()
        const viewportWidth = window.innerWidth

        let tClass = ""

        if (rect.top < 120) {
            tClass += "tooltip-bottom "
        } else {
            tClass += "tooltip-top "
        }

        if (rect.left < 250) {
            tClass += "tooltip-align-left"
        } else if (viewportWidth - rect.right < 250) {
            tClass += "tooltip-align-right"
        } else {
            tClass += "tooltip-align-center"
        }

        tooltipClass = tClass
    }

    function handleMouseEnter(e: any) {
        if (displayTooltip) updateTooltipPosition()
        onmouseenter?.(e)
    }

    function handleFocus(e: any) {
        if (displayTooltip) updateTooltipPosition()
        onfocus?.(e)
    }
</script>

{#if href}
    <a
        bind:this={buttonNode}
        {href}
        class={[
            "button",
            variant === "action" ? "action-btn" : "",
            variant === "fab" ? "fab-btn" : "",
            variant === "brutalist" ? "brutalist-btn" : "",
            variant === "ghost" ? "ghost-btn" : "",
            variant === "none" ? "none-btn" : "",
            variant === "close" ? "close-btn" : "",
            size === "none" ? "size-none" : "",
            size === "small" ? "small-size" : "",
            size === "default" ? "default-size" : "",
            size === "large" ? "large-size" : "",
            square ? "square" : "",
            open ? "open" : "",
            className,
        ]
            .filter(Boolean)
            .join(" ")}
        onmouseenter={handleMouseEnter}
        onfocus={handleFocus}
        {...props as any}
    >
        {#if Icon}
            <Icon />
        {/if}
        {@render children?.()}

        {#if displayTooltip}
            <span class="tooltip {tooltipClass}" role="tooltip">{displayTooltip}</span>
        {/if}
    </a>
{:else}
    <button
        bind:this={buttonNode}
        class={[
            "button",
            variant === "action" ? "action-btn" : "",
            variant === "fab" ? "fab-btn" : "",
            variant === "brutalist" ? "brutalist-btn" : "",
            variant === "ghost" ? "ghost-btn" : "",
            variant === "none" ? "none-btn" : "",
            variant === "close" ? "close-btn" : "",
            size === "none" ? "size-none" : "",
            size === "small" ? "small-size" : "",
            size === "default" ? "default-size" : "",
            size === "large" ? "large-size" : "",
            square ? "square" : "",
            open ? "open" : "",
            className,
        ]
            .filter(Boolean)
            .join(" ")}
        onmouseenter={handleMouseEnter}
        onfocus={handleFocus}
        {...props}
    >
        {#if Icon}
            <Icon />
        {/if}
        {@render children?.()}

        {#if displayTooltip}
            <span class="tooltip {tooltipClass}" role="tooltip">{displayTooltip}</span>
        {/if}
    </button>
{/if}

<style>
    .action-btn {
        background: var(--surface-color, var(--surface-color, #ffffff));
        border: 2px solid var(--border-color, var(--border-color, #1a1a1a));
        box-shadow: 3px 3px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        padding: 8px 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        color: var(--btn-text, var(--text-color, #1a1a1a));
        position: relative;
        user-select: none;
        box-sizing: border-box;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .action-btn.square {
        width: 36px !important;
        height: 36px !important;
        padding: 0 !important;
        flex-shrink: 0 !important;
    }

    @media (hover: hover) {
        .action-btn:hover:not(:disabled) {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--surface-hover-color, var(--surface-hover-color, #faf8f5));
        }

        .action-btn.square:hover:not(:disabled) {
            background: var(--accent-color, #faf8f5);
        }
    }

    .action-btn:active:not(:disabled),
    .action-btn.active:not(:disabled),
    .action-btn.open {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        background: var(--accent-active-color, var(--accent-active-color, #eae6d8));
        border-color: var(--border-color, var(--border-color, #1a1a1a));
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        transform: translate(1px, 1px);
    }

    .fab-btn {
        background: var(--accent-color, #faf8f5);
        border: 3px solid var(--border-color, var(--border-color, #1a1a1a));
        box-shadow: 6px 6px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        position: relative;
        box-sizing: border-box;
        transition:
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--btn-text, var(--text-color, #1a1a1a));
        padding: 0;
        width: 50px;
        height: 50px;
    }

    @media (hover: hover) {
        .fab-btn:hover:not(:disabled) {
            transform: translate(-2px, -2px);
            box-shadow: 8px 8px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--accent-active-color, var(--accent-active-color, #eae6d8));
        }
    }

    .fab-btn:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
    }

    .fab-btn :global(svg) {
        width: 22px;
        height: 22px;
    }

    @media (max-width: 800px), (max-height: 500px) {
        .fab-btn {
            width: 44px;
            height: 44px;
            border-width: 2px;
            box-shadow: 4px 4px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        }

        .fab-btn :global(svg) {
            width: 18px;
            height: 18px;
        }
    }

    .brutalist-btn {
        background: var(--surface-color, var(--surface-color, #ffffff));
        border: 2px solid var(--border-color, var(--border-color, #1a1a1a));
        box-shadow: 2px 2px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        padding: 8px 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        color: var(--btn-text, var(--text-color, #1a1a1a));
        position: relative;
        user-select: none;
        box-sizing: border-box;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .brutalist-btn:hover:not(:disabled) {
            transform: translate(-2px, -2px);
            box-shadow: 4px 4px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--accent-color, var(--surface-hover-color, #faf8f5));
        }
    }

    .brutalist-btn:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 0px 0px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
    }

    .ghost-btn {
        background: transparent;
        border: 2px solid transparent;
        padding: 8px 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        color: var(--btn-text, var(--text-color, #1a1a1a));
        position: relative;
        user-select: none;
        box-sizing: border-box;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .ghost-btn:hover:not(:disabled) {
            background: var(--faded-color, var(--faded-color, rgba(0, 0, 0, 0.05)));
        }
    }

    .close-btn {
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        color: var(--text-color);
        position: relative;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 8px 16px;
    }

    .close-btn.square {
        padding: 0;
    }

    @media (hover: hover) {
        .close-btn:hover:not(:disabled) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--danger-active-color, var(--surface-hover-color, #faf8f5));
            color: var(--danger-text-color, var(--text-color, #1a1a1a));
        }
    }

    .close-btn:active:not(:disabled) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
    }

    .none-btn {
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        box-sizing: border-box;
    }

    .size-none {
        padding: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }

    .tooltip {
        position: absolute;
        background-color: var(--muted-bg-color, #1a1a1a);
        color: var(--muted-text-color, #f5f0e1);
        padding: 6px 12px;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        white-space: normal;
        max-width: 240px;
        width: max-content;
        word-break: break-word;
        border-radius: 4px;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition:
            opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 9999;
    }

    .tooltip::after {
        content: "";
        position: absolute;
        border-width: 5px;
        border-style: solid;
    }

    /* Vertical variations */
    .tooltip.tooltip-top {
        bottom: calc(100% + 10px);
    }
    .tooltip.tooltip-top::after {
        top: 100%;
        border-color: var(--muted-bg-color, #1a1a1a) transparent transparent transparent;
    }

    .tooltip.tooltip-bottom {
        top: calc(100% + 10px);
    }
    .tooltip.tooltip-bottom::after {
        bottom: 100%;
        border-color: transparent transparent var(--muted-bg-color, #1a1a1a) transparent;
    }

    /* Horizontal variations */
    .tooltip.tooltip-align-center {
        left: 50%;
        transform: translateX(-50%) translateY(4px);
    }
    .tooltip.tooltip-bottom.tooltip-align-center {
        transform: translateX(-50%) translateY(-4px);
    }
    .tooltip.tooltip-align-center::after {
        left: 50%;
        transform: translateX(-50%);
    }

    .tooltip.tooltip-align-left {
        left: -4px;
        transform: translateX(0) translateY(4px);
    }
    .tooltip.tooltip-bottom.tooltip-align-left {
        transform: translateX(0) translateY(-4px);
    }
    .tooltip.tooltip-align-left::after {
        left: 12px;
    }

    .tooltip.tooltip-align-right {
        right: -4px;
        transform: translateX(0) translateY(4px);
    }
    .tooltip.tooltip-bottom.tooltip-align-right {
        transform: translateX(0) translateY(-4px);
    }
    .tooltip.tooltip-align-right::after {
        right: 12px;
    }

    /* Visibility */
    .button:focus-visible .tooltip,
    .button:hover .tooltip {
        opacity: 1;
        visibility: visible;
    }

    .button:focus-visible .tooltip.tooltip-align-center,
    .button:hover .tooltip.tooltip-align-center {
        transform: translateX(-50%) translateY(0);
    }

    .button:focus-visible .tooltip.tooltip-align-left,
    .button:hover .tooltip.tooltip-align-left,
    .button:focus-visible .tooltip.tooltip-align-right,
    .button:hover .tooltip.tooltip-align-right {
        transform: translateX(0) translateY(0);
    }

    .action-btn :global(svg),
    .fab-btn :global(svg),
    .brutalist-btn :global(svg),
    .ghost-btn :global(svg) {
        stroke-width: 2.5;
    }

    .default-size {
        max-height: 36px;
        min-height: 36px;
    }

    .default-size.square {
        max-width: 36px;
        min-width: 36px;
    }

    .large-size {
        max-height: 48px;
        min-height: 48px;
    }

    .large-size.square {
        max-width: 48px;
        min-width: 48px;
    }

    .small-size {
        max-height: 26px;
        min-height: 26px;
    }

    .small-size.square {
        max-width: 26px;
        min-width: 26px;
    }
</style>
