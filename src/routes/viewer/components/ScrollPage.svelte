<script lang="ts">
    import type PDFDocument from "$lib/pdf"
    import { Page } from "$lib/pdf"
    import Spinner from "$lib/components/Spinner.svelte"
    import * as m from "$lib/paraglide/messages"

    let { pdf, pageNumber, scale, shouldLoad } = $props<{
        pdf: PDFDocument
        pageNumber: number
        scale: number
        shouldLoad: boolean
    }>()

    let element = $state<HTMLElement | null>(null)
    let imageUrl = $state<string | null>(null)
    let isLoading = $state(false)
    let loadedScale = $state<number | null>(null)

    let cachedHeight = $state<number | null>(null)
    let cachedWidth = $state<number | null>(null)

    const containerStyle = $derived.by(() => {
        if (cachedWidth && cachedHeight) {
            return `width: ${cachedWidth}px; aspect-ratio: ${cachedWidth} / ${cachedHeight}; height: auto;`
        }
        if (pdf.defaultWidth && pdf.defaultHeight) {
            return `width: ${pdf.defaultWidth * scale}px; aspect-ratio: ${pdf.defaultWidth} / ${pdf.defaultHeight}; height: auto;`
        }
        return ""
    })

    $effect(() => {
        // Re-load if scale changes or we enter viewport
        const currentScale = scale
        if (shouldLoad && (!imageUrl || loadedScale !== currentScale) && !isLoading && pdf) {
            isLoading = true
            pdf.getCanvasPage(new Page(pageNumber), currentScale)
                .then((url: string) => {
                    imageUrl = url
                    loadedScale = currentScale
                    isLoading = false
                })
                .catch((err: unknown) => {
                    console.error(`[ScrollPage] Failed to load page ${pageNumber}`, err)
                    isLoading = false
                })
        }
    })

    function handleImageLoad(event: Event) {
        const img = event.target as HTMLImageElement
        cachedHeight = img.naturalHeight
        cachedWidth = img.naturalWidth
    }
</script>

<div class="scroll-page" bind:this={element} data-page={pageNumber}>
    <div class="page-container">
        {#if imageUrl}
            <img
                src={imageUrl}
                alt={m.page_render_alt({ page: pageNumber })}
                class="pdf-image"
                onload={handleImageLoad}
                style={containerStyle}
            />
        {:else if cachedHeight && cachedWidth}
            <div class="placeholder" style={containerStyle}>
                {#if isLoading}
                    <div class="loader-overlay">
                        <Spinner variant="dots" size="sm" label="" />
                    </div>
                {/if}
            </div>
        {:else}
            <div class="placeholder initial-loading" style={containerStyle}>
                <Spinner variant="dots" size="md" label="" />
            </div>
        {/if}
    </div>
</div>

<style>
    .scroll-page {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 40px;
        width: 100%;
        box-sizing: border-box;
    }

    .page-container {
        position: relative;
        max-width: 100%;
    }

    .pdf-image {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        display: block;
        max-width: 100%;
        height: auto;
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

    .initial-loading {
        width: 600px;
        height: 800px;
        max-width: 100%;
    }

    .loader-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
    }

    @media (max-width: 600px) {
        .scroll-page {
            padding: 16px;
        }

        .pdf-image,
        .placeholder {
            border-width: 1.5px;
            box-shadow: 4px 4px 0 var(--shadow-color);
        }

        .initial-loading {
            height: 400px;
        }
    }
</style>
