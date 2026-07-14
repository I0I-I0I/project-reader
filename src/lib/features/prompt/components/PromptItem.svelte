<script lang="ts">
    import type { Component } from "svelte"
    import BookIcon from "$lib/core/components/icons/BookIcon.svelte"
    import BookmarkIcon from "$lib/core/components/icons/BookmarkIcon.svelte"
    import CommandIcon from "$lib/core/components/icons/CommandIcon.svelte"
    import MenuIcon from "$lib/core/components/icons/MenuIcon.svelte"
    import NavigationIcon from "$lib/core/components/icons/NavigationIcon.svelte"
    import SettingsIcon from "$lib/core/components/icons/SettingsIcon.svelte"
    import { KeyboardHandler } from "$lib/features/commands/keyboard"
    import type { PromptItem } from "$lib/features/prompt/prompt.types"

    interface Props {
        id: string
        item: PromptItem<unknown>
        isSelected: boolean
        onclick: () => void
    }

    type PromptPresentation = {
        kind?: string
        leading?: Component
        leadingProps?: Record<string, unknown>
    }

    const groupIcons: Record<string, Component> = {
        bookmarks: BookmarkIcon,
        books: BookIcon,
        commands: CommandIcon,
        menu: MenuIcon,
        navigation: NavigationIcon,
        settings: SettingsIcon,
    }

    let { id, item, isSelected, onclick }: Props = $props()
    const presentation = $derived(item.presentation as PromptPresentation | undefined)
    const presentationKind = $derived(presentation?.kind ?? item.category)
    const Leading = $derived(
        presentation?.leading ?? groupIcons[presentationKind?.toLowerCase() ?? ""],
    )
    const shortcuts = $derived(item.keymap ? shortcutEntries(item.keymap) : [])

    function shortcutEntries(keymap: string | string[]) {
        const values = Array.isArray(keymap) ? keymap : [keymap]
        return values.map((shortcut, shortcutIndex) => {
            const occurrence = values
                .slice(0, shortcutIndex)
                .filter((value) => value === shortcut).length
            return {
                id: `${shortcut}\u0000${occurrence}`,
                keys: KeyboardHandler.getFormattedParts(shortcut).map((key, index) => ({
                    id: `${key}\u0000${index}`,
                    label: key,
                })),
            }
        })
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
            {presentationKind ?? "·"}
        {/if}
    </span>
    <span class="meta">
        <span class="title-line">
            <span class="label">{item.label}</span>
            {#if item.englishLabel && item.englishLabel !== item.label}
                <span class="english-label">({item.englishLabel})</span>
            {/if}
        </span>
        {#if item.description}
            <span class="description">{item.description}</span>
        {/if}
    </span>
    <span class="action">
        {#if item.category}<span class="category">{item.category}</span>{/if}
        {#if shortcuts.length > 0}
            <span class="shortcuts">
                {#each shortcuts as shortcut, index (shortcut.id)}
                    {#if index > 0}<span class="separator">/</span>{/if}
                    {#each shortcut.keys as key (key.id)}<kbd>{key.label}</kbd>{/each}
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
        overflow: hidden;
        border: 1.5px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-color);
        font-weight: 800;
        text-transform: uppercase;
    }

    .option-mark :global(svg) {
        width: 1.1rem;
        height: 1.1rem;
    }

    .meta {
        display: grid;
        min-width: 0;
        flex: 1;
        gap: 0.2rem;
    }

    .title-line {
        display: flex;
        min-width: 0;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.15rem 0.45rem;
    }

    .label {
        min-width: 0;
        overflow-wrap: anywhere;
        font-size: var(--font-size-xl);
        font-weight: 650;
    }

    .english-label,
    .description {
        min-width: 0;
        overflow-wrap: anywhere;
        opacity: 0.55;
    }

    .description {
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

    .action {
        max-width: 48%;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .shortcuts {
        flex-wrap: wrap;
        justify-content: flex-end;
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
