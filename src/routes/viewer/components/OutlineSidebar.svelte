<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import type { FlatHeading } from "$lib/pdf"
    import { cubicOut } from "svelte/easing"
    import { KEYMAP_CONTEXT_KEY, KeymapNode } from "$lib/keymaps"
    import { getContext, onMount, setContext, untrack } from "svelte"
    import { settingsStore } from "$lib/settingsStore.svelte"

    let {
        isOutlineLoading,
        outlineList,
        currentPage = $bindable(),
        activeHeadings,
        onCloseOutline,
        onMouseLeave,
    } = $props<{
        isOutlineLoading: boolean
        outlineList: FlatHeading[] | null
        currentPage: number
        activeHeadings: Set<FlatHeading>
        onCloseOutline: () => void
        onMouseLeave?: (e: MouseEvent) => void
    }>()

    const parentNode = getContext<KeymapNode>(KEYMAP_CONTEXT_KEY)
    const outlineNode = new KeymapNode(parentNode)
    setContext(KEYMAP_CONTEXT_KEY, outlineNode)
    const setActiveNode = getContext<(node: KeymapNode | null) => void>("set_active_keymap_node")

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

    // Unified effect to set/reset selectedIndex based on active heading and search query
    $effect(() => {
        if (isOutlineLoading || !filteredOutlineList || filteredOutlineList.length === 0) return

        const currentQuery = searchQuery
        untrack(() => {
            if (selectedIndex === -1) {
                // Initial mount or reset: Find active heading
                const index = filteredOutlineList.findIndex((h: FlatHeading) =>
                    activeHeadings.has(h),
                )
                selectedIndex = index !== -1 ? index : 0
                lastQuery = currentQuery
            } else if (currentQuery !== lastQuery) {
                // Search query changed
                lastQuery = currentQuery
                if (currentQuery !== "") {
                    // Select first matching search result
                    selectedIndex = 0
                } else {
                    // Search cleared: reset to active heading
                    const index = filteredOutlineList.findIndex((h: FlatHeading) =>
                        activeHeadings.has(h),
                    )
                    selectedIndex = index !== -1 ? index : 0
                }
            }
        })
    })

    // Auto-scroll selected element into view
    $effect(() => {
        const _ = selectedIndex
        const __ = filteredOutlineList.length
        untrack(() => {
            scrollSelectedIntoView()
        })
    })

    onMount(() => {
        setActiveNode(outlineNode)
        const unregisterAll = outlineNode.registerAll([
            {
                keys: "j",
                description: m.keymap_next_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                keys: "arrowdown",
                description: m.keymap_next_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                keys: "k",
                description: m.keymap_prev_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
                keys: "arrowup",
                description: m.keymap_prev_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
                keys: "ctrl+n",
                description: m.keymap_next_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("next")
                },
            },
            {
                keys: "ctrl+p",
                description: m.keymap_prev_heading(),
                action: (event) => {
                    event.preventDefault()
                    navigateSelection("prev")
                },
            },
            {
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
                keys: "/",
                description: m.keymap_search_headings(),
                action: (event) => {
                    event.preventDefault()
                    searchInputRef?.focus()
                    searchInputRef?.select()
                },
            },
        ])
        return () => {
            setActiveNode(parentNode)
            unregisterAll()
        }
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
                    activeElements[activeElements.length - 1].scrollIntoView({ block: "center" })
                }
                hasScrolledInitially = true
            })
        }
    })

    function slideAndFly(node: HTMLElement, { duration = 150 }) {
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
        <button class="close-sidebar-btn" onclick={onCloseOutline} aria-label={m.close()}>
            ×
        </button>
    </div>

    {#if outlineList && outlineList.length > 0}
        <div class="sidebar-search">
            <input
                bind:this={searchInputRef}
                type="text"
                bind:value={searchQuery}
                placeholder="Search headings... (/)"
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
                    aria-label="Clear search"
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
            <div class="no-outline">No matching headings found</div>
        {:else}
            <nav class="outline-nav">
                {#each filteredOutlineList as heading, index}
                    <button
                        class="outline-item depth-{heading.depth}"
                        class:active={activeHeadings.has(heading)}
                        class:selected={index === selectedIndex}
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
                    </button>
                {/each}
            </nav>
        {/if}
    </div>
</div>

<style>
    .outline-sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 280px;
        background: var(--sidebar-content-bg);
        border-right: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.1);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--sidebar-header-bg);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        flex-shrink: 0;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--doc-text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .close-sidebar-btn {
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
    }

    .close-sidebar-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--close-sidebar-hover-bg);
        color: var(--close-sidebar-hover-text);
    }

    .close-sidebar-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        background: var(--sidebar-content-bg);
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
        color: var(--no-outline-text);
    }

    .outline-nav {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
    }

    .outline-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        background: none;
        border: none;
        border-bottom: 1px dashed var(--outline-item-border);
        padding: 10px 16px;
        padding-left: calc(16px + var(--depth) * 12px);
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-color);
        cursor: pointer;
        text-align: left;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .outline-item:hover:not(:disabled) {
        background: var(--outline-hover-bg);
        color: var(--text-color);
        font-weight: 800;
    }

    .outline-item.active:not(:disabled) {
        background: var(--outline-active-bg);
        color: var(--text-color);
        font-weight: 900;
        border-bottom-style: solid;
    }

    .outline-item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .heading-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 8px;
    }

    .heading-page {
        background: var(--doc-file-badge-bg);
        color: var(--doc-file-badge-text);
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
        background: var(--sidebar-header-bg);
        border-bottom: 3px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
    }

    .search-input {
        width: 100%;
        padding: 6px 32px 6px 12px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        background: var(--button-bg);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .search-input:focus {
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

    .clear-search-btn:hover {
        opacity: 1;
    }

    .outline-item.selected:not(:disabled) {
        background: var(--outline-hover-bg);
        box-shadow: inset 4px 0 0 var(--border-color);
        font-weight: 800;
    }

    .outline-item.active.selected:not(:disabled) {
        background: var(--outline-active-bg);
        box-shadow: inset 4px 0 0 var(--border-color);
        font-weight: 900;
    }

    @media (max-width: 480px) {
        .outline-sidebar {
            width: 100%;
            border-right: none;
        }
    }
</style>
