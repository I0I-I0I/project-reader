<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import * as pdfjs from "pdfjs-dist"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import type PDFDocument from "$lib/pdf"
    import { CONSTANTS, settingsStore } from "$lib/stores/settingsStore.svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"
    import {
        notesStore,
        getGlobalOffset,
        getOffsetFromPoint,
        getTextNodeAndOffset,
        buildSpanRanges,
        findSpanByOffset,
        type SpanRange,
    } from "$lib/stores/notesStore.svelte"
    import { browser } from "$app/environment"
    import { uiStore } from "$lib/stores/uiStore.svelte"
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
        container = $bindable(null),
        layoutMode = "single",
        scale = settingsStore.scale,
        pdf,
        currentPageDim1: propPageDim1 = null,
        currentPageDim2: propPageDim2 = null,
    } = $props<{
        isPageLoading?: boolean
        currentPageImage?: string | null
        currentPageImage2?: string | null
        currentPage: number
        scrollPosition: number
        container?: HTMLElement | null
        layoutMode?: "single" | "split" | "scroll"
        scale?: number
        pdf: PDFDocument | null
        currentPageDim1?: { width: number; height: number } | null
        currentPageDim2?: { width: number; height: number } | null
    }>()

    let containerWidth = $state(0)
    let isShortHeight = $derived(uiStore.isShortHeight)
    let hasInitiallyFit = false
    let hasRestoredScroll = false

    function fitToWidth() {
        if (!pdf || containerWidth <= 0) return
        const defaultWidth = pdf.defaultWidth || 612
        const horizontalPadding = containerWidth < 900 ? 32 : 80

        let targetScale: number
        const isSplitSideBySide = layoutMode === "split"
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

    const pageScale1 = $derived.by(() => {
        if (uiStore.isCompact && containerWidth > 0 && pdf) {
            const pageWidth = currentPageDim1?.width || pdf.defaultWidth || 612
            if (isShortHeight) {
                return (containerWidth / pageWidth) * (scale / 1.5)
            }
            return containerWidth / pageWidth
        }
        return scale
    })

    const pageScale2 = $derived.by(() => {
        if (uiStore.isCompact && containerWidth > 0 && pdf) {
            const pageWidth = currentPageDim2?.width || pdf.defaultWidth || 612
            if (isShortHeight) {
                return (containerWidth / pageWidth) * (scale / 1.5)
            }
            return containerWidth / pageWidth
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
        const dim =
            currentPageDim1 ||
            (pdf
                ? { width: pdf.defaultWidth || 612, height: pdf.defaultHeight || 792 }
                : { width: 612, height: 792 })
        return `width: ${dim.width * pageScale1}px; height: ${dim.height * pageScale1}px; --aspect-ratio: ${dim.width} / ${dim.height};`
    })

    const wrapperStyle2 = $derived.by(() => {
        const dim =
            currentPageDim2 ||
            (pdf
                ? { width: pdf.defaultWidth || 612, height: pdf.defaultHeight || 792 }
                : { width: 612, height: 792 })
        return `width: ${dim.width * pageScale2}px; height: ${dim.height * pageScale2}px; --aspect-ratio: ${dim.width} / ${dim.height};`
    })

    let isAutoScrolling = false
    let lastObservedPage = $state(-1)
    let autoScrollTimeout: ReturnType<typeof setTimeout> | undefined

    let pageDimensions = $state.raw<{ width: number; height: number }[]>([])
    let scrollTop = $state(0)
    let containerHeight = $state(0)
    let isMobile = $state(false)

    let fallbackPageDim1 = $state<{ width: number; height: number } | null>(null)
    let fallbackPageDim2 = $state<{ width: number; height: number } | null>(null)

    let currentPageDim1 = $derived(propPageDim1 || fallbackPageDim1)
    let currentPageDim2 = $derived(propPageDim2 || fallbackPageDim2)

    let textLayer1 = $state<HTMLElement | null>(null)
    let textLayer2 = $state<HTMLElement | null>(null)
    let annotationLayer1 = $state<HTMLDivElement | null>(null)
    let annotationLayer2 = $state<HTMLDivElement | null>(null)
    let textLayer1RenderCount = $state(0)
    let textLayer2RenderCount = $state(0)
    let cachedSpanRanges1: SpanRange[] | null = null
    let cachedSpanRanges2: SpanRange[] | null = null

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
        if (!pdf || layoutMode === "scroll") return

        const p1 = currentPage
        const p2 = layoutMode === "split" ? currentPage + 1 : null

        untrack(() => {
            pdf!
                .getPageDimension(p1)
                .then((dim: { width: number; height: number }) => {
                    fallbackPageDim1 = dim
                })
                .catch((err: any) => {
                    console.warn("[CanvasPane] Failed to get page dimension for page 1:", err)
                })
            if (p2 && p2 <= pdf!.pagesCount) {
                pdf!
                    .getPageDimension(p2)
                    .then((dim: { width: number; height: number }) => {
                        fallbackPageDim2 = dim
                    })
                    .catch((err: any) => {
                        console.warn("[CanvasPane] Failed to get page dimension for page 2:", err)
                    })
            } else {
                fallbackPageDim2 = null
            }
        })
    })

    const PAGE_GAP = $derived(uiStore.isCompact && !isShortHeight ? 2 : isMobile ? 16 : 80)

    $effect(() => {
        if (pdf && layoutMode === "scroll") {
            let active = true
            const loadDimensions = async () => {
                try {
                    const dims = await pdf.getAllPageDimensions()
                    if (active) {
                        pageDimensions = dims
                    }
                } catch (err) {
                    console.warn("[CanvasPane] Failed to load all page dimensions:", err)
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

    let lastUpdatedScrollTop = 0
    let scrollEndTimeout: ReturnType<typeof setTimeout> | undefined
    let rafId: number | null = null

    $effect(() => {
        return () => {
            if (scrollEndTimeout) clearTimeout(scrollEndTimeout)
            if (rafId !== null) cancelAnimationFrame(rafId)
        }
    })

    function findPageAtOffset(offset: number): number {
        if (pageOffsets.length === 0) return 1
        let low = 0
        let high = pageOffsets.length - 1
        while (low <= high) {
            const mid = (low + high) >> 1
            const top = pageOffsets[mid]
            const height = getPageHeight(pageDimensions[mid]) + PAGE_GAP
            if (offset >= top && offset < top + height) {
                return mid + 1
            } else if (offset < top) {
                high = mid - 1
            } else {
                low = mid + 1
            }
        }
        if (offset < pageOffsets[0]) return 1
        return pageOffsets.length
    }

    function syncScrollState(
        currentScrollTop: number,
        currentContainerHeight: number,
        scrollHeight: number,
    ) {
        scrollTop = currentScrollTop
        containerHeight = currentContainerHeight
        lastUpdatedScrollTop = currentScrollTop

        if (layoutMode === "scroll") {
            if (pageOffsets.length === 0) return
            const viewportMiddle = currentScrollTop + currentContainerHeight / 2

            const foundPage = findPageAtOffset(viewportMiddle)

            if (foundPage !== currentPage) {
                lastObservedPage = foundPage
                currentPage = foundPage
            }
            const pageTop = pageOffsets[foundPage - 1]
            const pageHeight = getPageHeight(pageDimensions[foundPage - 1])
            scrollPosition = (currentScrollTop - pageTop) / pageHeight
        } else {
            const pageEl = container?.querySelector(
                ".pdf-image-wrapper, .book-spread",
            ) as HTMLElement | null
            if (pageEl) {
                const pageHeight = pageEl.offsetHeight
                const pageTop = pageEl.offsetTop
                scrollPosition =
                    pageHeight > 0 ? Math.max(0, (currentScrollTop - pageTop) / pageHeight) : 0
            } else {
                scrollPosition = 0
            }
        }
    }

    function syncScrollStateFallback() {
        if (typeof window !== "undefined" && !("onscrollend" in window)) {
            if (container && hasRestoredScroll) {
                syncScrollState(container.scrollTop, container.clientHeight, container.scrollHeight)
            }
        }
    }

    function handleScroll(e: Event) {
        if (!hasRestoredScroll) return

        const target = e.target as HTMLElement

        if (isAutoScrolling) return

        // Throttle updates using requestAnimationFrame for smoother performance
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                rafId = null

                let shouldUpdate = false
                const currentScrollTop = target.scrollTop
                const currentContainerHeight = target.clientHeight

                if (layoutMode === "scroll") {
                    if (pageOffsets.length === 0) return
                    if (lastObservedPage === -1) return

                    const viewportMiddle = currentScrollTop + currentContainerHeight / 2
                    const foundPage = findPageAtOffset(viewportMiddle)

                    if (
                        foundPage !== currentPage ||
                        Math.abs(currentScrollTop - lastUpdatedScrollTop) > 30
                    ) {
                        shouldUpdate = true
                    }
                } else {
                    if (Math.abs(currentScrollTop - lastUpdatedScrollTop) > 30) {
                        shouldUpdate = true
                    }
                }

                if (shouldUpdate) {
                    syncScrollState(currentScrollTop, currentContainerHeight, target.scrollHeight)
                }
            })
        }

        if (typeof window !== "undefined" && !("onscrollend" in window)) {
            if (scrollEndTimeout) clearTimeout(scrollEndTimeout)
            scrollEndTimeout = setTimeout(() => {
                if (container && hasRestoredScroll) {
                    syncScrollState(
                        container.scrollTop,
                        container.clientHeight,
                        container.scrollHeight,
                    )
                }
            }, 150)
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

        // Use binary search to find startIdx
        let low = 0
        let high = pageOffsets.length - 1
        while (low <= high) {
            const mid = (low + high) >> 1
            const top = pageOffsets[mid]
            const height = getPageHeight(pageDimensions[mid])
            if (top + height + PAGE_GAP > renderTop) {
                startIdx = mid
                high = mid - 1
            } else {
                low = mid + 1
            }
        }

        // Use binary search to find endIdx
        low = startIdx
        high = pageOffsets.length - 1
        while (low <= high) {
            const mid = (low + high) >> 1
            if (pageOffsets[mid] < renderBottom) {
                endIdx = mid
                low = mid + 1
            } else {
                high = mid - 1
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
            scrollTop = targetOffset
            lastObservedPage = targetPage
            lastScale = currentScale

            if (autoScrollTimeout) clearTimeout(autoScrollTimeout)

            if (behavior === "smooth") {
                autoScrollTimeout = setTimeout(() => {
                    isAutoScrolling = false
                    syncScrollStateFallback()
                }, AUTO_SCROLL_TIMEOUT_MS)
            } else {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        isAutoScrolling = false
                        syncScrollStateFallback()
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

        // Register currentPage as a dependency ONLY when NOT in scroll layout
        const _page = layoutMode !== "scroll" ? currentPage : null

        untrack(() => {
            if (hasRestoredScroll) return

            const targetScrollPosition = scrollPosition
            if (targetScrollPosition === 0 && layoutMode !== "scroll") {
                lastObservedPage = currentPage
                container!.scrollTo({ top: 0, left: 0, behavior: "auto" })
                lastUpdatedScrollTop = 0
                hasRestoredScroll = true
                return
            }

            if (layoutMode === "scroll") {
                const pageIndex = Math.min(currentPage - 1, pageDimensions.length - 1)
                if (pageIndex >= 0 && pageDimensions[pageIndex]) {
                    const pageTop = pageOffsets[pageIndex]
                    const pageHeight = getPageHeight(pageDimensions[pageIndex])
                    const targetScrollTop = pageTop + targetScrollPosition * pageHeight
                    container!.scrollTo({
                        top: targetScrollTop,
                        left: 0,
                        behavior: "auto",
                    })
                    scrollTop = targetScrollTop
                    lastUpdatedScrollTop = targetScrollTop
                }
            } else {
                const pageEl = container!.querySelector(
                    ".pdf-image-wrapper, .book-spread",
                ) as HTMLElement | null
                if (pageEl) {
                    const pageHeight = pageEl.offsetHeight
                    const pageTop = pageEl.offsetTop
                    const targetScrollTop = pageTop + targetScrollPosition * pageHeight
                    container!.scrollTo({
                        top: targetScrollTop,
                        left: 0,
                        behavior: "auto",
                    })
                    lastUpdatedScrollTop = targetScrollTop
                } else {
                    container!.scrollTo({
                        top: 0,
                        left: 0,
                        behavior: "auto",
                    })
                    lastUpdatedScrollTop = 0
                }
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
            const { pageProxy, textContent, annotations, viewport } =
                await targetPdf.getPageDataForRendering(pageNo, targetScale)
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
                cachedSpanRanges1 = buildSpanRanges(textContainer)
                textLayer1RenderCount += 1
            } else if (textContainer === textLayer2) {
                cachedSpanRanges2 = buildSpanRanges(textContainer)
                textLayer2RenderCount += 1
            }

            if (annotationContainer) {
                annotationContainer.innerHTML = ""
                if (annotations.length === 0) return

                const linkService = new ViewerLinkService(targetPdf, (targetPage) => {
                    if (viewerStore.goToPage) {
                        viewerStore.goToPage(targetPage, { isJump: true })
                    } else {
                        currentPage = targetPage
                    }
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
        const tLayer1 = textLayer1
        const aLayer1 = annotationLayer1
        // Synchronously read reactive variables so Svelte registers them as dependencies:
        const scale = pageScale1
        const page = currentPage
        if (currentPageImage && tLayer1 && aLayer1) {
            textLayerController1?.abort()
            const controller = new AbortController()
            textLayerController1 = controller
            const delayTimeout = setTimeout(() => {
                renderPageLayers(pdf, page, tLayer1, aLayer1, scale, controller.signal)
            }, 150)
            return () => {
                clearTimeout(delayTimeout)
                controller.abort()
            }
        }
    })

    $effect(() => {
        if (!pdf || layoutMode !== "split" || isPageLoading) return
        const tLayer2 = textLayer2
        const aLayer2 = annotationLayer2
        // Synchronously read reactive variables so Svelte registers them as dependencies:
        const scale = pageScale2
        const page = currentPage + 1
        if (currentPageImage2 && tLayer2 && aLayer2) {
            textLayerController2?.abort()
            const controller = new AbortController()
            textLayerController2 = controller
            const delayTimeout = setTimeout(() => {
                renderPageLayers(pdf, page, tLayer2, aLayer2, scale, controller.signal)
            }, 150)
            return () => {
                clearTimeout(delayTimeout)
                controller.abort()
            }
        }
    })

    function highlightPage(pageNumber: number, textContainer: HTMLElement, cacheKey: 1 | 2) {
        const matches = searchStore.matches.filter((m) => m.pageNumber === pageNumber)
        const ranges: Range[] = []

        if (matches.length > 0) {
            const spanRanges = cacheKey === 1 ? cachedSpanRanges1 : cachedSpanRanges2

            if (spanRanges) {
                matches.forEach((match) => {
                    const startEntry = findSpanByOffset(spanRanges, match.start)
                    const endEntry = findSpanByOffset(spanRanges, match.end)

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
        if (layoutMode === "scroll") return

        const count = textLayer1RenderCount
        const matches = searchStore.matches
        const pageNo = currentPage

        untrack(() => {
            if (textLayer1 && pdf && !isPageLoading) {
                highlightPage(pageNo, textLayer1, 1)
            }
        })
        return () => {
            untrack(() => {
                searchStore.unregisterPageRanges(pageNo)
            })
        }
    })

    $effect(() => {
        if (layoutMode !== "split") return

        const count = textLayer2RenderCount
        const matches = searchStore.matches
        const pageNo = currentPage + 1

        untrack(() => {
            if (textLayer2 && pdf && !isPageLoading) {
                highlightPage(pageNo, textLayer2, 2)
            }
        })
        return () => {
            untrack(() => {
                searchStore.unregisterPageRanges(pageNo)
            })
        }
    })

    function highlightNotes(pageNo: number, textContainer: HTMLElement, cacheKey: 1 | 2) {
        const pageNotes = notesStore.notes.filter((n) => n.pageNumber === pageNo)
        const noteRanges: { noteId: string; range: Range; color: string }[] = []

        if (pageNotes.length > 0) {
            const spanRanges = cacheKey === 1 ? cachedSpanRanges1 : cachedSpanRanges2

            if (spanRanges) {
                pageNotes.forEach((note) => {
                    const startEntry = findSpanByOffset(spanRanges, note.start)
                    const endEntry = findSpanByOffset(spanRanges, note.end)

                    if (startEntry && endEntry) {
                        try {
                            const range = new Range()
                            const startRes = getTextNodeAndOffset(
                                startEntry.span,
                                note.start - startEntry.start,
                            )
                            const endRes = getTextNodeAndOffset(
                                endEntry.span,
                                note.end - endEntry.start,
                            )
                            range.setStart(startRes.node, startRes.offset)
                            range.setEnd(endRes.node, endRes.offset)
                            noteRanges.push({
                                noteId: note.id,
                                range,
                                color: note.color,
                            })

                            // Handle scroll to note
                            if (notesStore.scrollingToNoteId === note.id) {
                                scrollToActiveRange(range)
                                notesStore.scrollingToNoteId = null
                            }
                        } catch (e) {
                            console.error("[CanvasPane] Failed to create note range:", e)
                        }
                    }
                })
            }
        }

        notesStore.registerPageRanges(pageNo, noteRanges)
    }

    $effect(() => {
        if (layoutMode === "scroll") return

        const count = textLayer1RenderCount
        const notes = notesStore.notes // reactive dependency
        const pageNo = currentPage

        untrack(() => {
            if (textLayer1 && pdf && !isPageLoading) {
                highlightNotes(pageNo, textLayer1, 1)
            }
        })
        return () => {
            untrack(() => {
                notesStore.unregisterPageRanges(pageNo)
            })
        }
    })

    $effect(() => {
        if (layoutMode !== "split") return

        const count = textLayer2RenderCount
        const notes = notesStore.notes // reactive dependency
        const pageNo = currentPage + 1

        untrack(() => {
            if (textLayer2 && pdf && !isPageLoading) {
                highlightNotes(pageNo, textLayer2, 2)
            }
        })
        return () => {
            untrack(() => {
                notesStore.unregisterPageRanges(pageNo)
            })
        }
    })

    // Text Selection & Highlight Click Listeners for single/split layouts
    $effect(() => {
        if (!browser || !pdf || layoutMode === "scroll") return

        const handleSelectionChange = () => {
            const selection = document.getSelection()
            if (!selection || selection.isCollapsed) {
                const currentBook = viewerStore.getCurrentBook()
                if (currentBook && notesStore.activeSelection?.bookId === currentBook.id) {
                    const pg = notesStore.activeSelection.pageNumber
                    if (pg === currentPage || pg === currentPage + 1) {
                        notesStore.activeSelection = null
                    }
                }
                return
            }

            const range = selection.getRangeAt(0)
            const currentBook = viewerStore.getCurrentBook()
            if (!currentBook) return

            let selectedPage: number | null = null
            let spans: any[] | null = null

            if (
                textLayer1 &&
                textLayer1.contains(range.startContainer) &&
                textLayer1.contains(range.endContainer)
            ) {
                selectedPage = currentPage
                spans = cachedSpanRanges1
            } else if (
                textLayer2 &&
                textLayer2.contains(range.startContainer) &&
                textLayer2.contains(range.endContainer)
            ) {
                selectedPage = currentPage + 1
                spans = cachedSpanRanges2
            }

            if (selectedPage !== null && spans) {
                const startOffset = getGlobalOffset(range.startContainer, range.startOffset, spans)
                const endOffset = getGlobalOffset(range.endContainer, range.endOffset, spans)
                if (startOffset !== null && endOffset !== null) {
                    const start = Math.min(startOffset, endOffset)
                    const end = Math.max(startOffset, endOffset)
                    const text = selection.toString()
                    const rect = range.getBoundingClientRect()
                    notesStore.activeSelection = {
                        bookId: currentBook.id,
                        pageNumber: selectedPage,
                        start,
                        end,
                        text,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        bottomY: rect.bottom,
                    }
                }
            }
        }

        const handleTextLayerClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const textLayer = target.closest(".textLayer") as HTMLElement
            if (!textLayer) return

            const pageAttr = textLayer.getAttribute("data-page")
            if (!pageAttr) return
            const pageNo = parseInt(pageAttr, 10)

            let spans: any[] | null = null
            if (textLayer === textLayer1) spans = cachedSpanRanges1
            else if (textLayer === textLayer2) spans = cachedSpanRanges2

            if (spans) {
                const clickOffset = getOffsetFromPoint(e, textLayer, spans)
                if (clickOffset !== null) {
                    const currentBook = viewerStore.getCurrentBook()
                    if (!currentBook) return

                    const clickedNote = notesStore.notes.find(
                        (n) =>
                            n.bookId === currentBook.id &&
                            n.pageNumber === pageNo &&
                            clickOffset >= n.start &&
                            clickOffset <= n.end,
                    )
                    if (clickedNote) {
                        notesStore.activePopup = {
                            note: clickedNote,
                            x: e.clientX,
                            y: e.clientY,
                        }
                        notesStore.activeSelection = null
                        e.stopPropagation()
                        e.preventDefault()
                    }
                }
            }
        }

        document.addEventListener("selectionchange", handleSelectionChange)
        const currentContainer = container
        if (currentContainer) {
            currentContainer.addEventListener("click", handleTextLayerClick)
        }

        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange)
            if (currentContainer) {
                currentContainer.removeEventListener("click", handleTextLayerClick)
            }
        }
    })

    $effect(() => {
        if (!uiStore.isSearchModeActive || uiStore.prompt.isOpen) return

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
            {#if layoutMode === "split" && currentPageImage2}
                <div class="book-spread">
                    <div class="pdf-image-wrapper split-left" style={wrapperStyle1}>
                        <img
                            src={currentPageImage}
                            alt={m.page_render_alt({ page: currentPage })}
                            class="pdf-image"
                        />
                        <div bind:this={textLayer1} class="textLayer" data-page={currentPage}></div>
                        <div bind:this={annotationLayer1} class="annotationLayer"></div>
                    </div>
                    <div class="book-spine"></div>
                    <div class="pdf-image-wrapper split-right" style={wrapperStyle2}>
                        <img
                            src={currentPageImage2}
                            alt={m.page_render_alt({ page: currentPage + 1 })}
                            class="pdf-image"
                        />
                        <div
                            bind:this={textLayer2}
                            class="textLayer"
                            data-page={currentPage + 1}
                        ></div>
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
                    <div bind:this={textLayer1} class="textLayer" data-page={currentPage}></div>
                    <div bind:this={annotationLayer1} class="annotationLayer"></div>
                </div>
            {/if}
        </div>
    {/if}
{/snippet}

<div
    class="canvas-pane"
    class:scroll-mode={layoutMode === "scroll"}
    class:mobile-full-width={uiStore.isCompact && !isShortHeight}
    class:single-layout={layoutMode === "single"}
    class:compact-mode={uiStore.isCompact}
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
            // Sync final exact scroll state when scroll ends
            if (container && hasRestoredScroll) {
                syncScrollState(container.scrollTop, container.clientHeight, container.scrollHeight)
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

    .canvas-pane.compact-mode {
        background: transparent;
    }

    .canvas-pane.compact-mode .canvas-frame {
        background: transparent;
        background-image: none;
        box-shadow: none;
        padding: 0 !important;
    }

    .canvas-frame {
        flex: 1;
        background: var(--canvas-bg-color);
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
        overflow: auto;
        display: flex;
        justify-content: safe center;
        align-items: flex-start;
        position: relative;
        padding: 40px;
    }

    @media (min-width: 801px) and (min-height: 501px) {
        .canvas-frame {
            background-image: radial-gradient(var(--border-color) 1px, transparent 0);
            background-size: 24px 24px;
        }
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
        border-bottom: none !important;
    }

    .canvas-pane.mobile-full-width .pdf-image {
        width: 100% !important;
        height: auto !important;
    }

    .canvas-pane.mobile-full-width .pages-container:not(.split-mode) {
        width: 100%;
        gap: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    /* Mobile full width split layout (book spread) */
    .canvas-pane.mobile-full-width .pages-container.split-mode {
        width: 100%;
        gap: 0;
        padding: 0;
    }

    .canvas-pane.mobile-full-width .book-spread {
        width: 100% !important;
        border-width: 0;
        border-bottom: none;
        box-shadow: none;
    }

    .canvas-pane.mobile-full-width .book-spread .pdf-image-wrapper {
        width: 50% !important;
        border-bottom: none !important;
    }

    /* Book Spread joined layout */
    .book-spread {
        display: flex;
        position: relative;
        align-items: flex-start;
        box-shadow: 12px 12px 0 var(--shadow-color);
        border: 3px solid var(--border-color);
        background: var(--canvas-bg-color);
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
