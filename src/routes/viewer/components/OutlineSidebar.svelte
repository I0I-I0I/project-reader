<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Spinner from "$lib/components/Spinner.svelte"
    import type { FlatHeading } from "$lib/pdf"
    import { cubicOut } from "svelte/easing"

    let {
        isOutlineLoading,
        outlineList,
        currentPage = $bindable(),
        activeHeadings,
        onCloseOutline,
        onMouseLeave,
    } = $props<{
        isOutlineLoading: boolean
        outlineList: FlatHeading[] | null
        currentPage: number
        activeHeadings: Set<FlatHeading>
        onCloseOutline: () => void
        onMouseLeave?: (e: MouseEvent) => void
    }>()

    let contentRef: HTMLElement | undefined = $state()
    let hasScrolledInitially = false

    $effect(() => {
        if (
            !isOutlineLoading &&
            outlineList &&
            outlineList.length > 0 &&
            contentRef &&
            !hasScrolledInitially
        ) {
            // Use requestAnimationFrame to ensure the list is fully rendered and classes applied
            requestAnimationFrame(() => {
                if (!contentRef) return
                const activeElements = contentRef.querySelectorAll(".outline-item.active")
                if (activeElements.length > 0) {
                    // Scroll to the deepest active heading (last one in the matched set)
                    activeElements[activeElements.length - 1].scrollIntoView({ block: "center" })
                }
                hasScrolledInitially = true
            })
        }
    })

    function slideAndFly(node: HTMLElement, { duration = 150 }) {
        return {
            duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                return `
                    transform: translateX(${(eased - 1) * 100}%);
                `
            },
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="outline-sidebar"
    transition:slideAndFly={{ duration: 150 }}
    onmouseleave={onMouseLeave}
    onclick={(e) => e.stopPropagation()}
>
    <div class="sidebar-header">
        <h3>{m.outline()}</h3>
        <button class="close-sidebar-btn" onclick={onCloseOutline} aria-label={m.close()}>
            ×
        </button>
    </div>
    <div class="sidebar-content" bind:this={contentRef}>
        {#if isOutlineLoading}
            <div class="outline-loader">
                <Spinner variant="dots" size="sm" label="" />
            </div>
        {:else if !outlineList || outlineList.length === 0}
            <div class="no-outline">
                {m.no_outline()}
            </div>
        {:else}
            <nav class="outline-nav">
                {#each outlineList as heading}
                    <button
                        class="outline-item depth-{heading.depth}"
                        class:active={activeHeadings.has(heading)}
                        onclick={() => {
                            if (heading.pageNumber !== undefined) {
                                currentPage = heading.pageNumber
                                if (window.innerWidth <= 480) {
                                    onCloseOutline()
                                }
                            }
                        }}
                        disabled={heading.pageNumber === undefined}
                        style="--depth: {heading.depth}"
                        title={heading.title}
                    >
                        <span class="heading-title">{heading.title}</span>
                        {#if heading.pageNumber !== undefined}
                            <span class="heading-page">{heading.pageNumber}</span>
                        {/if}
                    </button>
                {/each}
            </nav>
        {/if}
    </div>
</div>

<style>
    .outline-sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 280px;
        background: var(--sidebar-content-bg);
        border-right: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: 10px 0 0 rgba(0, 0, 0, 0.1);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--sidebar-header-bg);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        flex-shrink: 0;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--doc-text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .close-sidebar-btn {
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
    }

    .close-sidebar-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--close-sidebar-hover-bg);
        color: var(--close-sidebar-hover-text);
    }

    .close-sidebar-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        background: var(--sidebar-content-bg);
    }

    .outline-loader {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
    }

    .no-outline {
        padding: 24px;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        color: var(--no-outline-text);
    }

    .outline-nav {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
    }

    .outline-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        background: none;
        border: none;
        border-bottom: 1px dashed var(--outline-item-border);
        padding: 10px 16px;
        padding-left: calc(16px + var(--depth) * 12px);
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-color);
        cursor: pointer;
        text-align: left;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    .outline-item:hover:not(:disabled) {
        background: var(--outline-hover-bg);
        color: var(--text-color);
        font-weight: 800;
    }

    .outline-item.active:not(:disabled) {
        background: var(--outline-active-bg);
        color: var(--text-color);
        font-weight: 900;
        border-bottom-style: solid;
    }

    .outline-item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .heading-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 8px;
    }

    .heading-page {
        background: var(--doc-file-badge-bg);
        color: var(--doc-file-badge-text);
        font-size: 9px;
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 2px;
        flex-shrink: 0;
        border: 1px solid var(--border-color);
    }

    @media (max-width: 480px) {
        .outline-sidebar {
            width: 100%;
            border-right: none;
        }
    }
</style>
