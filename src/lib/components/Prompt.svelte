<script lang="ts">
    import { onMount, getContext, untrack } from "svelte"
    import { fade, fly } from "svelte/transition"
    import { flip } from "svelte/animate"
    import Fuse from "fuse.js"
    import Float from "./ui/Float.svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { useKeymap } from "$lib/stores/keymapStore.svelte"
    import type { SearchItem } from "$lib/stores/promptStore.svelte"
    import SearchIcon from "./icons/SearchIcon.svelte"
    import BookItemIcon from "./icons/BookItemIcon.svelte"
    import CommandIcon from "./icons/CommandIcon.svelte"
    import SettingsItemIcon from "./icons/SettingsItemIcon.svelte"
    import NavigationIcon from "./icons/NavigationIcon.svelte"
    import MenuIcon from "./icons/MenuIcon.svelte"
    import SearchNoResultsIcon from "./icons/SearchNoResultsIcon.svelte"

    interface Props {
        onClose: () => void
        value: string
        items: SearchItem[]
        placeholder?: string
    }

    let {
        value = $bindable(""),
        onClose,
        items,
        placeholder = m.prompt_placeholder(),
    }: Props = $props()

    let selectedIndex = $state(0)
    let resultsContainerRef = $state<HTMLDivElement | null>(null)
    let innerHeight = $state<number | undefined>(undefined)

    $effect(() => {
        const query = value
        untrack(() => {
            selectedIndex = 0
        })
    })

    function scrollToSelected() {
        setTimeout(() => {
            if (!resultsContainerRef) return
            const selectedEl = resultsContainerRef.querySelector(
                ".result-item.selected",
            ) as HTMLElement
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: "nearest" })
            }
        }, 0)
    }

    let allItems = $derived(items)

    const fuseOptions = {
        keys: [
            { name: "title", weight: 0.7 },
            { name: "englishTitle", weight: 0.6 },
            { name: "subtitle", weight: 0.3 },
            { name: "englishSubtitle", weight: 0.2 },
            { name: "category", weight: 0.1 },
        ],
        threshold: 0.4,
        includeMatches: true,
    }

    let fuse = $derived(new Fuse(allItems, fuseOptions))

    let searchResults = $derived.by(() => {
        const query = value.trim()
        if (uiStore.promptMode === "page") {
            return allItems.map((item) => ({ item, matches: [] }))
        }
        if (query === "") {
            return allItems.slice(0, 10).map((item) => ({ item, matches: [] }))
        }
        return fuse.search(query).map((res) => ({
            item: res.item,
            matches: res.matches || [],
        }))
    })

    const getActiveNode = getContext<() => any>("get_active_keymap_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useKeymap(
        [
            {
                keys: "escape",
                action: (event) => {
                    event.preventDefault()
                    handleClose()
                },
                description: "",
                allowInInputs: true,
            },
            {
                keys: "arrowdown",
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    selectedIndex = (selectedIndex + 1) % searchResults.length
                    scrollToSelected()
                },
                description: "",
                allowInInputs: true,
            },
            {
                keys: "ctrl+n",
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    selectedIndex = (selectedIndex + 1) % searchResults.length
                    scrollToSelected()
                },
                description: "",
                allowInInputs: true,
            },
            {
                keys: "arrowup",
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    selectedIndex =
                        (selectedIndex - 1 + searchResults.length) % searchResults.length
                    scrollToSelected()
                },
                description: "",
                allowInInputs: true,
            },
            {
                keys: "ctrl+p",
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    selectedIndex =
                        (selectedIndex - 1 + searchResults.length) % searchResults.length
                    scrollToSelected()
                },
                description: "",
                allowInInputs: true,
            },
            {
                keys: "enter",
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    const selected = searchResults[selectedIndex]
                    if (selected) {
                        if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur()
                        }
                        selected.item.action()
                    }
                },
                description: "",
                allowInInputs: true,
            },
        ],
        activeNodeBeforeOpen,
    )

    function getHighlightedText(text: string, matches: readonly any[], key: string): string {
        if (typeof text !== "string") return String(text || "")
        const match = matches.find((m) => m.key === key)
        if (!match) return text

        let result = ""
        let lastIndex = 0
        const sortedIndices = [...match.indices].sort((a, b) => a[0] - b[0])

        for (const [start, end] of sortedIndices) {
            result += text.slice(lastIndex, start)
            result += `<mark class="highlight">${text.slice(start, end + 1)}</mark>`
            lastIndex = end + 1
        }
        result += text.slice(lastIndex)
        return result
    }

    onMount(() => {
        const promptInput = document.querySelector(".prompt-input") as HTMLInputElement
        if (promptInput) {
            promptInput.focus()
            if (!uiStore.isCompact) {
                promptInput.select()
            }
        }
    })
    function handleClose() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        onClose()
    }
</script>

