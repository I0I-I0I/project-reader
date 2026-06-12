<script lang="ts">
    import type { Component } from "svelte"

    interface Props {
        active?: boolean
        onclick?: (e: MouseEvent) => void
        label?: string
        Icon?: Component
        title?: string
        class?: string
    }

    let {
        active = false,
        onclick,
        label,
        Icon,
        title,
        class: className = "",
    }: Props = $props()

    let element = $state<HTMLElement | null>(null)

    $effect(() => {
        if (active && element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
            })
        }
    })
</script>

<button
    bind:this={element}
    class="tab-item {className}"
    class:active
    {onclick}
    {title}
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
        gap: 8px;
        padding: 6px 12px;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        color: var(--text-color);
        font-family: inherit;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        flex-shrink: 0;
    }

    @media (hover: hover) {
        .tab-item:hover:not(.active) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--surface-hover-color);
        }
    }

    .tab-item.active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--accent-active-color);
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
            padding: 6px 10px;
        }
    }
</style>
