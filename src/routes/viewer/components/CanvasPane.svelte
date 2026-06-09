<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import * as pdfjs from "pdfjs-dist"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import type PDFDocument from "$lib/pdf"
    import { CONSTANTS, settingsStore } from "$lib/stores/settingsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"
    import ScrollPage from "./ScrollPage.svelte"
    import { untrack } from "svelte"
    import { MEDIA_QUERIES } from "$lib/breakpoints"
    import { useCommands } from "$lib/stores/commandsStore.svelte"
    import { ViewerLinkService } from "./ViewerLinkService"

    const AUTO_SCROLL_TIMEOUT_MS = 800

    let {
        isPageLoading = false,
        currentPageImage = null,
        currentPageImage2 = null,
        currentPage = $bindable(),
        scrollPosition = $bindable(),
        layoutMode = "single",
        scale = settingsStore.scale,
        pdf,
    } = $props<{
        isPageLoading?: boolean
        currentPageImage?: string | null
        currentPageImage2?: string | null
        currentPage: number
        scrollPosition: number
        layoutMode?: "single" | "split" | "scroll"
        scale?: number
        pdf: PDFDocument | null
    }>()

    let containerWidth = $state(0)
    let isShortHeight = $state(false)
    let hasInitiallyFit = false
    let hasRestoredScroll = false

    $effect(() => {
        const heightQuery = window.matchMedia("(max-height: 500px)")
        isShortHeight = heightQuery.matches

        const heightHandler = (e: MediaQueryListEvent) => {
            isShortHeight = e.matches
        }
        heightQuery.addEventListener("change", heightHandler)

        return () => {
            heightQuery.removeEventListener("change", heightHandler)
        }
    })

    function fitToWidth() {
        if (!pdf || containerWidth <= 0) return
        const defaultWidth = pdf.defaultWidth || 612
        const horizontalPadding = containerWidth < 900 ? 32 : 80

        let targetScale: number
        const isSplitSideBySide =
            layoutMode === "split" && typeof window !== "undefined" && window.innerWidth > 1024
        if (isSplitSideBySide) {
            const gap = 32
            const borderShadowAllowance = 24
            const availableWidth = Math.max(
                containerWidth - horizontalPadding - borderShadowAllowance - gap,
                100,
            )
            const cappedAvailableWidth = Math.min(availableWidth, 3400)
            targetScale = cappedAvailableWidth / (defaultWidth * 2)
        } else {
            const availableWidth = Math.max(containerWidth - horizontalPadding - 12, 100)
            const cappedAvailableWidth = Math.min(availableWidth, 1700)
            targetScale = cappedAvailableWidth / defaultWidth
        }

        settingsStore.scale = Math.max(
            CONSTANTS.minScale,
            Math.min(CONSTANTS.maxScale, targetScale),
        )
    }

    $effect(() => {
        if (pdf && containerWidth > 0 && !hasInitiallyFit) {
            hasInitiallyFit = true
            if (!uiStore.isCompact) {
                const hasSavedScale = (() => {
                    try {
                        const saved = localStorage.getItem("settings")
                        if (saved) {
                            const parsed = JSON.parse(saved)
                            return typeof parsed.scale === "number"
                        }
                    } catch {}
                    return false
                })()

                if (!hasSavedScale) {
                    fitToWidth()
                }
            }
        }
    })

    useCommands([
        {
            keys: "=",
            description: m.keymap_zoom_to_fit ? m.keymap_zoom_to_fit() : "Zoom to fit",
            category: "settings",
            action: () => {
                fitToWidth()
            },
        },
    ])

    const effectiveScale = $derived.by(() => {
        if (uiStore.isCompact && containerWidth > 0 && pdf) {
            const defaultWidth = pdf.defaultWidth || 612
            if (isShortHeight) {
                return (containerWidth / defaultWidth) * (scale / 1.5)
            }
            return containerWidth / defaultWidth
        }
        return scale
    })

    function getPageHeight(dim: { width: number; height: number }) {
        if (uiStore.isCompact && containerWidth > 0) {
            if (isShortHeight) {
                return containerWidth * (dim.height / dim.width) * (scale / 1.5)
            }
            return containerWidth * (dim.height / dim.width)
        }
        return dim.height * scale
    }

    const wrapperStyle1 = $derived.by(() => {
        const dim = currentPageDim1 || (pdf ? { width: pdf.defaultWidth || 612, height: pdf.defaultHeight || 792 } : { width: 612, height: 792 })
        return `width: ${dim.width * effectiveScale}px; height: ${dim.height * effectiveScale}px; --aspect-ratio: ${dim.width} / ${dim.height};`
    })

    const wrapperStyle2 = $derived.by(() => {
        const dim = currentPageDim2 || (pdf ? { width: pdf.defaultWidth || 612, height: pdf.defaultHeight || 792 } : { width: 612, height: 792 })
        return `width: ${dim.width * effectiveScale}px; height: ${dim.height * effectiveScale}px; --aspect-ratio: ${dim.width} / ${dim.height};`
    })

    let container = $state<HTMLElement | null>(null)
    let isAutoScrolling = false
    let lastObservedPage = $state(-1)
    let autoScrollTimeout: ReturnType<typeof setTimeout> | undefined

    let pageDimensions = $state<{ width: number; height: number }[]>([])
    let scrollTop = $state(0)
    let containerHeight = $state(0)
    let isMobile = $state(false)
    let isStackedMode = $state(false)

    let currentPageDim1 = $state<{ width: number; height: number } | null>(null)
    let currentPageDim2 = $state<{ width: number; height: number } | null>(null)

    let textLayer1 = $state<HTMLElement | null>(null)
    let textLayer2 = $state<HTMLElement | null>(null)
    let annotationLayer1 = $state<HTMLDivElement | null>(null)
    let annotationLayer2 = $state<HTMLDivElement | null>(null)
    let textLayer1RenderCount = $state(0)
    let textLayer2RenderCount = $state(0)

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

    $effect(() => {
        const mediaQuery = window.matchMedia(MEDIA_QUERIES.LARGE_DESKTOP)
        isStackedMode = mediaQuery.matches

        const handler = (e: MediaQueryListEvent) => {
            isStackedMode = e.matches
        }
        mediaQuery.addEventListener("change", handler)
        return () => {
            mediaQuery.removeEventListener("change", handler)
        }
    })

    $effect(() => {
        if (!pdf || layoutMode === "scroll") return

        const p1 = currentPage
        const p2 = layoutMode === "split" ? currentPage + 1 : null

        untrack(() => {
            pdf!.getPageDimension(p1).then((dim: { width: number; height: number }) => {
                currentPageDim1 = dim
            })
            if (p2 && p2 <= pdf!.pagesCount) {
                pdf!.getPageDimension(p2).then((dim: { width: number; height: number }) => {
                    currentPageDim2 = dim
                })
            } else {
                currentPageDim2 = null
            }
        })
    })

    const PAGE_GAP = $derived(uiStore.isCompact && !isShortHeight ? 2 : isMobile ? 16 : 80)

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
            currentOffset += getPageHeight(dim) + PAGE_GAP
        }
        return offsets
    })

    const totalHeight = $derived(
        pageOffsets.length > 0
            ? pageOffsets[pageOffsets.length - 1] +
                  getPageHeight(pageDimensions[pageDimensions.length - 1]) +
                  PAGE_GAP
            : 0,
    )

    function handleScroll(e: Event) {
        if (!hasRestoredScroll) return

        const target = e.target as HTMLElement
        scrollTop = target.scrollTop
        containerHeight = target.clientHeight

        if (isAutoScrolling) return

        if (layoutMode === "scroll") {
            if (pageOffsets.length === 0) return
            if (lastObservedPage === -1) return

            const viewportMiddle = scrollTop + containerHeight / 2

            let foundPage = 1
            for (let i = 0; i < pageOffsets.length; i++) {
                const top = pageOffsets[i]
                const height = getPageHeight(pageDimensions[i]) + PAGE_GAP
                if (viewportMiddle >= top && viewportMiddle < top + height) {
                    foundPage = i + 1
                    break
                }
            }

            if (foundPage !== currentPage) {
                lastObservedPage = foundPage
                currentPage = foundPage
            }

            const pageTop = pageOffsets[foundPage - 1]
            const pageHeight = getPageHeight(pageDimensions[foundPage - 1])
            scrollPosition = (scrollTop - pageTop) / pageHeight
        } else {
            const scrollHeight = target.scrollHeight - containerHeight
            scrollPosition = scrollHeight > 0 ? scrollTop / scrollHeight : 0
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
            const bottom = pageOffsets[i] + getPageHeight(pageDimensions[i]) + PAGE_GAP
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
        const currentScale = effectiveScale
        const offsets = pageOffsets

        untrack(() => {
            if (!hasRestoredScroll) return
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

    $effect(() => {
        const _pdf = pdf
        const _layout = layoutMode
        // Track currentPage only for single/split layouts.
        // In scroll layout, the user scrolling changes currentPage, so resetting here would hijack the scroll.
        const _page = layoutMode !== "scroll" ? currentPage : null
        untrack(() => {
            hasRestoredScroll = false
        })
    })

    $effect(() => {
        if (!container || !pdf || isPageLoading) return
        if (layoutMode === "scroll" && pageOffsets.length === 0) return

        untrack(() => {
            if (hasRestoredScroll) return

            const targetScrollPosition = scrollPosition
            if (targetScrollPosition === 0) {
                lastObservedPage = currentPage
                container!.scrollTo({ top: 0, behavior: "auto" })
                hasRestoredScroll = true
                return
            }

            if (layoutMode === "scroll") {
                const pageIndex = Math.min(currentPage - 1, pageDimensions.length - 1)
                if (pageIndex >= 0 && pageDimensions[pageIndex]) {
                    const pageTop = pageOffsets[pageIndex]
                    const pageHeight = getPageHeight(pageDimensions[pageIndex])
                    container!.scrollTo({
                        top: pageTop + targetScrollPosition * pageHeight,
                        behavior: "auto",
                    })
                }
            } else {
                const scrollHeight = container!.scrollHeight - containerHeight
                container!.scrollTo({
                    top: targetScrollPosition * scrollHeight,
                    behavior: "auto",
                })
            }
            lastObservedPage = currentPage
            hasRestoredScroll = true
        })
    })

    async function renderPageLayers(
        targetPdf: PDFDocument,
        pageNo: number,
        textContainer: HTMLElement,
        annotationContainer: HTMLDivElement | null,
        targetScale: number,
        signal?: AbortSignal,
    ) {
        try {
            const { textContent, viewport } = await targetPdf.getTextAndViewport(
                pageNo,
                targetScale,
            )
            if (signal?.aborted) return

            textContainer.innerHTML = ""
            textContainer.style.setProperty("--scale-factor", targetScale.toString())

            const textLayer = new pdfjs.TextLayer({
                textContentSource: textContent,
                container: textContainer,
                viewport: viewport.clone({ dontFlip: true }),
            })
            await textLayer.render()
            if (signal?.aborted) {
                textContainer.innerHTML = ""
                return
            }

            if (textContainer === textLayer1) {
                textLayer1RenderCount += 1
            } else if (textContainer === textLayer2) {
                textLayer2RenderCount += 1
            }

            if (annotationContainer) {
                annotationContainer.innerHTML = ""
                const annotations = await targetPdf.getAnnotations(pageNo)
                if (signal?.aborted) return

                if (annotations.length === 0) return

                const pageProxy = await targetPdf.getPageProxy(pageNo)
                if (signal?.aborted) return

                const linkService = new ViewerLinkService(targetPdf, (targetPage) => {
                    currentPage = targetPage
                })
                linkService.page = pageNo

                annotationContainer.style.setProperty("--scale-factor", targetScale.toString())

                const annotationLayer = new pdfjs.AnnotationLayer({
                    div: annotationContainer,
                    accessibilityManager: null,
                    annotationCanvasMap: null,
                    annotationEditorUIManager: null,
                    page: pageProxy,
                    viewport: viewport.clone({ dontFlip: true }),
                    structTreeLayer: null,
                })

                await annotationLayer.render({
                    viewport: viewport.clone({ dontFlip: true }),
                    div: annotationContainer,
                    annotations,
                    page: pageProxy,
                    linkService,
                    renderForms: false,
                })

                if (signal?.aborted) {
                    annotationContainer.innerHTML = ""
                }
            }
        } catch (err) {
            if (signal?.aborted) return
            console.error(`[CanvasPane] Failed to render page layers for page ${pageNo}`, err)
        }
    }

    let textLayerController1: AbortController | null = null
    let textLayerController2: AbortController | null = null

    $effect(() => {
        if (!pdf || layoutMode === "scroll" || isPageLoading) return
        if (currentPageImage && textLayer1 && annotationLayer1) {
            textLayerController1?.abort()
            textLayerController1 = new AbortController()
            renderPageLayers(
                pdf,
                currentPage,
                textLayer1,
                annotationLayer1,
                effectiveScale,
                textLayerController1.signal,
            )
        }
        return () => {
            textLayerController1?.abort()
        }
    })

    $effect(() => {
        if (!pdf || layoutMode !== "split" || isPageLoading) return
        if (currentPageImage2 && textLayer2 && annotationLayer2) {
            textLayerController2?.abort()
            textLayerController2 = new AbortController()
            renderPageLayers(
                pdf,
                currentPage + 1,
                textLayer2,
                annotationLayer2,
                effectiveScale,
                textLayerController2.signal,
            )
        }
        return () => {
            textLayerController2?.abort()
        }
    })

    function highlightPage(pageNumber: number, textContainer: HTMLElement) {
        const matches = searchStore.matches.filter((m) => m.pageNumber === pageNumber)
        const ranges: Range[] = []

        if (matches.length > 0) {
            const spans = Array.from(textContainer.querySelectorAll("span"))
            let currentOffset = 0
            const spanRanges = spans.map((span) => {
                const text = span.textContent || ""
                const len = text.length
                const entry = {
                    span,
                    textNode: span.firstChild || span,
                    start: currentOffset,
                    end: currentOffset + len,
                }
                currentOffset += len
                return entry
            })

            matches.forEach((match) => {
                const startEntry = spanRanges.find(
                    (entry) => entry.start <= match.start && entry.end > match.start,
                )
                const endEntry = spanRanges.find(
                    (entry) => entry.start <= match.end && entry.end >= match.end,
                )

                if (startEntry && endEntry) {
                    try {
                        const range = new Range()
                        range.setStart(startEntry.textNode, match.start - startEntry.start)
                        range.setEnd(endEntry.textNode, match.end - endEntry.start)
                        ranges.push(range)
                    } catch (e) {
                        console.error("[CanvasPane] Failed to create highlight range:", e)
                        ranges.push(null as any) // Keep index aligned
                    }
                }
            })
        }

        searchStore.registerPageRanges(pageNumber, ranges)
    }

    function scrollToActiveRange(range: Range) {
        requestAnimationFrame(() => {
            const currentContainer = container
            if (!currentContainer) return

            let rangeRect = range.getBoundingClientRect()
            if (rangeRect.width === 0 || rangeRect.height === 0) {
                requestAnimationFrame(() => {
                    rangeRect = range.getBoundingClientRect()
                    if (rangeRect.width > 0 && rangeRect.height > 0) {
                        performScroll(currentContainer, rangeRect)
                    }
                })
            } else {
                performScroll(currentContainer, rangeRect)
            }
        })
    }

    function performScroll(container: HTMLElement, rangeRect: DOMRect) {
        const containerRect = container.getBoundingClientRect()
        const rangeTopInContainer = rangeRect.top - containerRect.top + container.scrollTop
        const rangeLeftInContainer = rangeRect.left - containerRect.left + container.scrollLeft

        const targetScrollTop =
            rangeTopInContainer - container.clientHeight / 2 + rangeRect.height / 2
        const targetScrollLeft =
            rangeLeftInContainer - container.clientWidth / 2 + rangeRect.width / 2

        const behavior = settingsStore.animations ? "smooth" : "auto"
        container.scrollTo({
            top: targetScrollTop,
            left: targetScrollLeft,
            behavior,
        })
    }

    $effect(() => {
        const count = textLayer1RenderCount
        const matches = searchStore.matches

        if (textLayer1 && pdf && !isPageLoading) {
            highlightPage(currentPage, textLayer1)
        }
        return () => {
            searchStore.unregisterPageRanges(currentPage)
        }
    })

    $effect(() => {
        const count = textLayer2RenderCount
        const matches = searchStore.matches

        if (textLayer2 && pdf && !isPageLoading && layoutMode === "split") {
            highlightPage(currentPage + 1, textLayer2)
        }
        return () => {
            searchStore.unregisterPageRanges(currentPage + 1)
        }
    })

    $effect(() => {
        if (!uiStore.isSearchModeActive) return
        const activeRange = searchStore.activeRange
        if (activeRange && container) {
            scrollToActiveRange(activeRange)
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
                    scale={uiStore.isCompact
                        ? (containerWidth / pageDimensions[i].width) *
                          (isShortHeight ? scale / 1.5 : 1)
                        : scale}
                    offsetY={pageOffsets[i]}
                    width={uiStore.isCompact
                        ? containerWidth * (isShortHeight ? scale / 1.5 : 1)
                        : pageDimensions[i].width * scale}
                    height={getPageHeight(pageDimensions[i])}
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
            {#if layoutMode === "split" && currentPageImage2 && !isStackedMode}
                <div class="book-spread">
                    <div class="pdf-image-wrapper split-left" style={wrapperStyle1}>
                        <img
                            src={currentPageImage}
                            alt={m.page_render_alt({ page: currentPage })}
                            class="pdf-image"
                        />
                        <div bind:this={textLayer1} class="textLayer"></div>
                        <div bind:this={annotationLayer1} class="annotationLayer"></div>
                    </div>
                    <div class="book-spine"></div>
                    <div class="pdf-image-wrapper split-right" style={wrapperStyle2}>
                        <img
                            src={currentPageImage2}
                            alt={m.page_render_alt({ page: currentPage + 1 })}
                            class="pdf-image"
                        />
                        <div bind:this={textLayer2} class="textLayer"></div>
                        <div bind:this={annotationLayer2} class="annotationLayer"></div>
                    </div>
                </div>
            {:else}
                <div class="pdf-image-wrapper" style={wrapperStyle1}>
                    <img
                        src={currentPageImage}
                        alt={m.page_render_alt({ page: currentPage })}
                        class="pdf-image"
                    />
                    <div bind:this={textLayer1} class="textLayer"></div>
                    <div bind:this={annotationLayer1} class="annotationLayer"></div>
                </div>
                {#if layoutMode === "split" && currentPageImage2}
                    <div class="pdf-image-wrapper" style={wrapperStyle2}>
                        <img
                            src={currentPageImage2}
                            alt={m.page_render_alt({ page: currentPage + 1 })}
                            class="pdf-image"
                        />
                        <div bind:this={textLayer2} class="textLayer"></div>
                        <div bind:this={annotationLayer2} class="annotationLayer"></div>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
{/snippet}

<div
    class="canvas-pane"
    class:scroll-mode={layoutMode === "scroll"}
    class:mobile-full-width={uiStore.isCompact && !isShortHeight}
    class:single-layout={layoutMode === "single"}
>
    <div
        class="canvas-frame"
        bind:this={container}
        bind:clientHeight={containerHeight}
        bind:clientWidth={containerWidth}
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
        background: var(--canvas-bg-color);
        width: 100%;
        flex: 1;
    }

    .canvas-frame {
        flex: 1;
        background: var(--surface-color);
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
        background: var(--surface-hover-color);
    }

    .canvas-pane.scroll-mode .canvas-frame::-webkit-scrollbar-thumb {
        background: var(--accent-color);
        border: 2px solid var(--surface-hover-color);
    }

    @media (hover: hover) {
        .canvas-pane.scroll-mode .canvas-frame::-webkit-scrollbar-thumb:hover {
            background: var(--accent-active-color);
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
        background: var(--overlay-color);
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

    @media (--large-desktop) {
        .pages-container.split-mode {
            flex-direction: column;
            align-items: center;
        }
    }

    @media (--desktop) {
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

    .canvas-pane.mobile-full-width {
        padding: 0;
    }

    .canvas-pane.mobile-full-width.scroll-mode {
        padding: 0;
    }

    .canvas-pane.mobile-full-width .canvas-frame {
        padding: 0;
        border-width: 0;
    }

    .canvas-pane.mobile-full-width.single-layout .canvas-frame {
        align-items: safe center;
    }

    .canvas-pane.mobile-full-width.scroll-mode .canvas-frame {
        padding: 0;
        border-width: 0;
    }

    .canvas-pane.mobile-full-width .pdf-image-wrapper {
        border-width: 0;
        box-shadow: none;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: var(--aspect-ratio) !important;
        border-bottom: 2px solid var(--border-color) !important;
    }

    .canvas-pane.mobile-full-width .pdf-image {
        width: 100% !important;
        height: auto !important;
    }

    .canvas-pane.mobile-full-width .pages-container {
        width: 100%;
        gap: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    /* Book Spread joined layout */
    .book-spread {
        display: flex;
        position: relative;
        align-items: flex-start;
        box-shadow: 12px 12px 0 var(--shadow-color);
        border: 3px solid var(--border-color);
        background: var(--surface-color);
    }

    .book-spread .pdf-image-wrapper {
        border: none;
        box-shadow: none;
    }

    .book-spread .split-left {
        border-right: 1px solid rgba(0, 0, 0, 0.12);
    }

    :global(html.dark) .book-spread .split-left {
        border-right-color: rgba(255, 255, 255, 0.12);
    }

    .book-spine {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 32px;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 5;
        background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.05) 30%,
            rgba(0, 0, 0, 0.12) 48%,
            rgba(0, 0, 0, 0.18) 50%,
            rgba(0, 0, 0, 0.12) 52%,
            rgba(0, 0, 0, 0.05) 70%,
            rgba(0, 0, 0, 0) 100%
        );
    }

    :global(html.dark) .book-spine {
        background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.15) 30%,
            rgba(0, 0, 0, 0.35) 48%,
            rgba(0, 0, 0, 0.5) 50%,
            rgba(0, 0, 0, 0.35) 52%,
            rgba(0, 0, 0, 0.15) 70%,
            rgba(0, 0, 0, 0) 100%
        );
    }
</style>
