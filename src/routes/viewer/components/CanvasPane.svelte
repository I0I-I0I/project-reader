<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/components/Spinner.svelte"

    let { isPageLoading, currentPageImage, currentPage } = $props<{
        isPageLoading: boolean
        currentPageImage: string | null
        currentPage: number
    }>()
</script>

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

<style>
    .canvas-pane {
        display: flex;
        flex-direction: column;
        padding: 20px;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        background: var(--canvas-pane-bg);
        width: 100%;
    }

    .canvas-frame {
        flex: 1;
        border: 2px solid var(--border-color);
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

    .pdf-image {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        display: block;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: top center;
    }

    @media (max-width: 600px) {
        .canvas-pane {
            padding: 6px;
        }

        .canvas-frame {
            padding: 6px;
            border-width: 1.5px;
        }

        .pdf-image {
            border-width: 1.5px;
            box-shadow: 2px 2px 0 var(--shadow-color);
        }
    }
</style>
