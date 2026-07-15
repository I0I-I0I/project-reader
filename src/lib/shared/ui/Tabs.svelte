<script lang="ts">
    import type { Snippet } from "svelte"
    import { motionPreferences } from "$lib/shared/state/motion.svelte"

    interface Props {
        children: Snippet
        class?: string
        activeValue?: any
    }

    let { children, class: className = "", activeValue }: Props = $props()

    let indicatorStyle = $state("opacity: 0;")
    let isInitialized = $state(false)

    function trackIndicator(_activeValue: unknown) {
        return (container: HTMLElement) => {
            let initializeFrame = 0

            function updatePosition() {
                const activeItem = container.querySelector(".tab-item.active") as HTMLElement | null
                if (activeItem) {
                    indicatorStyle = `left: ${activeItem.offsetLeft}px; width: ${activeItem.offsetWidth}px; opacity: 1;`
                    if (!isInitialized && !initializeFrame) {
                        initializeFrame = requestAnimationFrame(() => {
                            initializeFrame = requestAnimationFrame(() => {
                                isInitialized = true
                                initializeFrame = 0
                            })
                        })
                    }
                } else {
                    indicatorStyle = "opacity: 0;"
                }
            }

            const resizeObserver = new ResizeObserver(updatePosition)
            resizeObserver.observe(container)
            for (const child of container.children) resizeObserver.observe(child)

            const mutationObserver = new MutationObserver(() => {
                for (const child of container.children) resizeObserver.observe(child)
                updatePosition()
            })
            mutationObserver.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class"],
            })
            updatePosition()

            return () => {
                resizeObserver.disconnect()
                mutationObserver.disconnect()
                if (initializeFrame) cancelAnimationFrame(initializeFrame)
            }
        }
    }
</script>

<div class="tabs-list {className}" {@attach trackIndicator(activeValue)}>
    <div
        class="active-indicator"
        class:animated={motionPreferences.enabled && isInitialized}
        style={indicatorStyle}
    ></div>
    {@render children()}
</div>

<style>
    .tabs-list {
        position: relative;
        display: flex;
        align-items: stretch;
        height: 36px;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
        padding: 0;
        box-sizing: border-box;
    }

    .tabs-list::-webkit-scrollbar {
        display: none;
    }

    .active-indicator {
        position: absolute;
        top: 0;
        bottom: 0;
        background: var(--accent-active-color);
        z-index: var(--z-1);
        pointer-events: none;
        box-sizing: border-box;
    }

    .active-indicator.animated {
        transition:
            left 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.15s ease;
    }
</style>
