<script lang="ts">
    import PDFDocument from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "./Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack } from "svelte"
    import Button from "$lib/components/Button.svelte"
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import MenuIcon from "./icons/MenuIcon.svelte"

    let pdf = $state.raw<PDFDocument | null>(null)
    let url = $state<string | null>(null)
    let files = $state<FileList | null>(null)
    let isLoaded = $state(false)
    let documentName = $state("")

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
        if (files && files.length > 0) {
            const file = files[0]
            documentName = file.name

            untrack(() => {
                if (url) {
                    URL.revokeObjectURL(url)
                }
                url = URL.createObjectURL(file)
            })
        }
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

    function resetViewer() {
        if (url) {
            URL.revokeObjectURL(url)
        }
        url = null
        pdf = null
        files = null
        isLoaded = false
        currentPage = 1
        currentPageImage = null
        totalPages = 0
        documentName = ""
        isOutlineOpen = false
        outlineList = null
        isOutlineLoading = false
    }
</script>

<div class="reader-card">
    {#if !url}
        <!-- Styled Drop/Select Zone -->
        <div class="upload-zone">
            <div class="dashed-border">
                <div class="upload-icon-wrapper" aria-hidden="true">
                    <PlusIcon width="48" height="48" />
                </div>
                <h3>{m.import_pdf()}</h3>
                <p>{m.upload_p_text()}</p>
                <label class="btn upload-btn">
                    {m.choose_pdf()}
                    <input type="file" accept=".pdf" bind:files style="display: none;" />
                </label>
            </div>
        </div>
    {:else}
        <!-- Active PDF Reader Workspace -->
        <div class="viewer-layout">
            <!-- Toolbar / Header Bar -->
            <div class="viewer-header">
                <div class="doc-info">
                    {#if isLoaded}
                        <button
                            class="burger-btn"
                            onclick={() => (isOutlineOpen = !isOutlineOpen)}
                            aria-label={m.outline()}
                            class:open={isOutlineOpen}
                        >
                            <MenuIcon />
                        </button>
                    {/if}
                    <span class="file-badge">PDF</span>
                    <span class="file-name" title={documentName}
                        >{documentName || "document.pdf"}</span
                    >
                </div>
                <div class="header-actions">
                    <Button onclick={resetViewer} aria-label={m.close_document()}>
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
                                <img
                                    src={currentPageImage}
                                    alt={m.page_render_alt({ page: currentPage })}
                                    class="pdf-image"
                                />
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
    {/if}
</div>

<style>
    .reader-card {
        grid-column: 1 / -1;
        background: var(--card-bg, #ffffff);
        border: 3px solid #1a1a1a;
        box-shadow: 8px 8px 0 #1a1a1a;
        margin-top: 20px;
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        overflow: hidden;
    }

    /* Neo-brutalist buttons */
    .btn {
        background: var(--button-bg, #ffffff);
        border: 2px solid #1a1a1a;
        font-family: inherit;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        color: #1a1a1a;
        padding: 8px 16px;
        cursor: pointer;
        box-shadow: 3px 3px 0 #1a1a1a;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        user-select: none;
    }

    .btn:hover:not(:disabled) {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 #1a1a1a;
        background: var(--button-hover-bg, #faf8f5);
    }

    .btn:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 #1a1a1a;
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 #1a1a1a;
        transform: translate(1px, 1px);
    }

    /* Upload Screen */
    .upload-zone {
        padding: 48px;
        text-align: center;
        background: #fdfaf2;
    }

    .dashed-border {
        border: 3px dashed #1a1a1a;
        padding: 40px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }

    .upload-icon-wrapper {
        background: #ffde4d;
        border: 2.5px solid #1a1a1a;
        padding: 16px;
        border-radius: 50%;
        display: inline-flex;
        box-shadow: 3px 3px 0 #1a1a1a;
        color: #1a1a1a;
        margin-bottom: 8px;
    }

    .dashed-border h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 900;
        letter-spacing: -0.5px;
        color: #1a1a1a;
    }

    .dashed-border p {
        margin: 0;
        font-size: 13px;
        color: #555;
        max-width: 320px;
        line-height: 1.5;
        font-weight: bold;
    }

    .upload-btn {
        margin-top: 8px;
        background: #ff7675;
        color: white;
        border-color: #1a1a1a;
    }

    .upload-btn:hover {
        background: #ff6b6b;
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
        background: #ffde4d;
        border-bottom: 3px solid #1a1a1a;
        padding: 12px 20px;
    }

    .doc-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .file-badge {
        background: #1a1a1a;
        color: #ffffff;
        font-size: 10px;
        font-weight: 900;
        padding: 3px 8px;
        border-radius: 2px;
        letter-spacing: 0.5px;
    }

    .file-name {
        font-size: 14px;
        font-weight: 800;
        color: #1a1a1a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
    }

    .header-actions :global(.action-btn) {
        background: #ffffff;
        font-size: 11px;
        padding: 4px 10px;
        border: 2px solid #1a1a1a;
        box-shadow: 2px 2px 0 #1a1a1a;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .header-actions :global(.action-btn:hover) {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #1a1a1a;
        background: var(--button-hover-bg, #faf8f5);
    }

    .header-actions :global(.action-btn:active) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 #1a1a1a;
    }

    .viewer-body {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: #faf8f5;
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
        background: #fcfcfc;
    }

    .canvas-frame {
        flex: 1;
        border: 2px solid #1a1a1a;
        background: #ffffff;
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
        background: rgba(250, 248, 245, 0.85);
        backdrop-filter: blur(1px);
        z-index: 10;
    }

    .pdf-image {
        max-width: 100%;
        height: auto;
        border: 2px solid #1a1a1a;
        box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
        display: block;
    }

    /* Footer / Pagination */
    .viewer-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ff7675;
        border-top: 3px solid #1a1a1a;
        padding: 14px 20px;
    }

    .viewer-footer :global(.action-btn) {
        background: #ffffff;
        min-width: 120px;
        border: 2px solid #1a1a1a;
        box-shadow: 3px 3px 0 #1a1a1a;
        padding: 8px 16px;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    }

    .viewer-footer :global(.action-btn:hover:not(:disabled)) {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 #1a1a1a;
        background: var(--button-hover-bg, #faf8f5);
    }

    .viewer-footer :global(.action-btn:active:not(:disabled)) {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 #1a1a1a;
    }

    .viewer-footer :global(.action-btn:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 #1a1a1a;
        transform: translate(1px, 1px);
    }

    .pagination-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 900;
        font-size: 14px;
        color: #ffffff;
        text-shadow: 1.5px 1.5px 0 #1a1a1a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .page-input {
        width: 55px;
        height: 32px;
        border: 2px solid #1a1a1a;
        box-shadow: 2px 2px 0 #1a1a1a;
        text-align: center;
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        background: #ffffff;
        color: #1a1a1a;
        outline: none;
    }

    .page-input:focus {
        border-color: #00cec9;
    }

    .page-input:disabled {
        background: #eee;
        cursor: not-allowed;
    }

    .burger-btn {
        background: #ffffff;
        border: 2px solid #1a1a1a;
        box-shadow: 2px 2px 0 #1a1a1a;
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        color: #1a1a1a;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        margin-right: 8px;
        flex-shrink: 0;
    }

    .burger-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #1a1a1a;
        background: #00cec9;
    }

    .burger-btn:active,
    .burger-btn.open {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 #1a1a1a;
        background: #ffde4d;
    }

    .outline-sidebar {
        width: 280px;
        min-width: 280px;
        background: #ffffff;
        border-right: 3px solid #1a1a1a;
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
        background: #ffde4d;
        border-bottom: 3px solid #1a1a1a;
        padding: 10px 16px;
        flex-shrink: 0;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: #1a1a1a;
        letter-spacing: 0.5px;
    }

    .close-sidebar-btn {
        background: #ffffff;
        border: 2px solid #1a1a1a;
        box-shadow: 2px 2px 0 #1a1a1a;
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #1a1a1a;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
    }

    .close-sidebar-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #1a1a1a;
        background: #ff7675;
        color: #ffffff;
    }

    .close-sidebar-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 #1a1a1a;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        background: #faf8f5;
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
        color: #777;
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
        border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
        padding: 10px 16px;
        padding-left: calc(16px + var(--depth) * 12px);
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        color: #1a1a1a;
        cursor: pointer;
        text-align: left;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .outline-item:hover:not(:disabled) {
        background: #00cec9;
        color: #1a1a1a;
        font-weight: 800;
    }

    .outline-item.active:not(:disabled) {
        background: #ffde4d;
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
        background: #1a1a1a;
        color: #ffffff;
        font-size: 9px;
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    @media (max-width: 800px) {
        .viewer-layout {
            height: 600px;
        }

        .outline-sidebar {
            position: absolute;
            left: 0;
            top: 59px;
            bottom: 0;
            box-shadow: 5px 0 15px rgba(0, 0, 0, 0.15);
            border-right: 3px solid #1a1a1a;
            max-width: 80%;
            height: calc(100% - 59px);
        }
    }
</style>
