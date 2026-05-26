<script lang="ts">
    import PDFDocument from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "$lib/components/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack, onMount } from "svelte"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { goto } from "$app/navigation"

    import ViewerHeader from "./components/ViewerHeader.svelte"
    import OutlineSidebar from "./components/OutlineSidebar.svelte"
    import CanvasPane from "./components/CanvasPane.svelte"
    import ViewerFooter from "./components/ViewerFooter.svelte"

    onMount(() => {
        if (!viewerStore.getCurrentBook()) {
            goto("/")
        }
    })

    const url = $derived(viewerStore.getCurrentBook()?.url ?? "")
    const name = $derived(viewerStore.getCurrentBook()?.name ?? "")

    let pdf = $state.raw<PDFDocument | null>(null)
    let isLoaded = $state(false)

    let currentPage = $state(1)
    let currentPageImage = $state<string | null>(null)
    let isPageLoading = $state(false)
    let scale = $state(1.5)

    let totalPages = $state(0)

    let isOutlineOpen = $state(false)
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
            currentPage = 1

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
                        goto("/")
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
        const currentScale = scale

        if (!currentPdf || !loaded) {
            untrack(() => {
                currentPageImage = null
            })
            return
        }

        let canceled = false

        untrack(() => {
            isPageLoading = true

            const renderPage = async (pNo: number, s: number) => {
                try {
                    const page = await currentPdf.getPage(pNo)

                    const img = await currentPdf.getCanvasPage(page, s)

                    if (!canceled) {
                        untrack(() => {
                            currentPageImage = img
                            isPageLoading = false
                        })
                    }
                } catch (err) {
                    console.error("Failed to render page:", err)
                    if (!canceled) {
                        untrack(() => {
                            isPageLoading = false
                        })
                    }
                }
            }

            renderPage(pageNo, currentScale)
        })

        return () => {
            canceled = true
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

    function handleClose() {
        viewerStore.setCurrentBook(null)
        goto("/")
    }

    function nextPage() {
        if (currentPage < totalPages && !isPageLoading) {
            currentPage += 1
        }
    }

    function prevPage() {
        if (currentPage > 1 && !isPageLoading) {
            currentPage -= 1
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
</script>

{#if url}
    <div class="fullscreen-viewer">
        <div class="reader-card">
            <div class="viewer-layout">
                {#if isToolbarsVisible}
                    <ViewerHeader
                        {name}
                        {isLoaded}
                        bind:isOutlineOpen
                        bind:scale
                        onClose={handleClose}
                    />
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

                        <CanvasPane {isPageLoading} {currentPageImage} {currentPage} />

                        {#if isLoaded}
                            <button
                                class="fab-toggle"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    isToolbarsVisible = !isToolbarsVisible
                                }}
                                aria-label={isToolbarsVisible ? "Hide toolbars" : "Show toolbars"}
                                title={isToolbarsVisible ? "Hide toolbars" : "Show toolbars"}
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
                    <ViewerFooter bind:currentPage {totalPages} {isPageLoading} />
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
        z-index: 4;
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
