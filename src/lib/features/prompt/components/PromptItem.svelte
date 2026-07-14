<script lang="ts">
    import type { Component } from "svelte"
    import type { PromptOption } from "$lib/features/prompt/prompt.types"

    interface Props {
        id: string
        item: PromptOption<unknown>
        isSelected: boolean
        onclick: () => void
    }

    type PromptPresentation = {
        kind?: string
        leading?: Component
        leadingProps?: Record<string, unknown>
    }

    let { id, item, isSelected, onclick }: Props = $props()
    const presentation = $derived(item.presentation as PromptPresentation | undefined)
    const Leading = $derived(presentation?.leading)

    function shortcutParts(shortcut: string) {
        return shortcut.split("+").map((part) => part.trim())
    }
</script>

<button
    {id}
    type="button"
    role="option"
    aria-selected={isSelected}
    class={["result-item", isSelected && "selected"]}
    {onclick}
>
    <span class="option-mark" aria-hidden="true">
        {#if Leading}
            <Leading {...presentation?.leadingProps} />
        {:else}
            {presentation?.kind ?? "·"}
        {/if}
    </span>
    <span class="meta">
        <span class="label">{item.label}</span>
        {#if item.englishLabel && item.englishLabel !== item.label}
            <span class="english-label">({item.englishLabel})</span>
        {/if}
        {#if item.description}
            <span class="description">{item.description}</span>
        {/if}
    </span>
    <span class="action">
        {#if item.category}<span class="category">{item.category}</span>{/if}
        {#if item.keymap}
            <span class="shortcuts">
                {#each Array.isArray(item.keymap) ? item.keymap : [item.keymap] as shortcut, index (shortcut)}
                    {#if index > 0}<span class="separator">/</span>{/if}
                    {#each shortcutParts(shortcut) as key (key)}<kbd>{key}</kbd>{/each}
                {/each}
            </span>
        {/if}
    </span>
</button>

<style>
    .result-item {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 0.75rem;
        padding: 0.65rem 0.75rem;
        border: 2px solid transparent;
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--text-color);
        font: inherit;
        text-align: left;
        cursor: pointer;
    }

    .result-item:hover,
    .result-item.selected {
        background: var(--surface-hover-color);
    }

    .result-item.selected {
        border-color: var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        transform: translate(-1px, -1px);
    }

    .option-mark {
        display: grid;
        width: 2rem;
        height: 2rem;
        flex: 0 0 auto;
        place-items: center;
        border: 1.5px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-color);
        font-weight: 800;
        text-transform: uppercase;
    }

    .meta {
        display: grid;
        min-width: 0;
        flex: 1;
        grid-template-columns: auto 1fr;
        align-items: baseline;
        gap: 0.2rem 0.45rem;
    }

    .label {
        overflow: hidden;
        font-size: var(--font-size-xl);
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .english-label,
    .description {
        opacity: 0.55;
    }

    .description {
        grid-column: 1 / -1;
        overflow: hidden;
        font-size: var(--font-size-sm);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .action,
    .shortcuts {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .category {
        padding: 0.15rem 0.4rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-size: var(--font-size-2xs);
        font-weight: 700;
        text-transform: uppercase;
    }

    kbd {
        min-width: 1.2rem;
        padding: 0.2rem 0.35rem;
        border: 1.5px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--surface-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        font:
            700 var(--font-size-sm) ui-monospace,
            monospace;
        text-align: center;
    }

    .separator {
        opacity: 0.45;
    }

    @media (--prompt) {
        .action {
            display: none;
        }
    }
</style>
