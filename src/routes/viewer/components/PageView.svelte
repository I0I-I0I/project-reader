<script lang="ts">
    import * as pdfjs from "pdfjs-dist"
    import type PDFDocument from "$lib/pdf"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
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
    import { ViewerLinkService } from "./ViewerLinkService"
    import { untrack, onMount } from "svelte"

    let {
        pdf,
        pageNumber,
        image,
        width,
        height,
        scale,
        renderLayers = true,
        class: className = "",
    } = $props<{
        pdf: PDFDocument | null
        pageNumber: number
        image: string | null
        width: number
        height: number
        scale: number
        renderLayers?: boolean
        class?: string
    }>()

    let textLayerEl = $state<HTMLElement | null>(null)
    let annotationLayerEl = $state<HTMLDivElement | null>(null)
    let renderCount = $state(0)
    let cachedSpanRanges = $state<SpanRange[] | null>(null)
    let controller: AbortController | null = null

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

            cachedSpanRanges = buildSpanRanges(textContainer)
            renderCount += 1

            if (annotationContainer) {
                annotationContainer.innerHTML = ""
                if (annotations.length === 0) return

                const linkService = new ViewerLinkService(targetPdf, (targetPage) => {
                    viewerStore.goToPage(targetPage, { isJump: true })
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
            console.error(`[PageView] Failed to render page layers for page ${pageNo}`, err)
        }
    }

    $effect(() => {
        if (!renderLayers || !pdf || !image || !textLayerEl || !annotationLayerEl) return

        controller?.abort()
        const newController = new AbortController()
        controller = newController

        const delayTimeout = setTimeout(() => {
            renderPageLayers(
                pdf!,
                pageNumber,
                textLayerEl!,
                annotationLayerEl!,
                scale,
                newController.signal,
            )
        }, 150)

        return () => {
            clearTimeout(delayTimeout)
            newController.abort()
        }
    })

    // Search Highlights
    $effect(() => {
        if (!renderLayers) return
        const _count = renderCount
        const _matches = searchStore.matches

        untrack(() => {
            if (textLayerEl && pdf) {
                const matches = searchStore.matches.filter((m) => m.pageNumber === pageNumber)
                const ranges: Range[] = []

                if (matches.length > 0 && cachedSpanRanges) {
                    matches.forEach((match) => {
                        const startEntry = findSpanByOffset(cachedSpanRanges!, match.start)
                        const endEntry = findSpanByOffset(cachedSpanRanges!, match.end)

                        if (startEntry && endEntry) {
                            try {
                                const range = new Range()
                                range.setStart(startEntry.textNode, match.start - startEntry.start)
                                range.setEnd(endEntry.textNode, match.end - endEntry.start)
                                ranges.push(range)
                            } catch (e) {
                                ranges.push(null as any)
                            }
                        }
                    })
                }
                searchStore.registerPageRanges(pageNumber, ranges)
            }
        })
        return () => {
            untrack(() => {
                searchStore.unregisterPageRanges(pageNumber)
            })
        }
    })

    // Notes Highlights
    $effect(() => {
        if (!renderLayers) return
        const _count = renderCount
        const _notes = notesStore.notes

        untrack(() => {
            if (textLayerEl && pdf) {
                const pageNotes = notesStore.notes.filter((n) => n.pageNumber === pageNumber)
                const noteRanges: { noteId: string; range: Range; color: string }[] = []

                if (pageNotes.length > 0 && cachedSpanRanges) {
                    pageNotes.forEach((note) => {
                        const startEntry = findSpanByOffset(cachedSpanRanges!, note.start)
                        const endEntry = findSpanByOffset(cachedSpanRanges!, note.end)

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
                                noteRanges.push({ noteId: note.id, range, color: note.color })
                            } catch (e) {}
                        }
                    })
                }
                notesStore.registerPageRanges(pageNumber, noteRanges)
            }
        })
        return () => {
            untrack(() => {
                notesStore.unregisterPageRanges(pageNumber)
            })
        }
    })

    function handleSelectionChange() {
        if (!browser || !pdf || !textLayerEl || !cachedSpanRanges) return
        const selection = document.getSelection()
        if (!selection || selection.isCollapsed) return

        const range = selection.getRangeAt(0)
        if (
            !textLayerEl.contains(range.startContainer) ||
            !textLayerEl.contains(range.endContainer)
        )
            return

        const currentBook = viewerStore.getCurrentBook()
        if (!currentBook) return

        const startOffset = getGlobalOffset(
            range.startContainer,
            range.startOffset,
            cachedSpanRanges,
        )
        const endOffset = getGlobalOffset(range.endContainer, range.endOffset, cachedSpanRanges)

        if (startOffset !== null && endOffset !== null) {
            const start = Math.min(startOffset, endOffset)
            const end = Math.max(startOffset, endOffset)
            const text = selection.toString()
            const rect = range.getBoundingClientRect()
            notesStore.activeSelection = {
                bookId: currentBook.id,
                pageNumber,
                start,
                end,
                text,
                x: rect.left + rect.width / 2,
                y: rect.top,
                bottomY: rect.bottom,
            }
        }
    }

    function handleTextLayerClick(e: MouseEvent) {
        if (!pdf || !textLayerEl || !cachedSpanRanges) return
        const clickOffset = getOffsetFromPoint(e, textLayerEl, cachedSpanRanges)
        if (clickOffset !== null) {
            const currentBook = viewerStore.getCurrentBook()
            if (!currentBook) return

            const clickedNote = notesStore.notes.find(
                (n) =>
                    n.bookId === currentBook.id &&
                    n.pageNumber === pageNumber &&
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

    onMount(() => {
        document.addEventListener("selectionchange", handleSelectionChange)
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange)
        }
    })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="pdf-image-wrapper {className}"
    style="width: {width}px; height: {height}px; --aspect-ratio: {width} / {height};"
    onclick={handleTextLayerClick}
>
    {#if image}
        <img src={image} alt="Page {pageNumber}" class="pdf-image" />
        {#if renderLayers}
            <div bind:this={textLayerEl} class="textLayer" data-page={pageNumber}></div>
            <div bind:this={annotationLayerEl} class="annotationLayer"></div>
        {/if}
    {/if}
</div>

<style>
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
</style>