<Float onClose={handleClose} align="top">
    <div
        class="prompt-container"
        class:enable-animations={settingsStore.animations}
        style="height: {innerHeight ? `${innerHeight}px` : 'auto'}"
    >
        <div bind:clientHeight={innerHeight}>
            <div class="input-wrapper" class:searching={value !== ""}>
                <SearchIcon class="search-icon {value ? 'active-search' : ''}" />
                <input
                    class="prompt-input"
                    type="text"
                    bind:value
                    {placeholder}
                    aria-label={m.prompt_search_aria()}
                />
                <button class="close-btn" onclick={handleClose} aria-label={m.prompt_close_aria()}
                    >✕</button
                >
            </div>

            <div class="results-list" bind:this={resultsContainerRef}>
                {#if searchResults.length > 0}
                    {#each searchResults as { item, matches }, i (item.id)}
                        <button
                            class="result-item"
                            class:selected={selectedIndex === i}
                            onclick={() => {
                                if (document.activeElement instanceof HTMLElement) {
                                    document.activeElement.blur()
                                }
                                item.action()
                            }}
                            in:fly={{ y: 6, duration: settingsStore.animations ? 120 : 0 }}
                            out:fade={{ duration: settingsStore.animations ? 80 : 0 }}
                            animate:flip={{ duration: settingsStore.animations ? 200 : 0 }}
                        >
                            <div class="icon-container">
                                {#if item.category === "books"}
                                    <BookItemIcon class="item-icon book" />
                                {:else if item.category === "commands"}
                                    <CommandIcon class="item-icon command" />
                                {:else if item.category === "settings"}
                                    <SettingsItemIcon class="item-icon settings" />
                                {:else if item.category === "menu"}
                                    <MenuIcon class="item-icon menu" />
                                {:else}
                                    <NavigationIcon class="item-icon navigation" />
                                {/if}
                            </div>
                            <div class="meta-container">
                                <div class="item-title">
                                    {@html getHighlightedText(item.title, matches, "title")}
                                    {#if item.englishTitle && item.englishTitle !== item.title}
                                        <span class="english-title-hint">
                                            ({@html getHighlightedText(
                                                item.englishTitle,
                                                matches,
                                                "englishTitle",
                                            )})
                                        </span>
                                    {/if}
                                </div>
                                {#if item.subtitle}
                                    <div class="item-subtitle">
                                        {@html getHighlightedText(
                                            item.subtitle,
                                            matches,
                                            "subtitle",
                                        )}
                                    </div>
                                {/if}
                            </div>
                            <div class="action-container">
                                <span class="category-badge {item.category}">{item.category}</span>
                                {#if item.keys}
                                    <div class="shortcut-keys">
                                        {#each item.keys.split("+") as key}
                                            <kbd>{key.trim()}</kbd>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </button>
                    {/each}
                {:else}
                    <div
                        class="empty-state"
                        transition:fade={{ duration: settingsStore.animations ? 150 : 0 }}
                    >
                        <SearchNoResultsIcon />
                        <p>{m.prompt_no_results({ value })}</p>
                    </div>
                {/if}
            </div>

            <div class="footer" class:empty-value={value === ""}>
                <div class="suggestion-info">
                    {#if value === ""}
                        <span in:fade={{ duration: settingsStore.animations ? 120 : 0 }}
                            >{m.prompt_suggestions()}</span
                        >
                    {:else}
                        <span in:fade={{ duration: settingsStore.animations ? 120 : 0 }}
                            >{m.prompt_found_results({ count: searchResults.length })}</span
                        >
                    {/if}
                </div>
                <div class="shortcuts-help">
                    <div class="shortcut-help-item">
                        <kbd>↑↓</kbd> <span>{m.prompt_help_navigate()}</span>
                    </div>
                    <div class="shortcut-help-item">
                        <kbd>↵</kbd> <span>{m.prompt_help_select()}</span>
                    </div>
                    <div class="shortcut-help-item">
                        <kbd>esc</kbd> <span>{m.prompt_help_close()}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</Float>

<style>
    .prompt-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        background: var(--surface-color);
        overflow: hidden;
    }

    .prompt-container > div {
        display: flex;
        flex-direction: column;
    }

    .prompt-container.enable-animations {
        transition: height 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        padding: 16px;
        border-bottom: 2px solid var(--border-color);
        background: var(--surface-color);
    }

    .input-wrapper::after {
        content: "";
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 2px;
        background: transparent;
        z-index: 10;
        transform: scaleX(0);
        transform-origin: left;
        transition:
            transform 0.2s ease,
            background-color 0.2s ease;
    }

    .input-wrapper.searching::after {
        transform: scaleX(1);
        background: #0984e3;
    }

    :global(html.dark) .input-wrapper.searching::after {
        background: #74b9ff;
    }

    .prompt-container.enable-animations .input-wrapper::after {
        background: linear-gradient(90deg, #0984e3, #00b894, #e84393, #0984e3);
        background-size: 300% 100%;
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .prompt-container.enable-animations .input-wrapper.searching::after {
        animation: search-glow-slide 2.5s linear infinite;
    }

    @keyframes search-glow-slide {
        0% {
            background-position: 0% 50%;
        }
        100% {
            background-position: 300% 50%;
        }
    }

    :global(.search-icon) {
        width: 20px;
        height: 20px;
        color: var(--text-color);
        opacity: 0.6;
        margin-right: 12px;
        flex-shrink: 0;
    }

    :global(.search-icon.active-search) {
        color: #0984e3;
        opacity: 1;
    }

    :global(html.dark) :global(.search-icon.active-search) {
        color: #74b9ff;
    }

    .prompt-container.enable-animations :global(.search-icon) {
        transition:
            transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
            color 0.2s ease,
            opacity 0.2s ease;
    }

    .prompt-container.enable-animations :global(.search-icon.active-search) {
        transform: scale(1.15) rotate(8deg);
    }

    .prompt-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-family: inherit;
        font-size: 1.1rem;
        color: var(--text-color);
        padding: 0;
    }

    .prompt-input::placeholder {
        color: var(--text-color);
        opacity: 0.4;
    }

    .close-btn {
        background: transparent;
        border: none;
        font-size: 1rem;
        color: var(--text-color);
        opacity: 0.5;
        cursor: pointer;
        padding: 4px;
        margin-left: 8px;
    }

    @media (hover: hover) {
        .close-btn:hover {
            opacity: 0.9;
        }
    }

    .prompt-container.enable-animations .close-btn {
        transition:
            opacity 0.15s ease,
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @media (hover: hover) {
        .prompt-container.enable-animations .close-btn:hover {
            transform: rotate(90deg) scale(1.15);
        }
    }

    .results-list {
        display: flex;
        flex-direction: column;
        max-height: 380px;
        overflow-y: auto;
        padding: 8px;
        gap: 4px;
        background: var(--surface-color);
    }

    .results-list::-webkit-scrollbar {
        width: 8px;
    }

    .results-list::-webkit-scrollbar-track {
        background: transparent;
    }

    .results-list::-webkit-scrollbar-thumb {
        background: var(--border-color);
        opacity: 0.3;
        border-radius: 4px;
    }

    .result-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 10px 12px;
        background: transparent;
        border: 2px solid transparent;
        border-radius: 4px;
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

    .prompt-container.enable-animations .result-item {
        transition:
            background-color 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .prompt-container.enable-animations .result-item.selected {
        transform: translate(-2px, -2px);
        box-shadow: 3px 3px 0 var(--shadow-color);
    }

    .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        border: 1.5px solid var(--border-color);
        background: var(--bg-color);
        color: var(--text-color);
        flex-shrink: 0;
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
        font-size: 0.95rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .english-title-hint {
        font-size: 0.82rem;
        font-weight: normal;
        opacity: 0.5;
        margin-left: 8px;
    }

    .item-subtitle {
        font-size: 0.78rem;
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
        font-size: 0.62rem;
        font-weight: bold;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1.5px solid var(--border-color);
        border-radius: 4px;
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

    .shortcut-keys {
        display: flex;
        gap: 2px;
    }

    kbd {
        font-family: inherit;
        font-size: 0.72rem;
        font-weight: 500;
        padding: 1px 5px;
        border: 1.5px solid var(--border-color);
        border-radius: 3px;
        background: var(--surface-color);
        color: var(--text-color);
        box-shadow: 1px 1px 0 var(--border-color);
        white-space: nowrap;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: var(--text-color);
        opacity: 0.7;
    }

    :global(.empty-state svg) {
        width: 48px;
        height: 48px;
        opacity: 0.4;
        margin-bottom: 12px;
    }

    .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
        border-top: 2px solid var(--border-color);
        background: var(--surface-hover-color);
        font-size: 0.75rem;
        color: var(--text-color);
        opacity: 0.8;
    }

    .shortcuts-help {
        display: flex;
        gap: 12px;
    }

    .shortcut-help-item {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    :global(mark.highlight) {
        background: rgba(253, 203, 110, 0.4);
        color: inherit;
        border-radius: 2px;
        padding: 0 1px;
    }

    :global(html.dark mark.highlight) {
        background: rgba(225, 112, 85, 0.4);
    }

    @media (--prompt) {
        .prompt-input {
            font-size: 16px;
        }

        .prompt-container > div {
            flex-direction: column-reverse;
        }

        .results-list {
            flex-direction: column-reverse;
            max-height: 60dvh;
        }

        .prompt-container .shortcut-keys,
        .prompt-container .category-badge,
        .prompt-container .shortcuts-help {
            display: none;
        }

        .input-wrapper {
            border-bottom: none;
            border-top: 2px solid var(--border-color);
        }

        .input-wrapper::after {
            bottom: auto;
            top: -2px;
        }

        .footer {
            border-top: none;
            border-bottom: 2px solid var(--border-color);
        }

        .footer.empty-value {
            display: none !important;
        }
    }

    @media (--prompt) {
        .prompt-container {
            height: 100% !important;
        }

        .prompt-container > div {
            height: 100% !important;
        }

        .results-list {
            flex: 1 !important;
            max-height: none !important;
        }
    }
</style>
