<script lang="ts">
    import { viewport } from "$lib/shared/state/viewport.svelte"
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/shared/ui/Spinner.svelte"
    import { SidebarFooter, SidebarSearch } from "$lib/shared/ui/sidebar"
    import type { FlatHeading } from "$lib/modules/pdf"
    import { KeyboardHandler, commandsStore, useCommands } from "$lib/modules/commands"
    import { createViewerOutlineCommands } from "../commands/viewerOutlineCommands"
    import { MediaQuery } from "svelte/reactivity"
    import Button from "$lib/shared/ui/Button.svelte"
    import { modalManager } from "$lib/shared/ui/modal/modalManager.svelte"
    import { resolveSelectionIndex } from "$lib/shared/state/listSelection"
    import { notesStore } from "../stores/notesStore.svelte"
    import { tick } from "svelte"

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

    let normalizedSearchQuery = $derived(searchQuery.toLowerCase())
    let filteredOutlineList = $derived(
        outlineList?.filter((heading: FlatHeading) =>
            heading.title.toLowerCase().includes(normalizedSearchQuery),
        ) ?? [],
    )

    async function selectHeading(heading: FlatHeading) {
        if (heading.pageNumber === undefined) return

        if (window.innerWidth <= 480) {
            onClose()
            // Commit the closed sidebar before pushState snapshots the current history entry.
            await tick()
        }

        void commandsStore.execute("viewer.page.go-to", {
            page: heading.pageNumber,
            isJump: true,
        })
    }

    let selectedIndex = $derived.by(() => {
        const activeIndex = filteredOutlineList.findIndex((heading: FlatHeading) =>
            activeHeadings.has(heading),
        )
        let automaticIndex = activeIndex
        if (phoneQuery.current) {
            automaticIndex = -1
        } else if (searchQuery || activeIndex === -1) {
            automaticIndex = 0
        }

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
            contentRef.querySelector(".outline-item.selected")?.scrollIntoView({ block: "nearest" })
        })
    }

    function resetSelection() {
        manualSelectedIndex = null
    }

    function isEditableTarget(target: EventTarget | null) {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable)
        )
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
            shouldHandleNavigationKey: (event) =>
                !(
                    isEditableTarget(event.target) &&
                    (KeyboardHandler.matches(event, "j") || KeyboardHandler.matches(event, "k"))
                ),
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

    function formatKey(keys: string): string {
        const modifiers = ["ctrl", "meta", "alt", "shift"]
        const parts = keys.split("+")
        parts.sort((a, b) => {
            const aLower = a.toLowerCase().trim()
            const bLower = b.toLowerCase().trim()
            const aIdx = modifiers.indexOf(aLower)
            const bIdx = modifiers.indexOf(bLower)

            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
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
            contentRef = content
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
            return () => {
                if (contentRef === content) contentRef = undefined
                cancelAnimationFrame(frame)
            }
        }
    }
</script>

{#if outlineList && outlineList.length > 0}
    <SidebarSearch
        bind:ref={searchInputRef}
        bind:value={searchQuery}
        oninput={resetSelection}
        onClear={resetSelection}
        placeholder={`${m.search_headings_placeholder()} [${searchShortcut}]`}
        onkeydown={handleSearchKeydown}
        clearLabel={m.clear_search_aria()}
    />
{/if}

<div
    class="sidebar-content"
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
                    class={`outline-item depth-${heading.depth}${activeHeadings.has(heading) ? " active" : ""}${index === selectedIndex ? " selected" : ""}`}
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

{#if !viewport.isCompact}
    <SidebarFooter>
        <span class="hint-item">
            {#each navigateShortcuts as pair, i (pair.display)}
                {#if i > 0},
                {/if}<kbd>{pair.display}</kbd>
            {/each}
            Navigate
        </span>
        <span class="hint-divider">•</span>
        <span class="hint-item">
            <kbd>{selectShortcut}</kbd> Go
        </span>
        <span class="hint-divider">•</span>
        <span class="hint-item">
            <kbd>{searchShortcut}</kbd> Search
        </span>
        <span class="hint-divider">•</span>
    </SidebarFooter>
{/if}

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
</style>
