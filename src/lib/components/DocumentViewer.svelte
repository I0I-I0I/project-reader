<script lang="ts">
    import PDFDocument from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "./ui/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack } from "svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import MenuIcon from "./icons/MenuIcon.svelte"

    interface Props {
        url: string
        name: string
        onclose: () => void
    }

    let { url, name, onclose }: Props = $props()

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
        let loadedDoc: PDFDocument | null = null

        untrack(() => {
            isLoaded = false
            pdf = null
            currentPage = 1

            const loadPdf = async (pdfUrl: string) => {
                try {
                    const doc = new PDFDocument(pdfUrl)
                    await doc.load(settingsStore.scale)

                    if (!canceled) {
                        loadedDoc = doc
                        pdf = doc
                        totalPages = await doc.getPageNumber()
                        isLoaded = true
                    } else {
                        await doc.close()
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
            if (loadedDoc) {
                loadedDoc.close()
            }
        }
    })

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded
        const pageNo = currentPage
        const quality = settingsStore.quality

        if (!currentPdf || !loaded) {
            untrack(() => {
                currentPageImage = null
            })
            return
        }

        const controller = new AbortController()

        untrack(() => {
            isPageLoading = true

            const renderPage = async (pNo: number) => {
                let img: string | null = null
                try {
                    const page = await currentPdf.getPage(pNo)

                    img = await currentPdf.getCanvasPage(page, quality, controller.signal)

                    if (!controller.signal.aborted) {
                        untrack(() => {
                            currentPageImage = img
                            isPageLoading = false
                        })
                    }
                } catch (err: any) {
                    if (err.message?.startsWith("Rendering cancelled")) {
                        console.error("Failed to render page:", err)
                    }
                    if (!controller.signal.aborted) {
                        untrack(() => {
                            isPageLoading = false
                        })
                    }
                }
            }

            renderPage(pageNo)
        })

        return () => {
            controller.abort()
        }
    })

    import { onDestroy } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    onDestroy(() => {
        if (pdf) {
            pdf.close()
        }
    })

    let lastPdf: PDFDocument | null = null

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded
        const open = isOutlineOpen

        if (currentPdf !== lastPdf) {
            untrack(() => {
                outlineList = null
                isOutlineLoading = false
                lastPdf = currentPdf
            })
        }

        if (!currentPdf || !loaded) {
            return
        }

        if (!open) return

        let canceled = false

        untrack(() => {
            if (!outlineList) {
                isOutlineLoading = true
            }
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

    function nextValidPage() {
        if (currentPage < totalPages) {
            currentPage += 1
        }
    }

    function prevValidPage() {
        if (currentPage > 1) {
            currentPage -= 1
        }
    }

    function handlePageInput(event: Event) {
        const input = event.target as HTMLInputElement
        const value = parseInt(input.value, 10)
        if (!isNaN(value) && value >= 1 && value <= totalPages) {
            currentPage = value
        } else {
            input.value = currentPage.toString()
        }
    }
</script>

<div class="reader-card">
    <!-- Active PDF Reader Workspace -->
    <div class="viewer-layout">
        <!-- Toolbar / Header Bar -->
        <div class="viewer-header">
            <div class="doc-info">
                {#if isLoaded}
                    <Button
                        variant="action"
                        square={true}
                        open={isOutlineOpen}
                        onclick={() => (isOutlineOpen = !isOutlineOpen)}
                        aria-label={m.outline()}
                    >
                        <MenuIcon />
                    </Button>
                {/if}
                <span class="file-badge">PDF</span>
                <span class="file-name" title={name}>{name || "document.pdf"}</span>
            </div>
            <div class="header-actions">
                <Button onclick={onclose} aria-label={m.close_document()}>
                    {m.close()} ×
                </Button>
            </div>
        </div>

        <!-- Reading Room / Single visual page body -->
        <div class="viewer-body">
            {#if !isLoaded}
                <div class="loading-state">
                    <Spinner variant="dots" label={m.loading_doc()} />
                </div>
            {:else}
                {#if isOutlineOpen}
                    <div class="outline-sidebar">
                        <div class="sidebar-header">
                            <h3>{m.outline()}</h3>
                            <button
                                class="close-sidebar-btn"
                                onclick={() => (isOutlineOpen = false)}
                                aria-label={m.close()}
                            >
                                ×
                            </button>
                        </div>
                        <div class="sidebar-content">
                            {#if isOutlineLoading}
                                <div class="outline-loader">
                                    <Spinner variant="dots" size="sm" label="" />
                                </div>
                            {:else if !outlineList || outlineList.length === 0}
                                <div class="no-outline">
                                    {m.no_outline()}
                                </div>
                            {:else}
                                <nav class="outline-nav">
                                    {#each outlineList as heading}
                                        <button
                                            class="outline-item depth-{heading.depth}"
                                            class:active={activeHeadings.has(heading)}
                                            onclick={() => {
                                                if (heading.pageNumber !== undefined) {
                                                    currentPage = heading.pageNumber
                                                }
                                            }}
                                            disabled={heading.pageNumber === undefined}
                                            style="--depth: {heading.depth}"
                                            title={heading.title}
                                        >
                                            <span class="heading-title">{heading.title}</span>
                                            {#if heading.pageNumber !== undefined}
                                                <span class="heading-page"
                                                    >{heading.pageNumber}</span
                                                >
                                            {/if}
                                        </button>
                                    {/each}
                                </nav>
                            {/if}
                        </div>
                    </div>
                {/if}

                <div class="canvas-pane">
                    <div class="canvas-frame">
                        {#if isPageLoading}
                            <div class="pane-loader">
                                <Spinner variant="dots" size="lg" label={m.rendering_page()} />
                            </div>
                        {:else if currentPageImage}
                            <div class="pdf-image-wrapper">
                                <img
                                    src={currentPageImage}
                                    alt={m.page_render_alt({ page: currentPage })}
                                    class="pdf-image"
                                />
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Footer Pagination Bar -->
        {#if isLoaded}
            <div class="viewer-footer">
                <Button onclick={prevValidPage} disabled={currentPage <= 1 || isPageLoading}>
                    {m.prev_page()}
                </Button>
                <div class="pagination-indicator">
                    {m.page()}
                    <input
                        type="number"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        aria-label="Page number"
                        value={currentPage}
                        min="1"
                        max={totalPages}
                        onchange={handlePageInput}
                        class="page-input"
                        disabled={isPageLoading}
                    />
                    {m.of_pages({ total: totalPages })}
                </div>
                <Button
                    onclick={nextValidPage}
                    disabled={currentPage >= totalPages || isPageLoading}
                >
                    {m.next_page()}
                </Button>
            </div>
        {/if}
    </div>
</div>

<style>
    .reader-card {
        grid-column: 1 / -1;
        background: var(--surface-color, #ffffff);
        border: 3px solid var(--border-color);
        box-shadow: 8px 8px 0 var(--shadow-color);
        margin-top: 20px;
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        overflow: hidden;
    }

    /* Active Reader Screen */
    .viewer-layout {
        display: flex;
        flex-direction: column;
        height: 750px;
    }

    .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--accent-active-color);
        border-bottom: 3px solid var(--border-color);
        padding: 12px 20px;
        color: var(--text-color);
    }

    .doc-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .file-badge {
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        font-size: 10px;
        font-weight: 900;
        padding: 3px 8px;
        border-radius: 2px;
        letter-spacing: 0.5px;
        border: 1.5px solid var(--border-color);
    }

    .file-name {
        font-size: 14px;
        font-weight: 800;
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
    }

    .header-actions :global(.action-btn) {
        background: var(--surface-color);
        font-size: 11px;
        padding: 4px 10px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-color);
    }

    @media (hover: hover) {
        .header-actions :global(.action-btn:hover) {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--surface-hover-color, #faf8f5);
        }
    }

    .header-actions :global(.action-btn:active) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .viewer-body {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: var(--surface-hover-color);
        display: flex;
        flex-direction: row;
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .canvas-pane {
        display: flex;
        flex-direction: column;
        padding: 20px;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        background: var(--canvas-bg-color);
    }

    .canvas-frame {
        flex: 1;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
        overflow: auto;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        position: relative;
        padding: 16px;
    }

    .pane-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        inset: 0;
        background: var(--overlay-color);
        backdrop-filter: blur(1px);
        z-index: 10;
    }

    .pdf-image-wrapper {
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        display: inline-flex;
        max-width: 100%;
    }

    .pdf-image {
        max-width: 100%;
        height: auto;
        display: block;
    }

    :global(html.dark) .pdf-image {
        filter: invert(1) hue-rotate(180deg);
    }

    /* Footer / Pagination */
    .viewer-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--danger-color);
        border-top: 3px solid var(--border-color);
        padding: 14px 20px;
    }

    .viewer-footer :global(.action-btn) {
        background: var(--surface-color);
        min-width: 120px;
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        padding: 8px 16px;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        color: var(--text-color);
    }

    @media (hover: hover) {
        .viewer-footer :global(.action-btn:hover:not(:disabled)) {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--shadow-color);
            background: var(--surface-hover-color, #faf8f5);
        }
    }

    .viewer-footer :global(.action-btn:active:not(:disabled)) {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .viewer-footer :global(.action-btn:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 var(--shadow-color);
        transform: translate(1px, 1px);
    }

    .pagination-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 900;
        font-size: 14px;
        color: var(--danger-text-color, #ffffff);
        text-shadow: 1.5px 1.5px 0 var(--shadow-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .page-input {
        width: 55px;
        height: 32px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        text-align: center;
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        background: var(--surface-color);
        color: var(--text-color);
        outline: none;
    }

    .page-input:focus-visible {
        border-color: var(--accent-color);
    }

    .page-input:disabled {
        background: var(--disabled-bg-color);
        cursor: not-allowed;
    }

    .outline-sidebar {
        width: 280px;
        min-width: 280px;
        background: var(--surface-color);
        border-right: 3px solid var(--border-color);
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 5;
        box-sizing: border-box;
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--accent-active-color);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        flex-shrink: 0;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--text-color);
        letter-spacing: 0.5px;
    }

    .close-sidebar-btn {
        background: var(--surface-color);
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
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            color 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
    }

    @media (hover: hover) {
        .close-sidebar-btn:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--danger-active-color);
            color: var(--danger-text-color);
        }
    }

    .close-sidebar-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        background: var(--surface-color);
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
        transition:
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            color 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            font-weight 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    @media (hover: hover) {
        .outline-item:hover:not(:disabled) {
            background: var(--accent-color);
            color: var(--text-color);
            font-weight: 800;
        }
    }

    .outline-item.active:not(:disabled) {
        background: var(--accent-active-color);
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
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        font-size: 9px;
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 2px;
        flex-shrink: 0;
        border: 1px solid var(--border-color);
    }

    @media (--mobile-width) {
        .viewer-layout {
            height: 600px;
        }

        .outline-sidebar {
            position: absolute;
            left: 0;
            top: 59px;
            bottom: 0;
            box-shadow: 5px 0 15px var(--shadow-color);
            border-right: 3px solid var(--border-color);
            max-width: 80%;
            height: calc(100% - 59px);
        }
    }
</style>
