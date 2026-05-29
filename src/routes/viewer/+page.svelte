<script lang="ts">
    import PDFDocument from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack, onMount, onDestroy, getContext, setContext } from "svelte"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { goto } from "$app/navigation"

    import ViewerHeader from "./components/ViewerHeader.svelte"
    import OutlineSidebar from "./components/OutlineSidebar.svelte"
    import SettingsSidebar from "./components/SettingsSidebar.svelte"
    import CanvasPane from "./components/CanvasPane.svelte"
    import ScrollCanvasPane from "./components/ScrollCanvasPane.svelte"
    import ViewerFooter from "./components/ViewerFooter.svelte"
    import { resolve } from "$app/paths"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import { cubicInOut } from "svelte/easing"
    import { useKeymap } from "$lib/keymaps"

    function getScrollContainer() {
        if (settingsStore.layout === "scroll") {
            return document.querySelector(".scroll-canvas-pane")
        } else {
            return document.querySelector(".canvas-frame")
        }
    }

    useKeymap([
        {
            keys: "j",
            description: m.keymap_scroll_down(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: 150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "arrowdown",
            description: m.keymap_scroll_down(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: 150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "k",
            description: m.keymap_scroll_up(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: -150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "arrowup",
            description: m.keymap_scroll_up(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: -150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "d",
            description: m.keymap_scroll_page_down(),
            category: "navigation",
            action: () => {
                const currentHeight = window.innerHeight
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: currentHeight / 2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "pagedown",
            description: m.keymap_scroll_page_down(),
            category: "navigation",
            action: () => {
                const currentHeight = window.innerHeight
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: currentHeight / 2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "u",
            description: m.keymap_scroll_page_up(),
            category: "navigation",
            action: () => {
                const currentHeight = window.innerHeight
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: currentHeight / -2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "pageup",
            description: m.keymap_scroll_page_up(),
            category: "navigation",
            action: () => {
                const currentHeight = window.innerHeight
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: currentHeight / -2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            keys: "space",
            description: m.keymap_next_page(),
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            keys: "arrowright",
            description: m.keymap_next_page(),
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            keys: "shift+space",
            description: m.keymap_prev_page(),
            category: "navigation",
            action: () => {
                prevPage()
            },
        },
        {
            keys: "arrowleft",
            description: m.keymap_prev_page(),
            category: "navigation",
            action: () => {
                prevPage()
            },
        },
        {
            keys: "shift+o",
            description: m.keymap_toggle_outline(),
            category: "commands",
            action: () => {
                isOutlineOpen = !isOutlineOpen
            },
        },
        {
            keys: "shift+s",
            description: m.keymap_toggle_settings(),
            category: "commands",
            action: () => {
                isSettingsOpen = !isSettingsOpen
            },
        },
        {
            keys: "q",
            description: m.keymap_close_viewer(),
            category: "commands",
            action: () => {
                goto(resolve("/"))
            },
        },
        {
            keys: "shift+m",
            description: m.keymap_hide_toolbars(),
            category: "commands",
            action: () => {
                isToolbarsVisible = !isToolbarsVisible
            },
        },
        {
            keys: "g",
            description: m.keymap_goto_page(),
            category: "navigation",
            action: () => {
                const cPage = prompt(m.enter_page_number())
                if (cPage) {
                    const page = parseInt(cPage, 10)
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        currentPage = page
                    }
                }
            },
        },
    ])

    const url = $derived(viewerStore.getCurrentBook()?.url ?? "")
    const name = $derived(viewerStore.getCurrentBook()?.name ?? "")

    let pdf = $state.raw<PDFDocument | null>(null)
    let isLoaded = $state(false)

    let currentPage = $state(1)
    let currentPageImage = $state<string | null>(null)
    let currentPageImage2 = $state<string | null>(null)
    let isPageLoading = $state(false)

    let totalPages = $state(0)

    let isOutlineOpen = $state(false)
    let isSettingsOpen = $state(false)

    function restoreBookPosition() {
        const book = viewerStore.getCurrentBook()
        currentPage = book?.pageNumber || 1
    }

    onMount(() => {
        if (viewerStore.isInitialized && !viewerStore.getCurrentBook()) {
            goto(resolve("/"))
            return
        }
        restoreBookPosition()
    })

    $effect(() => {
        if (viewerStore.isInitialized) {
            const currentBook = viewerStore.getCurrentBook()
            if (!currentBook || currentBook.isLocked) {
                goto(resolve("/"))
            }
        }
    })

    $effect(() => {
        if (isLoaded) {
            let cPage = currentPage
            untrack(() => {
                const book = viewerStore.getCurrentBook()
                if (book) {
                    viewerStore.updateBook({ ...book, pageNumber: cPage })
                }
            })
        }
    })

    $effect(() => {
        if (isOutlineOpen) {
            untrack(() => {
                isSettingsOpen = false
            })
        }
    })

    $effect(() => {
        if (isSettingsOpen) {
            untrack(() => {
                isOutlineOpen = false
            })
        }
    })

    let outlineList = $state<FlatHeading[] | null>(null)
    let isOutlineLoading = $state(false)

    let isToolbarsVisible = $state(true)
    let isHoverTriggered = $state(false)

    let activeHeadings = $derived.by(() => {
        if (!outlineList || outlineList.length === 0) return new Set<FlatHeading>()

        const onCurrentPage = outlineList.filter((h) => h.pageNumber === currentPage)
        if (onCurrentPage.length > 0) {
            return new Set<FlatHeading>(onCurrentPage)
        }

        let precedingCandidate: FlatHeading | null = null
        for (const heading of outlineList) {
            if (heading.pageNumber !== undefined && heading.pageNumber < currentPage) {
                if (!precedingCandidate || heading.pageNumber >= precedingCandidate.pageNumber!) {
                    precedingCandidate = heading
                }
            }
        }

        const activeSet = new Set<FlatHeading>()
        if (precedingCandidate) {
            activeSet.add(precedingCandidate)
        }
        return activeSet
    })

    $effect(() => {
        const currentUrl = url
        if (!currentUrl) return

        let canceled = false

        untrack(() => {
            isLoaded = false
            pdf = null
            currentPage = viewerStore.getCurrentBook()?.pageNumber || 1

            const loadPdf = async (pdfUrl: string) => {
                try {
                    const doc = new PDFDocument(pdfUrl)
                    await doc.load()

                    if (!canceled) {
                        pdf = doc
                        totalPages = await doc.getPageNumber()
                        isLoaded = true
                    }
                } catch (err) {
                    console.error("Failed to load PDF:", err)
                    if (!canceled) {
                        isLoaded = false
                        viewerStore.setCurrentBook(null)
                        goto(resolve("/"))
                    }
                }
            }

            loadPdf(currentUrl)
        })

        return () => {
            canceled = true
        }
    })

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded
        const pageNo = currentPage
        const currentScale = settingsStore.scale
        const mode = settingsStore.layout

        if (!currentPdf || !loaded || mode === "scroll") {
            untrack(() => {
                if (currentPageImage && currentPageImage.startsWith("blob:")) {
                    URL.revokeObjectURL(currentPageImage)
                }
                if (currentPageImage2 && currentPageImage2.startsWith("blob:")) {
                    URL.revokeObjectURL(currentPageImage2)
                }
                currentPageImage = null
                currentPageImage2 = null
            })
            return
        }

        const controller = new AbortController()

        untrack(() => {
            isPageLoading = true

            const renderPages = async () => {
                let img1: string | null = null
                let img2: string | null = null
                try {
                    const page1 = await currentPdf.getPage(pageNo)
                    img1 = await currentPdf.getCanvasPage(page1, currentScale, controller.signal)

                    if (mode === "split" && pageNo + 1 <= totalPages) {
                        const page2 = await currentPdf.getPage(pageNo + 1)
                        img2 = await currentPdf.getCanvasPage(
                            page2,
                            currentScale,
                            controller.signal,
                        )
                    }

                    if (!controller.signal.aborted) {
                        untrack(() => {
                            if (currentPageImage && currentPageImage.startsWith("blob:")) {
                                URL.revokeObjectURL(currentPageImage)
                            }
                            if (currentPageImage2 && currentPageImage2.startsWith("blob:")) {
                                URL.revokeObjectURL(currentPageImage2)
                            }
                            currentPageImage = img1
                            currentPageImage2 = img2
                            isPageLoading = false
                        })
                    } else {
                        if (img1 && img1.startsWith("blob:")) URL.revokeObjectURL(img1)
                        if (img2 && img2.startsWith("blob:")) URL.revokeObjectURL(img2)
                    }
                } catch (err: any) {
                    if (img1 && img1.startsWith("blob:")) URL.revokeObjectURL(img1)
                    if (img2 && img2.startsWith("blob:")) URL.revokeObjectURL(img2)
                    if (err.message?.startsWith("Rendering cancelled")) {
                        console.error("Failed to render page(s):", err)
                    }
                    if (!controller.signal.aborted) {
                        untrack(() => {
                            isPageLoading = false
                        })
                    }
                }
            }

            renderPages()
        })

        return () => {
            controller.abort()
        }
    })

    onDestroy(() => {
        if (currentPageImage && currentPageImage.startsWith("blob:")) {
            URL.revokeObjectURL(currentPageImage)
        }
        if (currentPageImage2 && currentPageImage2.startsWith("blob:")) {
            URL.revokeObjectURL(currentPageImage2)
        }
    })

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded

        if (!currentPdf || !loaded) {
            untrack(() => {
                outlineList = null
                isOutlineLoading = false
            })
            return
        }

        let canceled = false

        untrack(() => {
            isOutlineLoading = true
            const loadOutline = async () => {
                try {
                    const list = await currentPdf.getOutline()
                    if (!canceled) {
                        untrack(() => {
                            outlineList = list
                            isOutlineLoading = false
                        })
                    }
                } catch (err) {
                    console.error("Failed to load outline:", err)
                    if (!canceled) {
                        untrack(() => {
                            outlineList = null
                            isOutlineLoading = false
                        })
                    }
                }
            }
            loadOutline()
        })

        return () => {
            canceled = true
        }
    })

    $effect(() => {
        viewerStore.activeOutline = outlineList
        return () => {
            viewerStore.activeOutline = null
        }
    })

    $effect(() => {
        viewerStore.activeTotalPages = totalPages
        return () => {
            viewerStore.activeTotalPages = 0
        }
    })

    $effect(() => {
        viewerStore.goToPage = (page: number) => {
            if (page >= 1 && page <= totalPages) {
                currentPage = page
            }
        }
        return () => {
            viewerStore.goToPage = null
        }
    })

    function handleClose() {
        viewerStore.setCurrentBook(null)
        goto(resolve("/"))
    }

    function nextPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (currentPage + step <= totalPages) {
                currentPage += step
            } else if (currentPage < totalPages) {
                currentPage += 1
            }
        }
    }

    function prevPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (currentPage - step >= 1) {
                currentPage -= step
            } else if (currentPage > 1) {
                currentPage = 1
            }
        }
    }

    function handleBodyClick(e: MouseEvent) {
        if (isToolbarsVisible) return

        const { clientX } = e
        const { innerWidth } = window
        if (clientX < innerWidth / 2) {
            prevPage()
        } else {
            nextPage()
        }
    }

    function slideHeader(node: HTMLElement, { duration = 250 }) {
        const style = getComputedStyle(node)
        const opacity = +style.opacity
        const height = parseFloat(style.height)
        const padding_top = parseFloat(style.paddingTop)
        const padding_bottom = parseFloat(style.paddingBottom)
        const margin_top = parseFloat(style.marginTop)
        const margin_bottom = parseFloat(style.marginBottom)
        const border_top_width = parseFloat(style.borderTopWidth)
        const border_bottom_width = parseFloat(style.borderBottomWidth)

        return {
            duration,
            easing: cubicInOut,
            css: (t: number) => {
                return `
                    overflow: hidden;
                    opacity: ${t * opacity};
                    height: ${t * height}px;
                    padding-top: ${t * padding_top}px;
                    padding-bottom: ${t * padding_bottom}px;
                    margin-top: ${t * margin_top}px;
                    margin-bottom: ${t * margin_bottom}px;
                    border-top-width: ${t * border_top_width}px;
                    border-bottom-width: ${t * border_bottom_width}px;
                    transform: translateY(${(t - 1) * 100}%);
                `
            },
        }
    }

    function slideFooter(node: HTMLElement, { duration = 250 }) {
        const style = getComputedStyle(node)
        const opacity = +style.opacity
        const height = parseFloat(style.height)
        const padding_top = parseFloat(style.paddingTop)
        const padding_bottom = parseFloat(style.paddingBottom)
        const margin_top = parseFloat(style.marginTop)
        const margin_bottom = parseFloat(style.marginBottom)
        const border_top_width = parseFloat(style.borderTopWidth)
        const border_bottom_width = parseFloat(style.borderBottomWidth)

        return {
            duration,
            easing: cubicInOut,
            css: (t: number) => {
                return `
                    overflow: hidden;
                    opacity: ${t * opacity};
                    height: ${t * height}px;
                    padding-top: ${t * padding_top}px;
                    padding-bottom: ${t * padding_bottom}px;
                    margin-top: ${t * margin_top}px;
                    margin-bottom: ${t * margin_bottom}px;
                    border-top-width: ${t * border_top_width}px;
                    border-bottom-width: ${t * border_bottom_width}px;
                    transform: translateY(${(1 - t) * 100}%);
                `
            },
        }
    }
