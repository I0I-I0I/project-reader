<script lang="ts">
    import { fly, fade } from "svelte/transition"
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { formatKeyString } from "$lib/features/prompt/stores/commandsStore.svelte"
    import type { SearchItem } from "$lib/features/prompt/stores/promptStore.svelte"
    import SearchIcon from "$lib/core/components/icons/SearchIcon.svelte"
    import PromptBookPreview from "./PromptBookPreview.svelte"
    import CommandIcon from "$lib/core/components/icons/CommandIcon.svelte"
    import SettingsItemIcon from "$lib/core/components/icons/SettingsItemIcon.svelte"
    import NavigationIcon from "$lib/core/components/icons/NavigationIcon.svelte"
    import MenuIcon from "$lib/core/components/icons/MenuIcon.svelte"
    import BookmarkIcon from "$lib/core/components/icons/BookmarkIcon.svelte"

    interface Props {
        id: string
        item: SearchItem
        matches: readonly any[]
        isSelected: boolean
        onclick: () => void
    }

    let { id, item, matches, isSelected, onclick }: Props = $props()

    import { getHighlightedParts } from "$lib/core/utils/highlight"

    function formatKeys(keyStr: string): string[] {
        const formatted = formatKeyString(keyStr)
        if (formatted === "+") return ["+"]
        if (formatted.endsWith("++")) {
            const base = formatted.slice(0, -2)
            return [...base.split("+").map((k) => k.trim()), "+"]
        }
        return formatted.split("+").map((k) => k.trim())
    }

    function getShortcutsArray(keys: string | string[]): string[] {
        return Array.isArray(keys) ? keys : [keys]
    }
</script>

<button
    {id}
    role="option"
    aria-selected={isSelected}
    class="result-item"
    class:selected={isSelected}
    class:enable-animations={settingsStore.animations}
    {onclick}
    in:fly={{
        y: 6,
        duration: settingsStore.animations ? 120 : 0,
    }}
    out:fade={{
        duration: settingsStore.animations ? 80 : 0,
    }}
