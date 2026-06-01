<script lang="ts">
    import type { Snippet } from "svelte"
    import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte"
    import { createFloatingState } from "$lib/floating.svelte"

    interface Props {
        trigger: Snippet
        children: Snippet<[{ close: () => void }]>
        label?: string
        align?: "left" | "right"
    }

    let { trigger, children, label, align = "right" }: Props = $props()

    let isOpen = $state(false)
    let containerEl = $state<HTMLElement | null>(null)

    const floating = createFloatingState(() => containerEl, {
        defaultHorizontal: () => align,
        defaultVertical: "bottom",
    })

    function toggleDropdown() {
        isOpen = !isOpen
    }

    function close() {
        isOpen = false
    }

    $effect(() => {
        if (isOpen) {
            floating.update()
        }
    })

    $effect(() => {
        if (!isOpen) return

        function handleClickOutside(event: MouseEvent) {
            if (containerEl && !containerEl.contains(event.target as Node)) {
                isOpen = false
            }
        }

        document.addEventListener("click", handleClickOutside)
        return () => {
            document.removeEventListener("click", handleClickOutside)
        }
    })
</script>

<div class="switcher-wrapper" bind:this={containerEl}>
    <button
        class="switcher-trigger"
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
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .switcher-trigger:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--surface-hover-color);
        }
    }

    .switcher-trigger:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    :global(.chevron) {
        transition: transform 0.2s ease;
    }

    :global(.chevron.open) {
        transform: rotate(180deg);
    }

    .switcher-dropdown {
        position: absolute;
        z-index: 1000;
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
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        text-decoration: none;
        box-sizing: border-box;
        cursor: pointer;
        transition: all 0.1s ease;
    }

    @media (hover: hover) {
        :global(.dropdown-item:hover) {
            background: var(--surface-hover-color);
        }
    }

    :global(.dropdown-item.active) {
        background: var(--text-color);
        color: var(--bg-color);
    }

    @media (max-width: 480px) {
        :global(.switcher-trigger .current-label) {
            display: none;
        }

        .switcher-trigger {
            padding: 6px 8px;
        }
    }
</style>
