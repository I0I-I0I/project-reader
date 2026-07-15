<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/core/components/ui/Spinner.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import type { FlatHeading } from "$lib/core/pdf/pdf"
    import {
        KeyboardHandler,
        commandsStore,
        useCommands,
    } from "$lib/features/commands/commandsStore.svelte"
    import { createViewerOutlineCommands } from "$lib/features/viewer/commands/viewerOutlineCommands"
    import { MediaQuery } from "svelte/reactivity"
    import Button from "$lib/core/components/ui/Button.svelte"
    import { modalManager } from "$lib/core/components/ui/modal/modalManager.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { resolveSelectionIndex } from "$lib/core/state/listSelection"
    import { notesStore } from "$lib/features/viewer/stores/notesStore.svelte"

    let {
        isOutlineLoading,
        outlineList,
        currentPage = $bindable(),
        scrollPosition = $bindable(),
        activeHeadings,
        onClose,
    } = $props<{
        isOutlineLoading: boolean
        outlineList: FlatHeading[] | null
        currentPage: number
        scrollPosition: number
        activeHeadings: Set<FlatHeading>
        onClose: () => void
    }>()

    let searchQuery = $state("")
    let manualSelectedIndex = $state<number | null>(null)
    const phoneQuery = new MediaQuery("(max-width: 480px)")
    let searchInputRef = $state<HTMLInputElement | null>(null)

    let filteredOutlineList = $derived(
        outlineList
            ? outlineList.filter((h: FlatHeading) =>
                  h.title.toLowerCase().includes(searchQuery.toLowerCase()),
              )
            : [],
    )

    function selectHeading(heading: FlatHeading) {
        if (heading.pageNumber !== undefined) {
            void commandsStore.execute("viewer.page.go-to", {
                page: heading.pageNumber,
                isJump: true,
            })
            if (window.innerWidth <= 480) {
                onClose()
            }
        }
    }

    let selectedIndex = $derived.by(() => {
        const activeIndex = filteredOutlineList.findIndex((heading: FlatHeading) =>
            activeHeadings.has(heading),
        )
        const automaticIndex = phoneQuery.current
            ? -1
            : searchQuery
              ? 0
              : activeIndex === -1
                ? 0
                : activeIndex
        return resolveSelectionIndex(
            manualSelectedIndex,
            filteredOutlineList.length,
            automaticIndex,
        )
    })

    function navigateSelection(direction: "next" | "prev") {
        if (filteredOutlineList.length === 0) return
        manualSelectedIndex =
            direction === "next"
                ? (selectedIndex + 1) % filteredOutlineList.length
                : (selectedIndex - 1 + filteredOutlineList.length) % filteredOutlineList.length
        scrollSelectedIntoView()
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault()
            const heading = filteredOutlineList[selectedIndex]
            if (heading) {
                selectHeading(heading)
                onClose()
            }
        } else if (event.key === "Escape") {
            event.preventDefault()
            searchInputRef?.blur()
        }
    }

    function scrollSelectedIntoView() {
        requestAnimationFrame(() => {
            if (!contentRef) return
            const selectedEl = contentRef.querySelector(".outline-item.selected")
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: "nearest" })
            }
        })
    }

    function queryChanged() {
        manualSelectedIndex = null
    }

    useCommands(
        createViewerOutlineCommands({
            nextLabel: () => m.keymap_next_heading(),
            // English callbacks feed keyboard-help search without replacing localized labels.
            nextEnglishLabel: () => m.keymap_next_heading({}, { locale: "en" }),
            previousLabel: () => m.keymap_prev_heading(),
            previousEnglishLabel: () => m.keymap_prev_heading({}, { locale: "en" }),
            selectLabel: () => m.keymap_select_heading(),
            selectEnglishLabel: () => m.keymap_select_heading({}, { locale: "en" }),
            searchLabel: () => m.keymap_search_headings(),
            searchEnglishLabel: () => m.keymap_search_headings({}, { locale: "en" }),
            disabled: () =>
                modalManager.hasBlockingModal ||
                !!notesStore.editingNote ||
                !!notesStore.activePopup,
            shouldHandleNavigationKey: (event) => {
                const target = event.target
                const isInput =
                    target instanceof HTMLInputElement ||
                    target instanceof HTMLTextAreaElement ||
                    (target instanceof HTMLElement && target.isContentEditable)
                return !(
                    isInput &&
                    (KeyboardHandler.matches(event, "j") || KeyboardHandler.matches(event, "k"))
                )
            },
            next: () => navigateSelection("next"),
            previous: () => navigateSelection("prev"),
            select: () => {
                const heading = filteredOutlineList[selectedIndex]
                if (heading) {
                    selectHeading(heading)
                    onClose()
                }
            },
            search: () => {
                searchInputRef?.focus()
                searchInputRef?.select()
            },
        }),
    )

    function formatKey(keys: string | string[]): string {
        if (Array.isArray(keys)) {
            return keys.map((k) => formatKey(k)).join("/")
        }
        const MODIFIERS = ["ctrl", "meta", "alt", "shift"]
        const parts = keys.split("+")
        parts.sort((a, b) => {
            const aLower = a.toLowerCase().trim()
            const bLower = b.toLowerCase().trim()
            const aIdx = MODIFIERS.indexOf(aLower)
            const bIdx = MODIFIERS.indexOf(bLower)

            if (aIdx !== -1 && bIdx !== -1) {
                return aIdx - bIdx
            }
            if (aIdx !== -1) {
                return -1
            }
            if (bIdx !== -1) {
                return 1
            }
            return aLower.localeCompare(bLower)
        })
        return parts
            .map((part) => {
                const lower = part.toLowerCase().trim()
                if (lower === "arrowup") return "↑"
                if (lower === "arrowdown") return "↓"
                if (lower === "ctrl") return "C"
                if (lower === "meta") return "M"
                if (lower === "alt") return "A"
                if (lower === "shift") return "S"
                if (lower === "escape") return "Esc"
                if (lower === "enter") return "Enter"
                if (lower.length === 1) return lower
                return part
            })
            .join("-")
    }

    const navigateShortcuts = [
        { display: `${formatKey("j")}/${formatKey("k")}` },
        { display: `${formatKey("arrowdown")}/${formatKey("arrowup")}` },
        KeyboardHandler.isChromiumNonMac()
            ? { display: `${formatKey("ctrl+j")}/${formatKey("ctrl+k")}` }
            : { display: `${formatKey("ctrl+n")}/${formatKey("ctrl+p")}` },
    ]
    const selectShortcut = formatKey("enter")
    const searchShortcut = formatKey("/")

    let contentRef: HTMLElement | undefined = $state()
    let hasScrolledInitially = false

    function trackOutlineSelection(_index: number, _items: FlatHeading[], loading: boolean) {
        return (content: HTMLElement) => {
            const frame = requestAnimationFrame(() => {
                if (!hasScrolledInitially && !loading) {
                    const activeElements = content.querySelectorAll(".outline-item.active")
                    activeElements.item(activeElements.length - 1)?.scrollIntoView({
                        block: "center",
                    })
                    hasScrolledInitially = true
                    return
                }
                content
                    .querySelector(".outline-item.selected")
                    ?.scrollIntoView({ block: "nearest" })
            })
            return () => cancelAnimationFrame(frame)
        }
    }
