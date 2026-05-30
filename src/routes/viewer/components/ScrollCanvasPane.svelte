<script lang="ts">
    import type PDFDocument from "$lib/pdf"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import ScrollPage from "./ScrollPage.svelte"
    import { untrack } from "svelte"
    import { MEDIA_QUERIES } from "$lib/breakpoints"

    let {
        pdf,
        scale,
        currentPage = $bindable(),
    } = $props<{
        pdf: PDFDocument | null
        scale: number
        totalPages: number
        currentPage: number
    }>()

    let container = $state<HTMLElement | null>(null)
    let isAutoScrolling = false
    let lastObservedPage = -1

    // Virtualization state
    let pageDimensions = $state<{ width: number; height: number }[]>([])
    let scrollTop = $state(0)
    let containerHeight = $state(0)

    let isMobile = $state(false)

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

    const PAGE_GAP = $derived(isMobile ? 16 : 80)

    $effect(() => {
        if (pdf) {
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
            }
        } else {
            pageDimensions = []
        }
    })

    const pageOffsets = $derived.by(() => {
        if (pageDimensions.length === 0) return []
        const offsets: number[] = []
        let currentOffset = 0
        for (const dim of pageDimensions) {
            offsets.push(currentOffset)
            currentOffset += dim.height * scale + PAGE_GAP
        }
        return offsets
    })

    const totalHeight = $derived(
        pageOffsets.length > 0
            ? pageOffsets[pageOffsets.length - 1] +
                  pageDimensions[pageDimensions.length - 1].height * scale +
                  PAGE_GAP
            : 0,
    )

    function handleScroll(e: Event) {
        if (pageOffsets.length === 0) return

        const target = e.target as HTMLElement
        scrollTop = target.scrollTop
        containerHeight = target.clientHeight

        if (isAutoScrolling) return

        // Find current page based on scroll position (middle of viewport)
        const viewportMiddle = scrollTop + containerHeight / 2

        let foundPage = 1
        for (let i = 0; i < pageOffsets.length; i++) {
            const top = pageOffsets[i]
            const height = pageDimensions[i].height * scale + PAGE_GAP
            if (viewportMiddle >= top && viewportMiddle < top + height) {
                foundPage = i + 1
                break
            }
        }

        if (foundPage !== currentPage) {
            lastObservedPage = foundPage
            currentPage = foundPage
        }
    }

    const visibleRange = $derived.by(() => {
        if (pageOffsets.length === 0 || containerHeight === 0) return []

        const viewportTop = scrollTop
        const viewportBottom = scrollTop + containerHeight

        const buffer = containerHeight // 1 viewport buffer
        const renderTop = viewportTop - buffer
        const renderBottom = viewportBottom + buffer

        let startIdx = 0
        let endIdx = pageDimensions.length - 1

        for (let i = 0; i < pageOffsets.length; i++) {
            const bottom = pageOffsets[i] + pageDimensions[i].height * scale + PAGE_GAP
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
        const targetPage = currentPage
        const currentScale = scale
        const offsets = pageOffsets

        untrack(() => {
            if (lastScale === -1) {
                lastScale = currentScale
            }
            const scaleChanged = currentScale !== lastScale
            if (!container || isAutoScrolling || offsets.length === 0) return
            if (targetPage === lastObservedPage && !scaleChanged) return

            const targetOffset = offsets[targetPage - 1]

            isAutoScrolling = true
            container.scrollTo({
                top: targetOffset,
                behavior: settingsStore.animations ? "smooth" : "auto",
            })
            lastObservedPage = targetPage
            lastScale = currentScale

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    isAutoScrolling = false
                })
            })
        })
    })
</script>

<div
    class="scroll-canvas-pane"
    bind:this={container}
    bind:clientHeight={containerHeight}
    onscroll={handleScroll}
>
    {#if pdf && pageOffsets.length > 0}
        <div class="virtual-container" style="height: {totalHeight}px;">
            {#each visibleRange as i (i)}
                <ScrollPage
                    {pdf}
                    pageNumber={i + 1}
                    {scale}
                    offsetY={pageOffsets[i]}
                    width={pageDimensions[i].width * scale}
                    height={pageDimensions[i].height * scale}
                />
            {/each}
        </div>
    {/if}
</div>

<style>
    .scroll-canvas-pane {
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
        background: var(--canvas-frame-bg);
        background-image: radial-gradient(var(--border-color) 1px, transparent 0);
        background-size: 24px 24px;
        position: relative;
        height: 100%;
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
    }

    .virtual-container {
        position: relative;
        width: 100%;
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

    @media (hover: hover) {
        .scroll-canvas-pane::-webkit-scrollbar-thumb:hover {
            background: var(--viewer-accent-active);
        }
    }
</style>
