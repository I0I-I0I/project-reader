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

    let totalPages = $state(0)

    let isOutlineOpen = $state(false)
    let outlineList = $state<FlatHeading[] | null>(null)
    let isOutlineLoading = $state(false)

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

        if (!currentPdf || !loaded) {
            untrack(() => {
                currentPageImage = null
            })
            return
        }

        let canceled = false

        untrack(() => {
            isPageLoading = true

            const renderPage = async (pNo: number) => {
                try {
                    const page = await currentPdf.getPage(pNo)

                    const img = await currentPdf.getImage(page)

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

            renderPage(pageNo)
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
</script>

{#if url}
    <div class="fullscreen-viewer">
        <div class="reader-card">
            <div class="viewer-layout">
                <ViewerHeader {name} {isLoaded} bind:isOutlineOpen onClose={handleClose} />

                <div class="viewer-body">
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
                                onclick={() => (isOutlineOpen = false)}
                            ></div>
                            <OutlineSidebar
                                {isOutlineLoading}
                                {outlineList}
                                bind:currentPage
                                {activeHeadings}
                                onCloseOutline={() => (isOutlineOpen = false)}
                            />
                        {/if}

                        <CanvasPane {isPageLoading} {currentPageImage} {currentPage} />
                    {/if}
                </div>

                {#if isLoaded}
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
        display: none;
    }

    @media (max-width: 800px) {
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
