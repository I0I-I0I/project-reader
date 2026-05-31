<script lang="ts">
    import type { Component, Snippet } from "svelte"
    import type { HTMLButtonAttributes } from "svelte/elements"

    interface Props extends HTMLButtonAttributes {
        children?: Snippet
        Icon?: Component
        on_hover?: string
        variant?: "action" | "fab" | "brutalist" | "ghost" | "none" | "close"
        size?: "none" | "small" | "default" | "large"
        square?: boolean
        open?: boolean
        href?: string
    }

    let {
        children,
        Icon,
        on_hover,
        variant = "action",
        size = "default",
        square = false,
        open = false,
        href,
        class: className = "",
        ...props
    }: Props = $props()
</script>

{#if href}
    <a
        {href}
        class={[
            "button",
            variant === "action" ? "action-btn" : "",
            variant === "fab" ? "fab-prompt" : "",
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
        {...props as any}
    >
        {#if Icon}
            <Icon />
        {/if}
        {@render children?.()}

        {#if on_hover}
            <span class="tooltip" role="tooltip">{on_hover}</span>
        {/if}
    </a>
{:else}
    <button
        class={[
            "button",
            variant === "action" ? "action-btn" : "",
            variant === "fab" ? "fab-prompt" : "",
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
        {...props}
    >
        {#if Icon}
            <Icon />
        {/if}
        {@render children?.()}

        {#if on_hover}
            <span class="tooltip" role="tooltip">{on_hover}</span>
        {/if}
    </button>
{/if}

<style>
    :global(html.light) .button {
        --btn-fab-accent: #00cec9;
        --btn-fab-accent-active: #ffde4d;
        --btn-accent-active: #ffde4d;
        --btn-brutalist-hover-bg: #00cec9;
        --btn-bg: #ffffff;
        --btn-hover-bg: #faf8f5;
        --btn-border: #1a1a1a;
        --btn-shadow: #1a1a1a;
        --btn-text: #1a1a1a;
        --btn-ghost-hover-bg: rgba(0, 0, 0, 0.05);
        --btn-tooltip-bg: #1a1a1a;
        --btn-tooltip-text: #f5f0e1;
        --btn-close-hover-bg: #ff7675;
        --btn-close-hover-text: #ffffff;
    }

    :global(html.dark) .button {
        --btn-fab-accent: #7b9c7a;
        --btn-fab-accent-active: #917c05;
        --btn-accent-active: #917c05;
        --btn-brutalist-hover-bg: #b85244;
        --btn-bg: #241f1c;
        --btn-hover-bg: #2e2824;
        --btn-border: #5c5146;
        --btn-shadow: #100d0b;
        --btn-text: #d2c7b1;
        --btn-ghost-hover-bg: rgba(210, 199, 177, 0.08);
        --btn-tooltip-bg: #d2c7b1;
        --btn-tooltip-text: #1b1715;
        --btn-close-hover-bg: #b85244;
        --btn-close-hover-text: #ffffff;
    }

    .button {
        text-decoration: none;
    }

    .action-btn {
        background: var(--btn-bg, var(--button-bg, #ffffff));
        border: 2px solid var(--btn-border, var(--border-color, #1a1a1a));
        box-shadow: 3px 3px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
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
            box-shadow: 4px 4px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
            background: var(--btn-hover-bg, var(--button-hover-bg, #faf8f5));
        }

        .action-btn.square:hover:not(:disabled) {
            background: var(--btn-fab-accent, #faf8f5);
        }
    }

    .action-btn:active:not(:disabled),
    .action-btn.active:not(:disabled),
    .action-btn.open {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
        background: var(--btn-fab-accent-active, var(--btn-accent-active, #eae6d8));
        border-color: var(--btn-border, var(--border-color, #1a1a1a));
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
        transform: translate(1px, 1px);
    }

    .fab-prompt {
        background: var(--btn-fab-accent, #faf8f5);
        border: 3px solid var(--btn-border, var(--border-color, #1a1a1a));
        box-shadow: 6px 6px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
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
        .fab-prompt:hover:not(:disabled) {
            transform: translate(-2px, -2px);
            box-shadow: 8px 8px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
            background: var(--btn-fab-accent-active, var(--btn-accent-active, #eae6d8));
        }
    }

    .fab-prompt:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
    }

    .fab-prompt :global(svg) {
        width: 22px;
        height: 22px;
    }

    @media (max-width: 800px), (max-height: 500px) {
        .fab-prompt {
            width: 44px;
            height: 44px;
            border-width: 2px;
            box-shadow: 4px 4px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
        }

        .fab-prompt :global(svg) {
            width: 18px;
            height: 18px;
        }
    }

    .brutalist-btn {
        background: var(--btn-bg, var(--button-bg, #ffffff));
        border: 2px solid var(--btn-border, var(--border-color, #1a1a1a));
        box-shadow: 2px 2px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
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
            box-shadow: 4px 4px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
            background: var(--btn-brutalist-hover-bg, var(--button-hover-bg, #faf8f5));
        }
    }

    .brutalist-btn:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 0px 0px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
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
            background: var(--btn-ghost-hover-bg, var(--link-hover-bg, rgba(0, 0, 0, 0.05)));
        }
    }

    .close-btn {
        background: var(--button-bg);
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
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 8px 16px;
    }

    .close-btn.square {
        padding: 0;
    }

    @media (hover: hover) {
        .close-btn:hover:not(:disabled) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
            background: var(--btn-close-hover-bg, var(--button-hover-bg, #faf8f5));
            color: var(--btn-close-hover-text, var(--text-color, #1a1a1a));
        }
    }

    .close-btn:active:not(:disabled) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--btn-shadow, var(--shadow-color, #1a1a1a));
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
        box-sizing: border-box;
    }

    .size-none {
        padding: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }

    .tooltip {
        position: absolute;
        bottom: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        background-color: var(--btn-tooltip-bg, var(--tooltip-bg, #1a1a1a));
        color: var(--btn-tooltip-text, var(--tooltip-text, #f5f0e1));
        padding: 6px 12px;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        white-space: nowrap;
        border-radius: 4px;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition:
            opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 100;
    }

    .tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: var(--btn-tooltip-bg, var(--tooltip-bg, #1a1a1a)) transparent transparent
            transparent;
    }

    .action-btn:focus-visible .tooltip,
    .fab-prompt:focus-visible .tooltip,
    .brutalist-btn:focus-visible .tooltip,
    .ghost-btn:focus-visible .tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
    }

    @media (hover: hover) {
        .action-btn:hover .tooltip,
        .fab-prompt:hover .tooltip,
        .brutalist-btn:hover .tooltip,
        .ghost-btn:hover .tooltip {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }
    }

    .action-btn :global(svg),
    .fab-prompt :global(svg),
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