</script>

{#if url}
    <div class="fullscreen-viewer">
        <div class="reader-card">
            <div class="viewer-layout">
                {#if isToolbarsVisible}
                    <div transition:slideHeader={{ duration: settingsStore.animations ? 250 : 0 }}>
                        <ViewerHeader
                            {name}
                            {isLoaded}
                            bind:isOutlineOpen
                            bind:isSettingsOpen
                            onClose={handleClose}
                        />
                    </div>
                {/if}

                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="viewer-body" onclick={handleBodyClick}>
                    {#if !isLoaded}
                        <div class="loading-state">
                            <Spinner variant="dots" label={m.loading_doc()} />
                        </div>
                    {:else}
                        {#if isOutlineOpen}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    isOutlineOpen = false
                                    isHoverTriggered = false
                                }}
                            ></div>
                            <OutlineSidebar
                                {isOutlineLoading}
                                {outlineList}
                                bind:currentPage
                                {activeHeadings}
                                onCloseOutline={() => {
                                    isOutlineOpen = false
                                    isHoverTriggered = false
                                }}
                                onMouseLeave={() => {
                                    if (!isToolbarsVisible && isHoverTriggered) {
                                        isOutlineOpen = false
                                        isHoverTriggered = false
                                    }
                                }}
                            />
                        {/if}

                        {#if isSettingsOpen}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    isSettingsOpen = false
                                }}
                            ></div>
                            <SettingsSidebar onClose={() => (isSettingsOpen = false)} />
                        {/if}

                        {#if !isToolbarsVisible && !isOutlineOpen}
                            <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="outline-hover-trigger"
                                onmouseenter={() => {
                                    isOutlineOpen = true
                                    isHoverTriggered = true
                                }}
                            ></div>
                        {/if}

                        {#if settingsStore.layout === "scroll"}
                            <ScrollCanvasPane
                                {pdf}
                                scale={settingsStore.scale}
                                {totalPages}
                                bind:currentPage
                            />
                        {:else}
                            <CanvasPane
                                {isPageLoading}
                                {currentPageImage}
                                {currentPageImage2}
                                {currentPage}
                                layoutMode={settingsStore.layout === "split" ? "split" : "single"}
                            />
                        {/if}

                        {#if isLoaded}
                            <button
                                class="fab-toggle"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    isToolbarsVisible = !isToolbarsVisible
                                }}
                                aria-label={isToolbarsVisible
                                    ? m.hide_toolbars()
                                    : m.show_toolbars()}
                                title={isToolbarsVisible ? m.hide_toolbars() : m.show_toolbars()}
                            >
                                {#if isToolbarsVisible}
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="square"
                                        stroke-linejoin="miter"
                                    >
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                    </svg>
                                {:else}
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="square"
                                        stroke-linejoin="miter"
                                    >
                                        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                                    </svg>
                                {/if}
                            </button>
                        {/if}
                    {/if}
                </div>

                {#if isLoaded && isToolbarsVisible}
                    <div transition:slideFooter={{ duration: settingsStore.animations ? 250 : 0 }}>
                        <ViewerFooter
                            bind:currentPage
                            {totalPages}
                            {isPageLoading}
                            {nextPage}
                            {prevPage}
                        />
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .fullscreen-viewer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100dvh;
        z-index: 9999;
        background-color: var(--bg-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .reader-card {
        flex: 1;
        background: var(--card-bg, #ffffff);
        overflow: hidden;
        display: flex;
        flex-direction: column;

        /* Light theme local styling custom properties */
        --viewer-header-bg: #ffde4d;
        --viewer-footer-bg: #ff7675;
        --viewer-accent: #00cec9;
        --viewer-accent-active: #ffde4d;
        --viewer-body-bg: #faf8f5;
        --canvas-pane-bg: #fcfcfc;
        --canvas-frame-bg: #ffffff;
        --sidebar-content-bg: #faf8f5;
        --sidebar-header-bg: #ffde4d;
        --outline-hover-bg: #00cec9;
        --outline-active-bg: #ffde4d;
        --outline-item-border: rgba(0, 0, 0, 0.15);
        --page-input-focus: #00cec9;
        --page-input-disabled-bg: #eee;
        --doc-text-color: #1a1a1a;
        --doc-file-badge-bg: #1a1a1a;
        --doc-file-badge-text: #ffffff;
        --pane-loader-bg: rgba(250, 248, 245, 0.85);
        --close-sidebar-hover-bg: #ff7675;
        --close-sidebar-hover-text: #ffffff;
        --pagination-text-shadow: #1a1a1a;
        --no-outline-text: #777777;
    }

    :global(html.dark) .reader-card {
        /* Dark theme local styling custom properties */
        --viewer-header-bg: #2e2824;
        --viewer-footer-bg: #b85244;
        --viewer-accent: #b85244;
        --viewer-accent-active: #5c5146;
        --viewer-body-bg: #1b1715;
        --canvas-pane-bg: #100d0b;
        --canvas-frame-bg: #241f1c;
        --sidebar-content-bg: #241f1c;
        --sidebar-header-bg: #2e2824;
        --outline-hover-bg: #b85244;
        --outline-active-bg: #5c5146;
        --outline-item-border: rgba(210, 199, 177, 0.15);
        --page-input-focus: #b85244;
        --page-input-disabled-bg: #1b1715;
        --doc-text-color: var(--text-color);
        --doc-file-badge-bg: #5c5146;
        --doc-file-badge-text: #d2c7b1;
        --pane-loader-bg: rgba(27, 23, 21, 0.85);
        --close-sidebar-hover-bg: #b85244;
        --close-sidebar-hover-text: #ffffff;
        --pagination-text-shadow: #100d0b;
        --no-outline-text: #a09580;
    }

    /* Active Reader Screen */
    .viewer-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
    }

    .viewer-body {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: var(--viewer-body-bg);
        display: flex;
        flex-direction: row;
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .sidebar-backdrop {
        display: block;
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
        z-index: 150;
        cursor: pointer;
        animation: fade-in 0.2s ease-out;
    }

    .outline-hover-trigger {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 24px;
        z-index: 2;
        cursor: pointer;
    }

    .fab-toggle {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 50px;
        height: 50px;
        background: var(--viewer-accent);
        border: 3px solid var(--border-color);
        box-shadow: 6px 6px 0 var(--shadow-color);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-color);
        padding: 0;
    }

    .fab-toggle:hover {
        transform: translate(-2px, -2px);
        box-shadow: 8px 8px 0 var(--shadow-color);
        background: var(--viewer-accent-active);
    }

    .fab-toggle:active {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .fab-toggle svg {
        width: 24px;
        height: 24px;
    }

    @media (max-width: 600px) {
        .fab-toggle {
            bottom: 16px;
            right: 16px;
            width: 44px;
            height: 44px;
            border-width: 2px;
            box-shadow: 4px 4px 0 var(--shadow-color);
        }

        .fab-toggle svg {
            width: 20px;
            height: 20px;
        }
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
</style>
