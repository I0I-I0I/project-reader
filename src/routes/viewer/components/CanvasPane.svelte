<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import * as pdfjs from "pdfjs-dist"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import type PDFDocument from "$lib/pdf"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import ScrollPage from "./ScrollPage.svelte"
    import { untrack } from "svelte"
    import { MEDIA_QUERIES } from "$lib/breakpoints"

    const AUTO_SCROLL_TIMEOUT_MS = 800

    let {
        isPageLoading = false,
        currentPageImage = null,
        currentPageImage2 = null,
        currentPage = $bindable(),
        layoutMode = "single",
        scale = 1.5,
        pdf,
    } = $props<{
        isPageLoading?: boolean
        currentPageImage?: string | null
        currentPageImage2?: string | null
        currentPage: number
        layoutMode?: "single" | "split" | "scroll"
        scale?: number
        pdf: PDFDocument | null
    }>()

    const wrapperStyle = $derived.by(() => {
        if (!pdf || !pdf.defaultWidth || !pdf.defaultHeight) {
            return `width: ${612 * scale}px; height: ${792 * scale}px;`
        }
        return `width: ${pdf.defaultWidth * scale}px; height: ${pdf.defaultHeight * scale}px;`
    })

    let container = $state<HTMLElement | null>(null)
    let isAutoScrolling = false
    let lastObservedPage = $state(-1)
    let autoScrollTimeout: ReturnType<typeof setTimeout> | undefined

    let pageDimensions = $state<{ width: number; height: number }[]>([])
    let scrollTop = $state(0)
    let containerHeight = $state(0)
    let isMobile = $state(false)

    let textLayer1 = $state<HTMLElement | null>(null)
    let textLayer2 = $state<HTMLElement | null>(null)

    $effect(() => {
        const mediaQuery = window.matchMedia(MEDIA_QUERIES.DESKTOP)
        isMobile = mediaQuery.matches

        const handler = (e: MediaQueryListEvent) => {
            isMobile = e.matches
        }
        mediaQuery.addEventListener("change", handler)
        return () => {
            mediaQuery.removeEventListener("change", handler)
        }
    })

    const PAGE_GAP = $derived(isMobile ? 16 : 80)

    $effect(() => {
        if (pdf && layoutMode === "scroll") {
            let active = true
            const loadDimensions = async () => {
                const dims = await pdf.getAllPageDimensions()
                if (active) {
                    pageDimensions = dims
                }
            }
            loadDimensions()
            return () => {
                active = false
                pageDimensions = []
                lastObservedPage = -1
            }
        } else {
            pageDimensions = []
            lastObservedPage = -1
        }
    })

    const pageOffsets = $derived.by(() => {
        if (pageDimensions.length === 0) return []
        const offsets: number[] = []
        let currentOffset = 0
        for (const dim of pageDimensions) {
            offsets.push(currentOffset)
            currentOffset += dim.height * scale + PAGE_GAP
        }
        return offsets
    })

    const totalHeight = $derived(
        pageOffsets.length > 0
            ? pageOffsets[pageOffsets.length - 1] +
                  pageDimensions[pageDimensions.length - 1].height * scale +
                  PAGE_GAP
            : 0,
    )

    function handleScroll(e: Event) {
        if (pageOffsets.length === 0 || layoutMode !== "scroll") return
        if (lastObservedPage === -1) return

        const target = e.target as HTMLElement
        scrollTop = target.scrollTop
        containerHeight = target.clientHeight

        if (isAutoScrolling) return

        const viewportMiddle = scrollTop + containerHeight / 2

        let foundPage = 1
        for (let i = 0; i < pageOffsets.length; i++) {
            const top = pageOffsets[i]
            const height = pageDimensions[i].height * scale + PAGE_GAP
            if (viewportMiddle >= top && viewportMiddle < top + height) {
                foundPage = i + 1
                break
            }
        }

        if (foundPage !== currentPage) {
            lastObservedPage = foundPage
            currentPage = foundPage
        }
    }

    const visibleRange = $derived.by(() => {
        if (pageOffsets.length === 0 || containerHeight === 0) return []

        const viewportTop = scrollTop
        const viewportBottom = scrollTop + containerHeight

        const buffer = containerHeight
        const renderTop = viewportTop - buffer
        const renderBottom = viewportBottom + buffer

        let startIdx = 0
        let endIdx = pageDimensions.length - 1

        for (let i = 0; i < pageOffsets.length; i++) {
            const bottom = pageOffsets[i] + pageDimensions[i].height * scale + PAGE_GAP
            if (bottom > renderTop) {
                startIdx = i
                break
            }
        }

        for (let i = startIdx; i < pageOffsets.length; i++) {
            const top = pageOffsets[i]
            if (top > renderBottom) {
                endIdx = i - 1
                break
            }
        }

        const range: number[] = []
        for (let i = Math.max(0, startIdx); i <= Math.min(pageDimensions.length - 1, endIdx); i++) {
            range.push(i)
        }
        return range
    })

    let lastScale = $state(-1)
    $effect(() => {
        if (layoutMode !== "scroll") return
        const targetPage = currentPage
        const currentScale = scale
        const offsets = pageOffsets

        untrack(() => {
            if (lastScale === -1) {
                lastScale = currentScale
            }
            const scaleChanged = currentScale !== lastScale
            if (!container || offsets.length === 0) return
            if (targetPage === lastObservedPage && !scaleChanged) return

            const targetOffset = offsets[targetPage - 1]
            const behavior =
                settingsStore.animations && lastObservedPage !== -1 && !scaleChanged
                    ? "smooth"
                    : "auto"

            isAutoScrolling = true
            container.scrollTo({
                top: targetOffset,
                behavior,
            })
            lastObservedPage = targetPage
            lastScale = currentScale

            if (autoScrollTimeout) clearTimeout(autoScrollTimeout)

            if (behavior === "smooth") {
                autoScrollTimeout = setTimeout(() => {
                    isAutoScrolling = false
                }, AUTO_SCROLL_TIMEOUT_MS)
            } else {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        isAutoScrolling = false
                    })
                })
            }
        })
    })

    async function renderTextLayer(
        targetPdf: PDFDocument,
        pageNo: number,
        targetContainer: HTMLElement,
        targetScale: number,
        signal?: AbortSignal,
    ) {
        try {
            const { textContent, viewport } = await targetPdf.getTextAndViewport(
                pageNo,
                targetScale,
            )
            if (signal?.aborted) return

            targetContainer.innerHTML = ""
            targetContainer.style.setProperty("--scale-factor", targetScale.toString())

            const textLayer = new pdfjs.TextLayer({
                textContentSource: textContent,
                container: targetContainer,
                viewport: viewport.clone({ dontFlip: true }),
            })
            await textLayer.render()
            if (signal?.aborted) {
                targetContainer.innerHTML = ""
            }
        } catch (err) {
            if (signal?.aborted) return
            console.error(`[CanvasPane] Failed to render text layer for page ${pageNo}`, err)
        }
    }

    let textLayerController1: AbortController | null = null
    let textLayerController2: AbortController | null = null

    $effect(() => {
        if (!pdf || layoutMode === "scroll" || isPageLoading) return
        if (currentPageImage && textLayer1) {
            textLayerController1?.abort()
            textLayerController1 = new AbortController()
            renderTextLayer(pdf, currentPage, textLayer1, scale, textLayerController1.signal)
        }
        return () => {
            textLayerController1?.abort()
        }
    })

    $effect(() => {
        if (!pdf || layoutMode !== "split" || isPageLoading) return
        if (currentPageImage2 && textLayer2) {
            textLayerController2?.abort()
            textLayerController2 = new AbortController()
            renderTextLayer(pdf, currentPage + 1, textLayer2, scale, textLayerController2.signal)
        }
        return () => {
            textLayerController2?.abort()
        }
    })
