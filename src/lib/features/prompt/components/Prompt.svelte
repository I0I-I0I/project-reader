<script lang="ts">
    import SearchIcon from "$lib/core/components/icons/SearchIcon.svelte"
    import SearchNoResultsIcon from "$lib/core/components/icons/SearchNoResultsIcon.svelte"
    import Float from "$lib/core/components/ui/Float.svelte"
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import {
        KeyboardHandler,
        useCommands,
        type CommandNode,
    } from "$lib/features/prompt/stores/commandsStore.svelte"
    import type { SearchItem } from "$lib/features/prompt/stores/promptStore.svelte"
    import { searchStore } from "$lib/features/prompt/stores/searchStore.svelte"
    import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import Fuse from "fuse.js"
    import { getContext, onMount, tick, untrack } from "svelte"
    import { flip } from "svelte/animate"
    import { fade } from "svelte/transition"

    import PromptItem from "./PromptItem.svelte"
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
    let isChromiumNonMac = $state(false)

    let internalValue = $state(value === "" ? "\u200B" : value.replace(/\u200B/g, ""))

    $effect(() => {
        const val = value
        untrack(() => {
            if (val === "") {
                internalValue = "\u200B"
            } else {
                internalValue = val.replace(/\u200B/g, "")
            }
        })
    })

    let isInitialValue = true
    let hasManuallySelected = $state(uiStore.prompt.initialSelectedIndex !== null)
    $effect(() => {
        const query = value
        untrack(() => {
            if (isInitialValue) {
                isInitialValue = false
                return
            }
            selectedIndex = 0
            hasManuallySelected = false
        })
    })

    $effect(() => {
        const results = searchResults
        const mode = uiStore.prompt.mode
        untrack(() => {
            if (mode === "search" && !hasManuallySelected && results.length > 0) {
                const currentBook = viewerStore.getCurrentBook()
                const startPage = searchStore.searchStartPage ?? currentBook?.pageNumber ?? 1

                let nearestIdx = 0
                let minDistance = Infinity
                for (let i = 0; i < results.length; i++) {
                    const pageNum = results[i].item.pageNumber
                    if (pageNum !== undefined) {
                        const dist = Math.abs(pageNum - startPage)
                        if (dist < minDistance) {
                            minDistance = dist
                            nearestIdx = i
                        }
                    }
                }
                if (selectedIndex !== nearestIdx) {
                    selectedIndex = nearestIdx
                    scrollToSelected()
                }
            }
        })
    })

    async function scrollToSelected() {
        await tick()
        if (!resultsContainerRef) return
        const selectedEl = resultsContainerRef.querySelector(".result-item.selected") as HTMLElement
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: "nearest" })
        }
    }

    let allItems = $derived.by(() => {
        const seen = new Set<string>()
        return items.filter((item) => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
    })

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
        if (uiStore.prompt.mode === "page" || uiStore.prompt.mode === "search") {
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

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    function handleSelection(item: SearchItem, opts?: { asJump?: boolean }) {
        item.action(opts)
        if (uiStore.prompt.isOpen) {
            const promptInput = document.querySelector(".prompt-input") as HTMLInputElement
            if (promptInput) {
                promptInput.focus()
            }
        } else {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }
        }
    }

    useCommands(
        [
            {
                id: "close",
                keys: ["escape", "ctrl+c", "ctrl+["],
                action: (event) => {
                    event.preventDefault()
                    handleClose()
                },
                description: "",
                allowInInputs: true,
            },
            {
                id: "next",
                keys: ["ctrl+n", "ctrl+j", "arrowdown"],
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    selectedIndex = (selectedIndex + 1) % searchResults.length
                    hasManuallySelected = true
                    scrollToSelected()
                },
                description: "",
                allowInInputs: true,
            },
            {
                id: "prev",
                keys: ["ctrl+p", "ctrl+k", "arrowup"],
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    selectedIndex =
                        (selectedIndex - 1 + searchResults.length) % searchResults.length
                    hasManuallySelected = true
                    scrollToSelected()
                },
                description: "",
                allowInInputs: true,
            },
            {
                id: "enter",
                keys: ["enter", "ctrl+y", "ctrl+m"],
                action: (event) => {
                    if (searchResults.length === 0) return
                    event.preventDefault()
                    const selected = searchResults[selectedIndex]
                    if (selected) {
                        handleSelection(selected.item, { asJump: true })
                    }
                },
                description: "",
                allowInInputs: true,
            },
        ],
        activeNodeBeforeOpen,
    )

    onMount(async () => {
        isChromiumNonMac = KeyboardHandler.isChromiumNonMac()

        let selectText = true
        if (uiStore.prompt.openedWithInitialValue) {
            uiStore.prompt.openedWithInitialValue = false
            selectText = false
        }

        if (value === "") {
            value = uiStore.prompt.initialValue || ""
        }
        uiStore.prompt.initialValue = ""
        internalValue = value === "" ? "\u200B" : value.replace(/\u200B/g, "")

        if (uiStore.prompt.initialSelectedIndex !== null) {
            selectedIndex = uiStore.prompt.initialSelectedIndex
            await tick()
            scrollToSelected()
        }

        await tick()

        const promptInput = document.querySelector(".prompt-input") as HTMLInputElement
        if (promptInput) {
            promptInput.focus()
            const cleanVal = value.replace(/\u200B/g, "")
            if (cleanVal !== "") {
                if (selectText) {
                    promptInput.select()
                } else {
                    promptInput.setSelectionRange(cleanVal.length, cleanVal.length)
                }
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
            <form
                class="input-wrapper"
                class:searching={searchStore.isSearching}
                onsubmit={(e) => {
                    e.preventDefault()
                    if (searchResults.length === 0) return
                    const selected = searchResults[selectedIndex]
                    if (selected) {
                        handleSelection(selected.item, { asJump: true })
                    }
                }}
            >
                <SearchIcon class="search-icon {value ? 'active-search' : ''}" />
                {#if value === ""}
                    <span class="custom-placeholder">{placeholder}</span>
                {/if}
                <input
                    class="prompt-input"
                    type="search"
                    enterkeyhint="go"
                    bind:value={internalValue}
                    aria-label={m.prompt_search_aria()}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="prompt-results-list"
                    aria-expanded={searchResults.length > 0}
                    aria-activedescendant={searchResults.length > 0
                        ? `result-item-${selectedIndex}`
                        : undefined}
                    oninput={(e) => {
                        const raw = e.currentTarget.value
                        if (raw === "") {
                            if (
                                value === "" &&
                                uiStore.prompt.mode !== "global" &&
                                uiStore.prompt.mode !== "search"
                            ) {
                                uiStore.prompt.mode = "global"
                            }
                            internalValue = "\u200B"
                            value = ""
                        } else if (raw === "\u200B") {
                            value = ""
                        } else {
                            const cleaned = raw.replace(/\u200B/g, "")
                            value = cleaned
                        }
                    }}
                />
                <button
                    type="button"
                    class="close-btn"
                    onclick={handleClose}
                    aria-label={m.prompt_close_aria()}>✕</button
                >
            </form>

            <div
                id="prompt-results-list"
                class="results-list"
                role="listbox"
                aria-label={m.prompt_search_aria()}
                bind:this={resultsContainerRef}
            >
                {#if searchResults.length > 0}
                    {#each searchResults as { item, matches }, i (item.id)}
                        <div
                            animate:flip={{
                                duration: settingsStore.animations ? 200 : 0,
                            }}
                            style="display: contents;"
                        >
                            <PromptItem
                                id="result-item-{i}"
                                {item}
                                {matches}
                                isSelected={selectedIndex === i}
                                onclick={() => handleSelection(item)}
                            />
                        </div>
                    {/each}
                {:else}
                    <div
                        class="empty-state"
                        transition:fade={{
                            duration: settingsStore.animations ? 150 : 0,
                        }}
                    >
                        <SearchNoResultsIcon />
                        <p>{m.prompt_no_results({ value })}</p>
                    </div>
                {/if}
            </div>

            <div class="footer" class:empty-value={value === ""}>
                <div class="suggestion-info">
                    {#if value === ""}
                        <span
                            in:fade={{
                                duration: settingsStore.animations ? 120 : 0,
                            }}>{m.prompt_suggestions()}</span
                        >
                    {:else}
                        <span
                            in:fade={{
                                duration: settingsStore.animations ? 120 : 0,
                            }}
                        >
                            {uiStore.prompt.mode === "search"
                                ? m.prompt_found_results({
                                      count: searchStore.matches.length,
                                  })
                                : m.prompt_found_results({
                                      count: searchResults.length,
                                  })}
                        </span>
                    {/if}
                </div>
                <div class="shortcuts-help">
                    <div class="shortcut-help-item">
                        {#if isChromiumNonMac}
                            <kbd>↑</kbd><kbd>C-j</kbd>/<kbd>↓</kbd><kbd>C-k</kbd>
                        {:else}
                            <kbd>↑</kbd><kbd>C-n</kbd>/<kbd>↓</kbd><kbd>C-p</kbd>
                        {/if}
                        <span>{m.prompt_help_navigate()}</span>
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
        z-index: var(--z-10);
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
        font-size: var(--font-size-2xl);
        color: var(--text-color);
        padding: 0;
    }

    .prompt-input::placeholder {
        color: var(--text-color);
        opacity: 0.4;
    }

    .custom-placeholder {
        position: absolute;
        left: 48px;
        pointer-events: none;
        color: var(--text-color);
        opacity: 0.4;
        font-family: inherit;
        font-size: var(--font-size-2xl);
        user-select: none;
    }

    .close-btn {
        background: transparent;
        border: none;
        font-size: var(--font-size-xl);
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
        border-radius: var(--radius-md);
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
        font-size: var(--font-size-sm);
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
        border-radius: var(--radius-sm);
        padding: 0 1px;
    }

    :global(html.dark mark.highlight) {
        background: rgba(225, 112, 85, 0.4);
    }

    @media (--prompt) {
        .custom-placeholder {
            font-size: var(--font-size-xl);
        }

        .prompt-container > div {
            flex-direction: column-reverse;
        }

        .results-list {
            flex-direction: column-reverse;
            max-height: 60dvh;
        }

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