>
    <div class="icon-container">
        {#if item.category === "books"}
            <PromptBookPreview
                bookId={item.id.startsWith("book-") ? item.id.substring(5) : item.id}
            />
        {:else if item.category === "bookmarks"}
            {#if item.bookId}
                <PromptBookPreview bookId={item.bookId}>
                    {#snippet fallback()}
                        <BookmarkIcon class="item-icon bookmarks" />
                    {/snippet}
                </PromptBookPreview>
            {:else}
                <BookmarkIcon class="item-icon bookmarks" />
            {/if}
        {:else if item.category === "commands"}
            <CommandIcon class="item-icon command" />
        {:else if item.category === "settings"}
            <SettingsItemIcon class="item-icon settings" />
        {:else if item.category === "menu"}
            <MenuIcon class="item-icon menu" />
        {:else if item.id.startsWith("search-history")}
            <SearchIcon class="item-icon navigation" style="opacity: 0.6;" />
        {:else}
            <NavigationIcon class="item-icon navigation" />
        {/if}
    </div>
    <div class="meta-container">
        <div class="item-title">
            {#each getHighlightedParts(item.title, matches, "title") as part}
                {#if part.highlight}
                    <mark class="highlight">{part.text}</mark>
                {:else}
                    {part.text}
                {/if}
            {/each}
            {#if item.englishTitle && item.englishTitle !== item.title}
                <span class="english-title-hint">
                    (
                    {#each getHighlightedParts(item.englishTitle, matches, "englishTitle") as part}
                        {#if part.highlight}
                            <mark class="highlight">{part.text}</mark>
                        {:else}
                            {part.text}
                        {/if}
                    {/each}
                    )
                </span>
            {/if}
        </div>
        {#if item.subtitle}
            <div class="item-subtitle">
                {#each getHighlightedParts(item.subtitle, matches, "subtitle") as part}
                    {#if part.highlight}
                        <mark class="highlight">{part.text}</mark>
                    {:else}
                        {part.text}
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
    <div class="action-container">
        <span class="category-badge {item.category}">{item.category}</span>
        {#if item.keys}
            <div class="shortcut-keys">
                {#each getShortcutsArray(item.keys) as shortcut, idx}
                    {#if idx > 0}
                        <span class="shortcut-separator">/</span>
                    {/if}
                    {#each formatKeys(shortcut) as key}
                        <kbd>{key}</kbd>
                    {/each}
                {/each}
            </div>
        {/if}
    </div>
</button>

<style>
    .result-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 10px 12px;
        background: transparent;
        border: 2px solid transparent;
        border-radius: var(--radius-md);
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        color: var(--text-color);
        gap: 12px;
    }

    .result-item.selected {
        background: var(--surface-hover-color);
        border-color: var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        transform: translate(-1px, -1px);
    }

    @media (hover: hover) {
        .result-item:hover {
            background: var(--surface-hover-color);
        }
    }

    .result-item.enable-animations {
        transition:
            background-color 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .result-item.enable-animations.selected {
        transform: translate(-2px, -2px);
        box-shadow: 3px 3px 0 var(--shadow-color);
    }

    .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        border: 1.5px solid var(--border-color);
        background: var(--bg-color);
        color: var(--text-color);
        flex-shrink: 0;
        overflow: hidden;
    }

    :global(.item-icon) {
        width: 18px;
        height: 18px;
    }

    .meta-container {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .item-title {
        font-size: var(--font-size-xl);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .english-title-hint {
        font-size: var(--font-size-base);
        font-weight: normal;
        opacity: 0.5;
        margin-left: 8px;
    }

    .item-subtitle {
        font-size: var(--font-size-sm);
        opacity: 0.6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .action-container {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .category-badge {
        font-size: var(--font-size-2xs);
        font-weight: bold;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1.5px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-color);
        color: var(--text-color);
        white-space: nowrap;
    }

    .category-badge.books {
        border-color: #0984e3;
        background: rgba(9, 132, 227, 0.08);
        color: #0984e3;
    }

    :global(html.dark) .category-badge.books {
        border-color: #74b9ff;
        color: #74b9ff;
    }

    .category-badge.outline {
        border-color: #00b894;
        background: rgba(0, 184, 148, 0.08);
        color: #00b894;
    }

    :global(html.dark) .category-badge.outline {
        border-color: #55efc4;
        color: #55efc4;
    }

    .category-badge.commands {
        border-color: #e84393;
        background: rgba(232, 67, 147, 0.08);
        color: #e84393;
    }

    :global(html.dark) .category-badge.commands {
        border-color: #fd79a8;
        color: #fd79a8;
    }

    .category-badge.settings {
        border-color: #d63031;
        background: rgba(214, 48, 49, 0.08);
        color: #d63031;
    }

    :global(html.dark) .category-badge.settings {
        border-color: #ff7675;
        color: #ff7675;
    }

    .category-badge.navigation {
        border-color: #fdcb6e;
        background: rgba(253, 203, 110, 0.08);
        color: #fdcb6e;
    }

    :global(html.dark) .category-badge.navigation {
        border-color: #ffeaa7;
        color: #ffeaa7;
    }

    .category-badge.menu {
        border-color: #6c5ce7;
        background: rgba(108, 92, 231, 0.08);
        color: #6c5ce7;
    }

    :global(html.dark) .category-badge.menu {
        border-color: #a29bfe;
        color: #a29bfe;
    }

    .category-badge.bookmarks {
        border-color: #e17055;
        background: rgba(225, 112, 85, 0.08);
        color: #e17055;
    }

    :global(html.dark) .category-badge.bookmarks {
        border-color: #fab1a0;
        color: #fab1a0;
    }

    .shortcut-keys {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .shortcut-separator {
        opacity: 0.5;
        font-weight: 500;
        margin: 0 2px;
        align-self: center;
        color: var(--text-color);
        font-size: var(--font-size-sm);
    }

    kbd {
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
        font-size: var(--font-size-sm);
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        border-radius: var(--radius-md);
        padding: 3px 6px;
        min-width: 14px;
        text-align: center;
        text-transform: uppercase;
        display: inline-block;
        white-space: nowrap;
        line-height: 1;
    }

    @media (--prompt) {
        .category-badge,
        .shortcut-keys {
            display: none;
        }
    }
</style>