</script>

{#snippet scrollView()}
    {#if pdf && pageOffsets.length > 0}
        <div class="virtual-container" style="height: {totalHeight}px;">
            {#each visibleRange as i (i)}
                <ScrollPage
                    {pdf}
                    pageNumber={i + 1}
                    {scale}
                    offsetY={pageOffsets[i]}
                    width={pageDimensions[i].width * scale}
                    height={pageDimensions[i].height * scale}
                />
            {/each}
        </div>
    {/if}
{/snippet}

{#snippet singleSplitView()}
    {#if isPageLoading}
        <div class="pane-loader">
            <Spinner variant="dots" size="lg" label={m.rendering_page()} />
        </div>
    {:else if currentPageImage}
        <div class="pages-container" class:split-mode={layoutMode === "split"}>
            <div class="pdf-image-wrapper" style={wrapperStyle}>
                <img
                    src={currentPageImage}
                    alt={m.page_render_alt({ page: currentPage })}
                    class="pdf-image"
                />
                <div bind:this={textLayer1} class="textLayer"></div>
            </div>
            {#if layoutMode === "split" && currentPageImage2}
                <div class="pdf-image-wrapper" style={wrapperStyle}>
                    <img
                        src={currentPageImage2}
                        alt={m.page_render_alt({ page: currentPage + 1 })}
                        class="pdf-image"
                    />
                    <div bind:this={textLayer2} class="textLayer"></div>
                </div>
            {/if}
        </div>
    {/if}
{/snippet}

<div class="canvas-pane" class:scroll-mode={layoutMode === "scroll"}>
    <div
        class="canvas-frame"
        bind:this={container}
        bind:clientHeight={containerHeight}
        onscroll={handleScroll}
        onscrollend={() => {
            if (isAutoScrolling) {
                isAutoScrolling = false
                if (autoScrollTimeout) clearTimeout(autoScrollTimeout)
            }
        }}
    >
        {#if layoutMode === "scroll"}
            {@render scrollView()}
        {:else}
            {@render singleSplitView()}
        {/if}
    </div>
</div>

<style>
    .canvas-pane {
        display: flex;
        flex-direction: column;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        background: var(--canvas-pane-bg);
        width: 100%;
        flex: 1;
    }

    .canvas-frame {
        flex: 1;
        background: var(--canvas-frame-bg);
        background-image: radial-gradient(var(--border-color) 1px, transparent 0);
        background-size: 24px 24px;
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
        overflow: auto;
        display: flex;
        justify-content: safe center;
        align-items: flex-start;
        position: relative;
        padding: 40px;
    }

    /* Scroll Mode overrides */
    .canvas-pane.scroll-mode .canvas-frame {
        display: block;
        padding: 0;
    }

    .canvas-pane.scroll-mode .canvas-frame::-webkit-scrollbar {
        width: 10px;
    }

    .canvas-pane.scroll-mode .canvas-frame::-webkit-scrollbar-track {
        background: var(--viewer-body-bg);
    }

    .canvas-pane.scroll-mode .canvas-frame::-webkit-scrollbar-thumb {
        background: var(--viewer-accent);
        border: 2px solid var(--viewer-body-bg);
    }

    @media (hover: hover) {
        .canvas-pane.scroll-mode .canvas-frame::-webkit-scrollbar-thumb:hover {
            background: var(--viewer-accent-active);
        }
    }

    .virtual-container {
        position: relative;
        width: 100%;
    }

    .pages-container {
        display: flex;
        gap: 24px;
        align-items: flex-start;
        justify-content: safe center;
    }

    .pages-container.split-mode {
        gap: 32px;
    }

    .pane-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        inset: 0;
        background: var(--pane-loader-bg);
        backdrop-filter: blur(2px);
        z-index: 10;
    }

    .pdf-image-wrapper {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        display: inline-flex;
        position: relative;
        transition:
            width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: top center;
    }

    .pdf-image {
        display: block;
        width: 100%;
        height: 100%;
    }

    :global(html.dark) .pdf-image {
        filter: invert(1) hue-rotate(180deg);
    }

    /* Text Layer Styles */
    :global(.textLayer) {
        position: absolute;
        text-align: initial;
        inset: 0;
        overflow: hidden;
        opacity: 1;
        line-height: 1;
        text-wrap: nowrap;
        pointer-events: auto;
    }

    :global(.textLayer span),
    :global(.textLayer br) {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
    }

    :global(.textLayer ::selection) {
        background: color-mix(in srgb, var(--viewer-accent) 35%, transparent);
        color: transparent;
    }

    @media (max-width: 1024px) {
        .pages-container.split-mode {
            flex-direction: column;
            align-items: center;
        }
    }

    @media (max-width: 900px) {
        .canvas-frame {
            padding: 16px;
        }

        .canvas-pane.scroll-mode .canvas-frame {
            padding: 0;
        }

        .pages-container,
        .pages-container.split-mode {
            gap: 16px;
        }
    }

    @media (max-width: 600px) {
        .canvas-pane {
            padding: 6px;
        }

        .canvas-pane.scroll-mode {
            padding: 0;
        }

        .canvas-frame {
            padding: 16px;
            border-width: 1.5px;
        }

        .canvas-pane.scroll-mode .canvas-frame {
            padding: 0;
            border-width: 0;
        }

        .pdf-image-wrapper {
            border-width: 1.5px;
            box-shadow: 2px 2px 0 var(--shadow-color);
        }

        .pages-container {
            gap: 16px;
        }
    }
</style>
