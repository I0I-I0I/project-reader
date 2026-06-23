<script lang="ts">
    import type { Component, Snippet } from "svelte"
    import type { HTMLButtonAttributes } from "svelte/elements"
    import { tooltip as tooltipAction } from "$lib/core/actions/tooltip"

    interface Props extends HTMLButtonAttributes {
        children?: Snippet
        Icon?: Component
        tooltip?: string
        tooltipAlign?: "left" | "right" | "center"
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
        tooltipAlign,
        title,
        variant = "action",
        size = "default",
        square = false,
        open = false,
        href,
        class: className = "",
        ...props
    }: Props = $props()

    const displayTooltip = $derived(tooltip || title)
</script>

{#if href}
    <a
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
        use:tooltipAction={displayTooltip
            ? { text: displayTooltip, align: tooltipAlign }
            : undefined}
        {...props as any}
    >
        {#if Icon}
            <Icon />
        {/if}
        {@render children?.()}
    </a>
{:else}
    <button
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
        use:tooltipAction={displayTooltip
            ? { text: displayTooltip, align: tooltipAlign }
            : undefined}
        {...props}
    >
        {#if Icon}
            <Icon />
        {/if}
        {@render children?.()}
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
        font-size: var(--font-size-lg);
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
        line-height: 1.2;
        text-align: center;
    }

    .button.square {
        padding: 0 !important;
        flex-shrink: 0 !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    @media (hover: hover) {
        .action-btn:hover:not(:disabled):not(:active):not(.active):not(.open),
        .action-btn:focus-visible:not(:disabled):not(:active):not(.active):not(.open) {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--surface-hover-color, var(--surface-hover-color, #faf8f5));
            outline: none;
        }

        .action-btn.square:hover:not(:disabled):not(:active):not(.active):not(.open),
        .action-btn.square:focus-visible:not(:disabled):not(:active):not(.active):not(.open) {
            background: var(--accent-color, #faf8f5);
            outline: none;
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
        z-index: var(--z-sticky);
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
        min-height: 50px;
    }

    @media (hover: hover) {
        .fab-btn:hover:not(:disabled):not(:active):not(.active):not(.open),
        .fab-btn:focus-visible:not(:disabled):not(:active):not(.active):not(.open) {
            transform: translate(-2px, -2px);
            box-shadow: 8px 8px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--accent-active-color, var(--accent-active-color, #eae6d8));
            outline: none;
        }
    }

    .fab-btn:active:not(:disabled),
    .fab-btn.active:not(:disabled),
    .fab-btn.open {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        background: var(--accent-active-color, var(--accent-active-color, #eae6d8));
    }

    @media (--mobile) {
        .fab-btn {
            border-width: 2px;
            box-shadow: 4px 4px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
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
        font-size: var(--font-size-lg);
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        color: var(--btn-text, var(--text-color, #1a1a1a));
        position: relative;
        user-select: none;
        box-sizing: border-box;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        line-height: 1.2;
        text-align: center;
    }

    @media (hover: hover) {
        .brutalist-btn:hover:not(:disabled):not(:active):not(.active):not(.open),
        .brutalist-btn:focus-visible:not(:disabled):not(:active):not(.active):not(.open) {
            transform: translate(-2px, -2px);
            box-shadow: 4px 4px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--accent-color, var(--surface-hover-color, #faf8f5));
            outline: none;
        }
    }

    .brutalist-btn:active:not(:disabled),
    .brutalist-btn.active:not(:disabled),
    .brutalist-btn.open {
        transform: translate(2px, 2px);
        box-shadow: 0px 0px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        background: var(--accent-active-color, var(--accent-active-color, #eae6d8));
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
        font-size: var(--font-size-lg);
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        color: var(--btn-text, var(--text-color, #1a1a1a));
        position: relative;
        user-select: none;
        box-sizing: border-box;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        line-height: 1.2;
        text-align: center;
    }

    @media (hover: hover) {
        .ghost-btn:hover:not(:disabled):not(:active):not(.active):not(.open),
        .ghost-btn:focus-visible:not(:disabled):not(:active):not(.active):not(.open) {
            background: var(--faded-color, var(--faded-color, rgba(0, 0, 0, 0.05)));
            outline: none;
        }
    }

    .ghost-btn:active:not(:disabled),
    .ghost-btn.active:not(:disabled),
    .ghost-btn.open {
        background: var(--faded-color, var(--faded-color, rgba(0, 0, 0, 0.1)));
    }

    .close-btn {
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: var(--font-size-lg);
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
        line-height: 1.2;
        text-align: center;
    }

    @media (hover: hover) {
        .close-btn:hover:not(:disabled):not(:active):not(.active):not(.open),
        .close-btn:focus-visible:not(:disabled):not(:active):not(.active):not(.open) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
            background: var(--danger-active-color, var(--surface-hover-color, #faf8f5));
            color: var(--danger-text-color, var(--text-color, #1a1a1a));
            outline: none;
        }
    }

    .close-btn:active:not(:disabled),
    .close-btn.active:not(:disabled),
    .close-btn.open {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color, var(--shadow-color, #1a1a1a));
        background: var(--danger-active-color, var(--surface-hover-color, #faf8f5));
        color: var(--danger-text-color, var(--text-color, #1a1a1a));
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

    /* Hover/Focus Stacking Context */
    .button:focus-visible,
    .button:hover {
        z-index: 110;
    }

    .action-btn :global(svg),
    .fab-btn :global(svg),
    .brutalist-btn :global(svg),
    .ghost-btn :global(svg) {
        stroke-width: 2.5;
    }

    .default-size {
        min-height: 36px;

        :global(svg) {
            width: 24px;
            height: 24px;
        }

        @media (--mobile) {
            min-height: 34px;

            :global(svg) {
                width: 22px;
                height: 22px;
            }
        }
    }

    .default-size.square {
        max-width: 36px;
        min-width: 36px;
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px;

        :global(svg) {
            width: 24px;
            height: 24px;
        }

        @media (--mobile) {
            max-width: 34px;
            min-width: 34px;
            height: 34px !important;
            min-height: 34px !important;
            max-height: 34px;

            :global(svg) {
                width: 22px;
                height: 22px;
            }
        }
    }

    .large-size {
        min-height: 48px;

        :global(svg) {
            width: 32px;
            height: 32px;
        }

        @media (--mobile) {
            min-height: 40px;

            :global(svg) {
                width: 28px;
                height: 28px;
            }
        }
    }

    .large-size.square {
        max-width: 48px;
        min-width: 48px;
        height: 48px !important;
        min-height: 48px !important;
        max-height: 48px;

        @media (--mobile) {
            max-width: 40px;
            min-width: 40px;
            height: 40px !important;
            min-height: 40px !important;
            max-height: 40px;

            :global(svg) {
                width: 28px;
                height: 28px;
            }
        }
    }

    .small-size {
        min-height: 26px;

        :global(svg) {
            width: 18px;
            height: 18px;
        }

        @media (--mobile) {
            min-height: 22px;

            :global(svg) {
                width: 15px;
                height: 15px;
            }
        }
    }

    .small-size.square {
        max-width: 26px;
        min-width: 26px;
        height: 26px !important;
        min-height: 26px !important;
        max-height: 26px;

        :global(svg) {
            width: 18px;
            height: 18px;
        }

        @media (--mobile) {
            max-width: 22px;
            min-width: 22px;
            height: 22px !important;
            min-height: 22px !important;
            max-height: 22px;

            :global(svg) {
                width: 15px;
                height: 15px;
            }
        }
    }
</style>
