<script lang="ts">
    import type PDFDocument from "$lib/pdf"
    import { Page } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack } from "svelte"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import * as pdfjs from "pdfjs-dist"
    import { MEDIA_QUERIES } from "$lib/breakpoints"
    import { onMount } from "svelte"

    let isMobilePhone = $state(false)
    let isShortHeight = $state(false)

    onMount(() => {
        const mediaQuery = window.matchMedia(MEDIA_QUERIES.MOBILE)
        isMobilePhone = mediaQuery.matches

        const handler = (e: MediaQueryListEvent) => {
            isMobilePhone = e.matches
        }
        mediaQuery.addEventListener("change", handler)

        const heightQuery = window.matchMedia("(max-height: 500px)")
        isShortHeight = heightQuery.matches

        const heightHandler = (e: MediaQueryListEvent) => {
            isShortHeight = e.matches
        }
        heightQuery.addEventListener("change", heightHandler)

        return () => {
            mediaQuery.removeEventListener("change", handler)
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
                            if (err.message?.startsWith("Rendering cancelled")) {
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
        if (!imageUrl || !textLayerContainer || !pdf) return
        const currentScale = scale

        const controller = new AbortController()
        const container = textLayerContainer

        const renderText = async () => {
            try {
                const { textContent, viewport } = await pdf.getTextAndViewport(
                    pageNumber,
                    currentScale,
                )
                if (controller.signal.aborted) return

                container.innerHTML = ""
                container.style.setProperty("--scale-factor", currentScale.toString())

                const textLayer = new pdfjs.TextLayer({
                    textContentSource: textContent,
                    container,
                    viewport: viewport.clone({ dontFlip: true }),
                })

                await textLayer.render()
                if (controller.signal.aborted) {
                    container.innerHTML = ""
                }
            } catch (err) {
                if (controller.signal.aborted) return
                console.error(
                    `[ScrollPage] Failed to render text layer for page ${pageNumber}`,
                    err,
                )
            }
        }

        renderText()

        return () => {
            controller.abort()
        }
    })
</script>

<div
    class="scroll-page"
    style="top: {offsetY}px;"
    data-page={pageNumber}
    class:mobile-full-width={isMobilePhone && !isShortHeight}
>
    <div class="page-container" style={containerStyle}>
        {#if imageUrl}
            <div class="pdf-image-wrapper" style={containerStyle}>
                <img
                    src={imageUrl}
                    alt={m.page_render_alt({ page: pageNumber })}
                    class="pdf-image"
                />
                <div bind:this={textLayerContainer} class="textLayer"></div>
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

    .placeholder {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        background: var(--canvas-frame-bg);
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

    @media (max-width: 900px) {
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
</style>
