<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import type { FlatHeading } from "$lib/pdf"
    import { cubicOut } from "svelte/easing"
    import {
        useCommands,
        getShortcutHint,
        type CommandNode,
    } from "$lib/stores/commandsStore.svelte"
    import { getContext, untrack } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"

    let {
        isOutlineLoading,
        outlineList,
        currentPage = $bindable(),
        scrollPosition = $bindable(),
        activeHeadings,
        onCloseOutline,
        onMouseLeave,
    } = $props<{
        isOutlineLoading: boolean
        outlineList: FlatHeading[] | null
        currentPage: number
        scrollPosition: number
        activeHeadings: Set<FlatHeading>
        onCloseOutline: () => void
        onMouseLeave?: (e: MouseEvent) => void
    }>()

    let searchQuery = $state("")
    let selectedIndex = $state(-1)
    let searchInputRef = $state<HTMLInputElement | undefined>()

    let filteredOutlineList = $derived(
        outlineList
            ? outlineList.filter((h: FlatHeading) =>
                  h.title.toLowerCase().includes(searchQuery.toLowerCase()),
              )
            : [],
    )

    function selectHeading(heading: FlatHeading) {
        if (heading.pageNumber !== undefined) {
            currentPage = heading.pageNumber
            scrollPosition = 0
            if (window.innerWidth <= 480) {
                onCloseOutline()
            }
        }
    }

    function navigateSelection(direction: "next" | "prev") {
        if (filteredOutlineList.length === 0) return
        if (direction === "next") {
            selectedIndex = (selectedIndex + 1) % filteredOutlineList.length
        } else {
            selectedIndex =
                (selectedIndex - 1 + filteredOutlineList.length) % filteredOutlineList.length
        }
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault()
            const heading = filteredOutlineList[selectedIndex]
            if (heading) {
                selectHeading(heading)
                onCloseOutline()
            }
        } else if (event.ctrlKey && event.key === "n") {
            event.preventDefault()
            navigateSelection("next")
        } else if (event.ctrlKey && event.key === "p") {
            event.preventDefault()
            navigateSelection("prev")
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

    let lastQuery = ""

    $effect(() => {
        if (isOutlineLoading || !filteredOutlineList || filteredOutlineList.length === 0) return

        const currentQuery = searchQuery
        untrack(() => {
            if (selectedIndex === -1) {
                const index = filteredOutlineList.findIndex((h: FlatHeading) =>
                    activeHeadings.has(h),
                )
                selectedIndex = index !== -1 ? index : 0
                lastQuery = currentQuery
            } else if (currentQuery !== lastQuery) {
                lastQuery = currentQuery
                if (currentQuery !== "") {
                    selectedIndex = 0
                } else {
                    const index = filteredOutlineList.findIndex((h: FlatHeading) =>
                        activeHeadings.has(h),
                    )
                    selectedIndex = index !== -1 ? index : 0
                }
            }
        })
    })

    $effect(() => {
        const _ = selectedIndex
        const __ = filteredOutlineList.length
        untrack(() => {
            scrollSelectedIntoView()
        })
    })

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    const sidebarCommandsNode = useCommands(
        [
            {
                id: "close-outline-escape",
                keys: "escape",
                action: () => {
                    onCloseOutline()
                },
                description: m.keymap_close_outline(),
                allowInInputs: true,
            },
            {
                id: "close-outline-q",
                keys: "q",
                action: () => {
                    onCloseOutline()
                },
                description: m.keymap_close_outline(),
                allowInInputs: true,
            },
            {
                id: "scroll-down",
                keys: "j",
                description: m.keymap_next_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                id: "scroll-down-alt",
                keys: "arrowdown",
                description: m.keymap_next_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                id: "scroll-up",
                keys: "k",
                description: m.keymap_prev_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
                id: "scroll-up-alt",
                keys: "arrowup",
                description: m.keymap_prev_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
                id: "next-heading-ctrl-n",
                keys: "ctrl+n",
                description: m.keymap_next_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                id: "prev-heading-ctrl-p",
                keys: "ctrl+p",
                description: m.keymap_prev_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
                id: "select-heading",
                keys: "enter",
                description: m.keymap_select_heading(),
                action: (event) => {
                    event.preventDefault()
                    const heading = filteredOutlineList[selectedIndex]
                    if (heading) {
                        selectHeading(heading)
                        onCloseOutline()
                    }
                },
            },
            {
                id: "search-headings",
                keys: "/",
                description: m.keymap_search_headings(),
                action: (event) => {
                    event.preventDefault()
                    searchInputRef?.focus()
                    searchInputRef?.select()
                },
            },
        ],
        activeNodeBeforeOpen,
    )

    function formatKey(keys: string): string {
        return keys
            .split("+")
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

    let navigateShortcuts = $derived.by(() => {
        if (!sidebarCommandsNode) return []
        const cmds = sidebarCommandsNode.getAllCommands()

        const nextCmds = cmds.filter((c) => c.id?.startsWith("next-heading-") && c.keys)
        const prevCmds = cmds.filter((c) => c.id?.startsWith("prev-heading-") && c.keys)

        const pairs: { next: string; prev: string; display: string }[] = []

        const nextToPrevSuffix: Record<string, string> = {
            j: "k",
            arrowdown: "arrowup",
            "ctrl-n": "ctrl-p",
        }

        for (const nextCmd of nextCmds) {
            const suffix = nextCmd.id?.replace("next-heading-", "") || ""
            const expectedPrevSuffix = nextToPrevSuffix[suffix]
            if (expectedPrevSuffix) {
                const prevCmd = prevCmds.find((c) => c.id === `prev-heading-${expectedPrevSuffix}`)
                if (prevCmd && prevCmd.keys && nextCmd.keys) {
                    pairs.push({
                        next: nextCmd.keys,
                        prev: prevCmd.keys,
                        display: `${formatKey(nextCmd.keys)}/${formatKey(prevCmd.keys)}`,
                    })
                }
            }
        }
        return pairs
    })

    let closeShortcuts = $derived.by(() => {
        if (!sidebarCommandsNode) return []
        const cmds = sidebarCommandsNode.getAllCommands()
        const closeCmds = cmds.filter((c) => c.id?.startsWith("close-outline-") && c.keys)
        return closeCmds.map((c) => formatKey(c.keys!))
    })

    let selectShortcut = $derived.by(() => {
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "select-heading" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let searchShortcut = $derived.by(() => {
        if (!sidebarCommandsNode) return ""
        const cmd = sidebarCommandsNode
            .getAllCommands()
            .find((c) => c.id === "search-headings" && c.keys)
        return cmd ? formatKey(cmd.keys!) : ""
    })

    let contentRef: HTMLElement | undefined = $state()
    let hasScrolledInitially = false

    $effect(() => {
        if (
            !isOutlineLoading &&
            outlineList &&
            outlineList.length > 0 &&
            contentRef &&
            !hasScrolledInitially
        ) {
            requestAnimationFrame(() => {
                if (!contentRef) return
                const activeElements = contentRef.querySelectorAll(".outline-item.active")
                if (activeElements.length > 0) {
                    activeElements[activeElements.length - 1].scrollIntoView({
                        block: "center",
                    })
                }
                hasScrolledInitially = true
            })
        }
    })

    function slideAndFly(_: HTMLElement, { duration = 150 }) {
        return {
            duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                return `
                    transform: translateX(${(eased - 1) * 100}%);
                `
            },
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="outline-sidebar"
    transition:slideAndFly={{ duration: settingsStore.animations ? 150 : 0 }}
    onmouseleave={onMouseLeave}
    onclick={(e) => e.stopPropagation()}
>
    <div class="sidebar-header">
        <h3>{m.outline()}</h3>
        <Button
            variant="close"
            size="small"
            square={true}
            onclick={onCloseOutline}
            aria-label={m.close()}
            tooltip={m.close()}
        >
            ×
        </Button>
    </div>

    {#if outlineList && outlineList.length > 0}
        <div class="sidebar-search">
            <input
                bind:this={searchInputRef}
                type="text"
                bind:value={searchQuery}
                placeholder={`${m.search_headings_placeholder()}${getShortcutHint(sidebarCommandsNode, "search-headings")}`}
                class="search-input"
                onkeydown={handleSearchKeydown}
            />
            {#if searchQuery}
                <button
                    class="clear-search-btn"
                    onclick={() => {
                        searchQuery = ""
                        searchInputRef?.focus()
                    }}
                    aria-label={m.clear_search_aria()}
                >
                    ×
                </button>
            {/if}
        </div>
    {/if}

    <div class="sidebar-content" bind:this={contentRef}>
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
                {#each filteredOutlineList as heading, index}
                    <Button
                        variant="none"
                        size="none"
                        class="outline-item depth-{heading.depth} {activeHeadings.has(heading)
                            ? 'active'
                            : ''} {index === selectedIndex ? 'selected' : ''}"
                        onclick={() => {
                            selectHeading(heading)
                            selectedIndex = index
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
                    {#each navigateShortcuts as pair, i}
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
            {#if closeShortcuts.length > 0}
                <span class="hint-item">
                    {#each closeShortcuts as shortcut, i}
                        {#if i > 0}/{/if}<kbd>{shortcut}</kbd>
                    {/each}
                    Close
                </span>
            {/if}
        </div>
    {/if}
</div>

<style>
    .outline-sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 280px;
        background: color-mix(in srgb, var(--surface-color) 85%, transparent);
        backdrop-filter: blur(16px);
        border-right: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: visible;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: color-mix(in srgb, var(--accent-active-color) 85%, transparent);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top));
        padding-left: calc(16px + env(safe-area-inset-left));
        flex-shrink: 0;
        position: relative;
        z-index: 10;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

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
        font-size: 13px;
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
        padding: 10px 16px !important;
        padding-left: calc(16px + var(--depth) * 12px) !important;
        font-family: inherit !important;
        font-size: 12px !important;
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
        font-size: 9px;
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 2px;
        flex-shrink: 0;
        border: 1px solid var(--border-color);
    }

    .sidebar-search {
        position: relative;
        padding: 10px 16px;
        background: color-mix(in srgb, var(--accent-active-color) 70%, transparent);
        border-bottom: 3px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
        z-index: 5;
    }

    .search-input {
        width: 100%;
        padding: 6px 32px 6px 12px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    @media (max-width: 640px) {
        .search-input {
            font-size: 16px;
        }
    }

    .search-input:focus-visible {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-color: var(--border-color);
    }

    .clear-search-btn {
        position: absolute;
        right: 22px;
        background: none;
        border: none;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        color: var(--text-color);
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.1s ease;
    }

    @media (hover: hover) {
        .clear-search-btn:hover {
            opacity: 1;
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

    @media (--tiny-mobile) {
        .outline-sidebar {
            width: 100%;
            border-right: none;
        }
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
        font-size: 9px;
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
        border-radius: 2px;
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
