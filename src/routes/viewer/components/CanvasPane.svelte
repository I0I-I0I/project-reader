<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/components/Spinner.svelte"

    let { isPageLoading, currentPageImage, currentPageImage2, currentPage, layoutMode } = $props<{
        isPageLoading: boolean
        currentPageImage: string | null
        currentPageImage2?: string | null
        currentPage: number
        layoutMode?: "single" | "split"
    }>()
</script>

<div class="canvas-pane">
    <div class="canvas-frame">
        {#if isPageLoading}
            <div class="pane-loader">
                <Spinner variant="dots" size="lg" label={m.rendering_page()} />
            </div>
        {:else if currentPageImage}
            <div class="pages-container" class:split-mode={layoutMode === "split"}>
                <div class="pdf-image-wrapper">
                    <img
                        src={currentPageImage}
                        alt={m.page_render_alt({ page: currentPage })}
                        class="pdf-image"
                    />
                </div>
                {#if layoutMode === "split" && currentPageImage2}
                    <div class="pdf-image-wrapper">
                        <img
                            src={currentPageImage2}
                            alt={m.page_render_alt({ page: currentPage + 1 })}
                            class="pdf-image"
                        />
                    </div>
                {/if}
            </div>
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
    }

    .canvas-frame {
        flex: 1;
        background: var(--canvas-frame-bg);
        background-image: radial-gradient(var(--border-color) 1px, transparent 0);
        background-size: 24px 24px;
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
        overflow: auto;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        position: relative;
        padding: 40px;
    }

    .pages-container {
        display: flex;
        gap: 24px;
        align-items: flex-start;
        justify-content: center;
        max-width: 100%;
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
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: top center;
        max-width: 100%;
    }

    .pdf-image {
        display: block;
        max-width: 100%;
        height: auto;
    }

    :global(html.dark) .pdf-image {
        filter: invert(1) hue-rotate(180deg);
    }

    @media (max-width: 1024px) {
        .pages-container.split-mode {
            flex-direction: column;
            align-items: center;
        }
    }

    @media (max-width: 600px) {
        .canvas-pane {
            padding: 6px;
        }

        .canvas-frame {
            padding: 16px;
            border-width: 1.5px;
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