</script>

{#snippet sidebarContent()}
    {#if outlineList && outlineList.length > 0}
        <div class="sidebar-search">
            <Input
                unstyled
                bind:ref={searchInputRef}
                type="text"
                bind:value={searchQuery}
                oninput={queryChanged}
                placeholder={`${m.search_headings_placeholder()} [${searchShortcut}]`}
                class="search-input"
                onkeydown={handleSearchKeydown}
            />
            {#if searchQuery}
                <button
                    class="clear-search-btn"
                    onclick={() => {
                        searchQuery = ""
                        queryChanged()
                        searchInputRef?.focus()
                    }}
                    aria-label={m.clear_search_aria()}
                >
                    ×
                </button>
            {/if}
        </div>
    {/if}

    <div
        class="sidebar-content"
        bind:this={contentRef}
        {@attach trackOutlineSelection(selectedIndex, filteredOutlineList, isOutlineLoading)}
    >
        {#if isOutlineLoading}
            <div class="outline-loader">
                <Spinner variant="dots" size="sm" label="" />
            </div>
        {:else if !outlineList || outlineList.length === 0}
            <div class="no-outline">
                {m.no_outline()}
            </div>
        {:else if filteredOutlineList.length === 0}
            <div class="no-outline">{m.no_matching_headings()}</div>
        {:else}
            <nav class="outline-nav">
                {#each filteredOutlineList as heading, index (heading)}
                    <Button
                        variant="none"
                        size="none"
                        class="outline-item depth-{heading.depth} {activeHeadings.has(heading)
                            ? 'active'
                            : ''} {index === selectedIndex ? 'selected' : ''}"
                        onclick={() => {
                            selectHeading(heading)
                            manualSelectedIndex = index
                        }}
                        disabled={heading.pageNumber === undefined}
                        style="--depth: {heading.depth}"
                        title={heading.title}
                    >
                        <span class="heading-title">{heading.title}</span>
                        {#if heading.pageNumber !== undefined}
                            <span class="heading-page">{heading.pageNumber}</span>
                        {/if}
                    </Button>
                {/each}
            </nav>
        {/if}
    </div>

    {#if !uiStore.isCompact}
        <div class="sidebar-footer-hint">
            {#if navigateShortcuts.length > 0}
                <span class="hint-item">
                    {#each navigateShortcuts as pair, i (pair.display)}
                        {#if i > 0},
                        {/if}<kbd>{pair.display}</kbd>
                    {/each}
                    Navigate
                </span>
                <span class="hint-divider">•</span>
            {/if}
            {#if selectShortcut}
                <span class="hint-item">
                    <kbd>{selectShortcut}</kbd> Go
                </span>
                <span class="hint-divider">•</span>
            {/if}
            {#if searchShortcut}
                <span class="hint-item">
                    <kbd>{searchShortcut}</kbd> Search
                </span>
                <span class="hint-divider">•</span>
            {/if}
        </div>
    {/if}
{/snippet}

{@render sidebarContent()}

<style>
    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        background: transparent;
        overscroll-behavior: contain;
    }

    .outline-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
    }

    .no-outline {
        padding: 24px;
        text-align: center;
        font-size: var(--font-size-md);
        font-weight: 700;
        color: var(--faded-text-color);
    }

    .outline-nav {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
    }

    .outline-nav :global(.tooltip-align-left) {
        margin-left: 12px;
    }

    .outline-nav :global(.outline-item) {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        width: 100% !important;
        background: none !important;
        border: none !important;
        border-bottom: 1px dashed var(--outline-item-border) !important;
        padding: 10px 12px !important;
        padding-left: calc(12px + var(--depth) * 12px) !important;
        font-family: inherit !important;
        font-size: var(--font-size-lg) !important;
        font-weight: 700 !important;
        color: var(--text-color) !important;
        cursor: pointer !important;
        text-align: left !important;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-sizing: border-box !important;
    }

    @media (hover: hover) {
        .outline-nav :global(.outline-item:hover:not(:disabled)) {
            background: var(--accent-color) !important;
            color: var(--text-color) !important;
            font-weight: 800 !important;
        }
    }

    .outline-nav :global(.outline-item.active:not(:disabled)) {
        background: var(--accent-active-color) !important;
        color: var(--text-color) !important;
        font-weight: 900 !important;
        border-bottom-style: solid !important;
    }

    .outline-nav :global(.outline-item:disabled) {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    .heading-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 8px;
    }

    .heading-page {
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        font-size: var(--font-size-2xs);
        font-weight: 900;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        border: 1px solid var(--border-color);
    }

    .sidebar-search {
        position: relative;
        padding: 0;
        background: var(--surface-color);
        border-bottom: 3px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
        z-index: var(--z-5);
    }

    .sidebar-search :global(.search-input) {
        width: 100%;
        padding: 12px 36px 12px 16px;
        font-family: inherit;
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: none;
        outline: none;
        transition: all 0.15s ease;
        box-sizing: border-box;
    }

    .sidebar-search :global(.search-input:focus) {
        background: color-mix(in srgb, var(--accent-color) 6%, var(--surface-color));
        box-shadow: inset 4px 0 0 var(--accent-color);
    }

    @media (max-width: 640px) {
        .sidebar-search {
            padding: 0;
        }

        .sidebar-search :global(.search-input) {
            padding: 10px 32px 10px 14px;
        }

        .clear-search-btn {
            right: 10px !important;
        }
    }

    .clear-search-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: var(--faded-color);
        border: none;
        border-radius: var(--radius-full);
        width: 18px;
        height: 18px;
        font-size: var(--font-size-sm);
        font-weight: 800;
        cursor: pointer;
        color: var(--text-color);
        opacity: 0.6;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        padding: 0;
        line-height: 1;
    }

    @media (hover: hover) {
        .clear-search-btn:hover {
            opacity: 1;
            background: var(--border-color);
            color: var(--surface-color);
        }
    }

    .outline-nav :global(.outline-item.selected:not(:disabled)) {
        background: var(--accent-color) !important;
        box-shadow: inset 4px 0 0 var(--border-color) !important;
        font-weight: 800 !important;
    }

    .outline-nav :global(.outline-item.active.selected:not(:disabled)) {
        background: var(--accent-active-color) !important;
        box-shadow: inset 4px 0 0 var(--border-color) !important;
        font-weight: 900 !important;
    }

    .sidebar-footer-hint {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 6px;
        padding: 10px 8px;
        background: var(--accent-active-color);
        border-top: 3px solid var(--border-color);
        font-size: var(--font-size-2xs);
        font-weight: 900;
        color: var(--text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        flex-shrink: 0;
        box-sizing: border-box;
    }

    .sidebar-footer-hint kbd {
        background: var(--surface-color);
        border: 1.5px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        border-radius: var(--radius-sm);
        padding: 1px 4px;
        font-family: monospace;
        font-weight: 900;
    }

    .hint-divider {
        opacity: 0.5;
    }

    .hint-item {
        line-height: 1.5;
    }
</style>
