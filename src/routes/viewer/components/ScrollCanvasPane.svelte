<script lang="ts">
    import type PDFDocument from "$lib/pdf"
    import ScrollPage from "./ScrollPage.svelte"
    import { onMount, untrack } from "svelte"

    let {
        pdf,
        scale,
        totalPages,
        currentPage = $bindable(),
    } = $props<{
        pdf: PDFDocument | null
        scale: number
        totalPages: number
        currentPage: number
    }>()

    let container = $state<HTMLElement | null>(null)
    let isAutoScrolling = false
    let lastObservedPage = currentPage

    const PRELOAD_COUNT = 4

    onMount(() => {
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (isAutoScrolling) return

                let mostVisiblePage = currentPage
                let maxRatio = 0

                for (const entry of entries) {
                    if (entry.intersectionRatio > maxRatio) {
                        maxRatio = entry.intersectionRatio
                        const pageNum = parseInt(entry.target.getAttribute("data-page") || "1")
                        mostVisiblePage = pageNum
                    }
                }

                if (maxRatio > 0.15 && mostVisiblePage !== currentPage) {
                    lastObservedPage = mostVisiblePage
                    currentPage = mostVisiblePage
                }
            },
            {
                root: container,
                rootMargin: "-25% 0px -25% 0px",
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
            },
        )

        const observePages = () => {
            const pages = container?.querySelectorAll(".scroll-page")
            pages?.forEach((page) => observer.observe(page))
        }

        // We need to wait for the each block to render
        const timeout = setTimeout(observePages, 100)

        return () => {
            clearTimeout(timeout)
            observer.disconnect()
        }
    })

    // Programmatic scroll when currentPage changes externally
    $effect(() => {
        const targetPage = currentPage

        untrack(() => {
            if (!container || isAutoScrolling || targetPage === lastObservedPage) return

            const targetElement = container.querySelector(
                `.scroll-page[data-page="${targetPage}"]`,
            ) as HTMLElement
            if (targetElement) {
                const containerRect = container.getBoundingClientRect()
                const elementRect = targetElement.getBoundingClientRect()

                // If the element is significantly out of view or not centered, scroll to it
                const isVisible =
                    elementRect.top >= containerRect.top - 100 &&
                    elementRect.bottom <= containerRect.bottom + 100

                if (!isVisible) {
                    isAutoScrolling = true
                    lastObservedPage = targetPage
                    targetElement.scrollIntoView({ behavior: "auto", block: "start" })

                    // Reset auto-scrolling flag after animation/jump
                    setTimeout(() => {
                        isAutoScrolling = false
                    }, 100)
                }
            }
        })
    })
</script>

<div class="scroll-canvas-pane" bind:this={container}>
    {#if pdf}
        {#each Array(totalPages) as _, i (i)}
            <ScrollPage
                {pdf}
                pageNumber={i + 1}
                {scale}
                shouldLoad={Math.abs(currentPage - (i + 1)) <= PRELOAD_COUNT}
            />
        {/each}
    {/if}
</div>

<style>
    .scroll-canvas-pane {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--canvas-frame-bg);
        background-image: radial-gradient(var(--border-color) 1px, transparent 0);
        background-size: 24px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        height: 100%;
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
    }

    /* Custom scrollbar */
    .scroll-canvas-pane::-webkit-scrollbar {
        width: 10px;
    }

    .scroll-canvas-pane::-webkit-scrollbar-track {
        background: var(--viewer-body-bg);
    }

    .scroll-canvas-pane::-webkit-scrollbar-thumb {
        background: var(--viewer-accent);
        border: 2px solid var(--viewer-body-bg);
    }

    .scroll-canvas-pane::-webkit-scrollbar-thumb:hover {
        background: var(--viewer-accent-active);
    }
</style>
