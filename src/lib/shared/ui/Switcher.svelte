<script lang="ts">
    import type { Snippet } from "svelte"
    import { cubicOut } from "svelte/easing"
    import { motionPreferences } from "$lib/shared/state/motion.svelte"
    import ChevronIcon from "$lib/shared/icons/ChevronIcon.svelte"
    import { createFloatingState } from "$lib/shared/state/floating.svelte"

    interface Props {
        trigger: Snippet
        children: Snippet<[{ close: () => void }]>
        label?: string
        align?: "left" | "right"
        class?: string
    }

    let { trigger, children, label, align = "right", class: className = "" }: Props = $props()

    let isOpen = $state(false)
    let containerEl = $state<HTMLElement | null>(null)

    const floating = createFloatingState({
        defaultHorizontal: () => align,
        defaultVertical: "bottom",
    })
    const attachFloating = (
        floating as typeof floating & {
            attach: (node: HTMLElement) => void | (() => void)
        }
    ).attach

    function toggleDropdown() {
        isOpen = !isOpen
        if (isOpen) floating.update()
    }

    function close() {
        isOpen = false
    }

    function handleClickOutside(event: MouseEvent) {
        if (isOpen && containerEl && !containerEl.contains(event.target as Node)) {
            isOpen = false
        }
    }

    function expandFromTrigger(node: HTMLElement, { duration = 180 } = {}) {
        if (!motionPreferences.enabled) {
            return { duration: 0 }
        }

        const triggerEl = node.parentElement?.querySelector(".switcher-trigger") as HTMLElement
        if (!triggerEl) return {}

        const triggerRect = triggerEl.getBoundingClientRect()
        const dropdownRect = node.getBoundingClientRect()
        const parentRect = node.parentElement!.getBoundingClientRect()

        const triggerLeft = triggerRect.left - parentRect.left
        const triggerTop = triggerRect.top - parentRect.top
        const dropdownLeft = dropdownRect.left - parentRect.left
        const dropdownTop = dropdownRect.top - parentRect.top

        const w1 = triggerRect.width
        const h1 = triggerRect.height
        const w2 = dropdownRect.width
        const h2 = dropdownRect.height

        const sx = w1 / w2
        const sy = h1 / h2

        const cx1 = triggerLeft + w1 / 2
        const cy1 = triggerTop + h1 / 2
        const cx2 = dropdownLeft + w2 / 2
        const cy2 = dropdownTop + h2 / 2

        const dx = cx1 - cx2
        const dy = cy1 - cy2

        const isAlignCenter = node.classList.contains("align-center")
        const baseTransform = isAlignCenter ? "translateX(-50%)" : ""

        return {
            duration,
            easing: cubicOut,
            css: (t: number, u: number) => {
                const currentSx = sx + (1 - sx) * t
                const currentSy = sy + (1 - sy) * t
                const currentDx = dx * u
                const currentDy = dy * u
                return `
                    transform-origin: center;
                    transform: ${baseTransform} translate(${currentDx}px, ${currentDy}px) scale(${currentSx}, ${currentSy});
                    opacity: ${t};
                `
            },
        }
    }
</script>

<svelte:document onclick={handleClickOutside} />

<div class={`switcher-wrapper ${className}`} bind:this={containerEl} {@attach attachFloating}>
    <button
        class="switcher-trigger"
        class:open={isOpen}
        onclick={toggleDropdown}
        onkeydown={(e) => {
            if (e.key === "Escape" && isOpen) {
                isOpen = false
            }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={label}
    >
        {@render trigger()}
        <ChevronIcon class="chevron {isOpen ? 'open' : ''}" />
    </button>

    {#if isOpen}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <ul
            transition:expandFromTrigger
            class="switcher-dropdown"
            class:pos-top={floating.vertical === "top"}
            class:pos-bottom={floating.vertical === "bottom"}
            class:align-left={floating.horizontal === "left"}
            class:align-center={floating.horizontal === "center"}
            class:align-right={floating.horizontal === "right"}
            onkeydown={(e) => {
                if (e.key === "Escape") {
                    isOpen = false
                    containerEl?.querySelector("button")?.focus()
                }
            }}
        >
            {@render children({ close })}
        </ul>
    {/if}
</div>

<style>
    .switcher-wrapper {
        position: relative;
        display: inline-block;
        font-family: inherit;
    }

    .switcher-trigger {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        color: var(--text-color);
        padding: 6px 12px;
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: var(--font-size-base);
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .switcher-trigger:hover:not(:active):not(.open),
        .switcher-trigger:focus-visible:not(:active):not(.open) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--surface-hover-color);
            outline: none;
        }
    }

    .switcher-trigger:active,
    .switcher-trigger.open {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--accent-active-color);
    }

    :global(.chevron) {
        transition: transform 0.2s ease;
    }

    :global(.chevron.open) {
        transform: rotate(180deg);
    }

    .switcher-dropdown {
        position: absolute;
        z-index: var(--z-modal);
        list-style: none;
        margin: 0;
        padding: 4px;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        min-width: 140px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .pos-bottom {
        top: calc(100% + 8px);
        bottom: auto;
    }

    .pos-top {
        bottom: calc(100% + 8px);
        top: auto;
    }

    .align-right {
        right: 0;
        left: auto;
    }

    .align-left {
        left: 0;
        right: auto;
    }

    .align-center {
        left: 50%;
        transform: translateX(-50%);
        right: auto;
    }

    :global(.switcher-dropdown li) {
        display: block;
    }

    :global(.dropdown-item) {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        background: none;
        border: none;
        color: var(--text-color);
        padding: 8px 12px;
        font-size: var(--font-size-base);
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        text-decoration: none;
        box-sizing: border-box;
        cursor: pointer;
        transition: all 0.1s ease;
    }

    @media (hover: hover) {
        :global(.dropdown-item:hover),
        :global(.dropdown-item:focus-visible) {
            background: var(--surface-hover-color);
            outline: none;
        }
    }

    :global(.dropdown-item.active) {
        background: var(--text-color);
        color: var(--bg-color);
    }

    @media (--tiny-mobile) {
        :global(.switcher-trigger .current-label) {
            display: none;
        }

        .switcher-trigger {
            padding: 6px 8px;
        }
    }
</style>
