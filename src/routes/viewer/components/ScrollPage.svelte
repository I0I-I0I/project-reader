<script lang="ts">
    import type PDFDocument from "$lib/pdf"
    import { Page } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import * as pdfjs from "pdfjs-dist"
    import { onMount } from "svelte"
    import { ViewerLinkService } from "./ViewerLinkService"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"

    let isShortHeight = $state(false)

    onMount(() => {
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

    let { pdf, pageNumber, scale, offsetY, width, height } = $props<{
        pdf: PDFDocument
        pageNumber: number
        scale: number
        offsetY: number
        width: number
        height: number
    }>()

    let imageUrl = $state<string | null>(null)
    let isLoading = $state(false)
    let textLayerContainer = $state<HTMLElement | null>(null)
    let annotationLayerContainer = $state<HTMLDivElement | null>(null)

    const containerStyle = $derived(
        `width: ${width}px; height: ${height}px; --aspect-ratio: ${width} / ${height};`,
    )

    $effect(() => {
        const currentPdf = pdf
        const quality = settingsStore.quality

        return untrack(() => {
            if (currentPdf) {
                // If quality changed, we must discard the old image URL
                imageUrl = null

                const controller = new AbortController()

                const timeout = setTimeout(() => {
                    isLoading = true
                    currentPdf
                        .getCanvasPage(new Page(pageNumber), quality, controller.signal)
                        .then((url: string) => {
                            if (controller.signal.aborted) {
                                return
                            }
                            imageUrl = url
                            isLoading = false
                        })
                        .catch((err: any) => {
                            if (!err.message?.startsWith("Rendering cancelled")) {
                                console.error(`[ScrollPage] Failed to load page ${pageNumber}`, err)
                            }
                            isLoading = false
                        })
                }, 50)

                return () => {
                    clearTimeout(timeout)
                    controller.abort()
                }
            }
        })
    })

    $effect(() => {
        if (!imageUrl || !textLayerContainer || !annotationLayerContainer || !pdf) return
        const currentScale = scale

        const controller = new AbortController()
        const textContainer = textLayerContainer
        const annotationContainer = annotationLayerContainer

        const renderLayers = async () => {
            try {
                const { pageProxy, textContent, annotations, viewport } =
                    await pdf.getPageDataForRendering(pageNumber, currentScale)
                if (controller.signal.aborted) return

                textContainer.innerHTML = ""
                textContainer.style.setProperty("--scale-factor", currentScale.toString())

                const textLayer = new pdfjs.TextLayer({
                    textContentSource: textContent,
                    container: textContainer,
                    viewport: viewport.clone({ dontFlip: true }),
                })

                await textLayer.render()
                if (controller.signal.aborted) {
                    textContainer.innerHTML = ""
                    return
                }
                cachedSpanRanges = null
                textLayerRenderCount += 1

                annotationContainer.innerHTML = ""
                if (annotations.length === 0) return

                const linkService = new ViewerLinkService(pdf, (targetPage) => {
                    if (viewerStore.goToPage) {
                        viewerStore.goToPage(targetPage, { isJump: true })
                    }
                })
                linkService.page = pageNumber

                annotationContainer.style.setProperty("--scale-factor", currentScale.toString())

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

                if (controller.signal.aborted) {
                    annotationContainer.innerHTML = ""
                }
            } catch (err) {
                if (controller.signal.aborted) return
                console.error(`[ScrollPage] Failed to render layers for page ${pageNumber}`, err)
            }
        }

        const delayTimeout = setTimeout(() => {
            renderLayers()
        }, 250)

        return () => {
            clearTimeout(delayTimeout)
            controller.abort()
        }
    })

    let textLayerRenderCount = $state(0)
    let cachedSpanRanges: any[] | null = null

    $effect(() => {
        const count = textLayerRenderCount
        const matches = searchStore.matches
        const pageNo = pageNumber

        untrack(() => {
            if (textLayerContainer && pdf) {
                highlightPage(pageNo, textLayerContainer)
            }
        })
        return () => {
            untrack(() => {
                searchStore.unregisterPageRanges(pageNo)
            })
        }
    })

    function highlightPage(pageNo: number, textContainer: HTMLElement) {
        const matches = searchStore.matches.filter((m) => m.pageNumber === pageNo)
        const ranges: Range[] = []

        if (matches.length > 0) {
            if (!cachedSpanRanges) {
                const spans = Array.from(textContainer.querySelectorAll("span"))
                let currentOffset = 0
                cachedSpanRanges = spans.map((span) => {
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
            }

            matches.forEach((match) => {
                const startEntry = cachedSpanRanges!.find(
                    (entry) => entry.start <= match.start && entry.end > match.start,
                )
                const endEntry = cachedSpanRanges!.find(
                    (entry) => entry.start <= match.end && entry.end >= match.end,
                )

                if (startEntry && endEntry) {
                    try {
                        const range = new Range()
                        range.setStart(startEntry.textNode, match.start - startEntry.start)
                        range.setEnd(endEntry.textNode, match.end - endEntry.start)
                        ranges.push(range)
                    } catch (e) {
                        console.error("[ScrollPage] Failed to create highlight range:", e)
                        ranges.push(null as any) // Keep index aligned
                    }
                }
            })
        }

        searchStore.registerPageRanges(pageNo, ranges)
    }
</script>

<div
    class="scroll-page"
    style="top: {offsetY}px;"
    data-page={pageNumber}
    class:mobile-full-width={uiStore.isCompact && !isShortHeight}
>
    <div class="page-container" style={containerStyle}>
        {#if !uiStore.isCompact}
            <div class="scroll-page-badge" class:hidden-toolbars={!uiStore.isToolbarsVisible}>
                {m.page()}
                {pageNumber}
            </div>
        {/if}
        {#if imageUrl}
            <div class="pdf-image-wrapper" style={containerStyle}>
                <img
                    src={imageUrl}
                    alt={m.page_render_alt({ page: pageNumber })}
                    class="pdf-image"
                />
                <div bind:this={textLayerContainer} class="textLayer"></div>
                <div bind:this={annotationLayerContainer} class="annotationLayer"></div>
            </div>
        {:else}
            <div class="placeholder" style={containerStyle}>
                <div class="loader-overlay">
                    <Spinner variant="dots" size="sm" label="" />
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .scroll-page {
        position: absolute;
        left: 0;
        right: 0;
        display: flex;
        justify-content: safe center;
        align-items: flex-start;
        padding: 40px;
        box-sizing: border-box;
    }

    .page-container {
        position: relative;
    }

    .pdf-image-wrapper {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        display: inline-flex;
        position: relative;
    }

    .pdf-image {
        display: block;
        width: 100%;
        height: 100%;
    }

    :global(html.dark) .pdf-image {
        filter: invert(1) hue-rotate(180deg);
    }

    .placeholder {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        background: var(--canvas-bg-color);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .loader-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
    }

    @media (--desktop) {
        .scroll-page {
            padding: 8px 0px;
        }

        .pdf-image-wrapper,
        .placeholder {
            border-width: 1.5px;
            box-shadow: 4px 4px 0 var(--shadow-color);
        }
    }

    .scroll-page.mobile-full-width {
        padding: 0;
    }

    .scroll-page.mobile-full-width .page-container {
        width: 100% !important;
        height: auto !important;
        aspect-ratio: var(--aspect-ratio) !important;
    }

    .scroll-page.mobile-full-width .pdf-image-wrapper,
    .scroll-page.mobile-full-width .placeholder {
        width: 100% !important;
        height: auto !important;
        aspect-ratio: var(--aspect-ratio) !important;
        border-width: 0;
        border-bottom: 2px solid var(--border-color) !important;
        box-shadow: none;
    }

    .scroll-page.mobile-full-width .pdf-image {
        width: 100% !important;
        height: auto !important;
    }

    .scroll-page-badge {
        position: absolute;
        top: -12px;
        left: -12px;
        background: var(--accent-active-color);
        color: var(--text-color);
        border: 2.5px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        padding: 4px 10px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        z-index: 10;
        pointer-events: none;
        transition:
            opacity 0.2s ease,
            transform 0.2s ease;
    }

    .scroll-page-badge.hidden-toolbars {
        opacity: 0;
        transform: translateY(-8px);
    }
</style>
