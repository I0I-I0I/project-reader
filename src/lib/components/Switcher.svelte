<script lang="ts">
    import type { Snippet } from "svelte"

    interface Props {
        trigger: Snippet
        children: Snippet<[{ close: () => void }]>
        label?: string
        align?: "left" | "right"
    }

    let { trigger, children, label, align = "right" }: Props = $props()

    let isOpen = $state(false)
    let containerEl = $state<HTMLElement | null>(null)

    function toggleDropdown() {
        isOpen = !isOpen
    }

    function close() {
        isOpen = false
    }

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
        <svg
            class="chevron"
            class:open={isOpen}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    </button>

    {#if isOpen}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <ul
            class="switcher-dropdown"
            class:align-left={align === "left"}
            class:align-right={align === "right"}
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
        background: var(--button-bg);
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

    .switcher-trigger:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--button-hover-bg);
    }

    .switcher-trigger:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .chevron {
        transition: transform 0.2s ease;
    }

    .chevron.open {
        transform: rotate(180deg);
    }

    .switcher-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        z-index: 1000;
        list-style: none;
        margin: 0;
        padding: 4px;
        border: 2px solid var(--border-color);
        background: var(--dropdown-bg);
        box-shadow: 4px 4px 0 var(--shadow-color);
        min-width: 140px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .align-right {
        right: 0;
    }

    .align-left {
        left: 0;
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

    :global(.dropdown-item:hover) {
        background: var(--dropdown-hover-bg);
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
