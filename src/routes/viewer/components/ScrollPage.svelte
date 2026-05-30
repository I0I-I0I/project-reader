<script lang="ts">
    import type PDFDocument from "$lib/pdf"
    import { Page } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack } from "svelte"
    import { settingsStore } from "$lib/settingsStore.svelte"

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

    const containerStyle = $derived(`width: ${width}px; height: ${height}px;`)

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
</script>

<div class="scroll-page" style="top: {offsetY}px;" data-page={pageNumber}>
    <div class="page-container" style={containerStyle}>
        {#if imageUrl}
            <div class="pdf-image-wrapper" style={containerStyle}>
                <img
                    src={imageUrl}
                    alt={m.page_render_alt({ page: pageNumber })}
                    class="pdf-image"
                />
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
</style>
