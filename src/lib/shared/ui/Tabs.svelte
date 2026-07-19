<script lang="ts">
    import type { Snippet } from "svelte"
    import { motionPreferences } from "$lib/shared/state/motion.svelte"
    import { getNextTabIndex, type TabNavigationKey } from "./tabsKeyboard"

    interface Props {
        children: Snippet
        class?: string
        activeValue?: any
        ariaLabel?: string
    }

    let { children, class: className = "", activeValue, ariaLabel }: Props = $props()

    let indicatorStyle = $state("opacity: 0;")
    let isInitialized = $state(false)

    /** Tabs use automatic activation: Arrow/Home/End moves focus and activates the tab. */
    function handleKeydown(event: KeyboardEvent) {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return

        const tablist = event.currentTarget as HTMLElement
        const tabs = [...tablist.querySelectorAll<HTMLButtonElement>("[role='tab']")]
        const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement)
        const enabledIndices = tabs.flatMap((tab, index) => (tab.disabled ? [] : [index]))
        const nextIndex = getNextTabIndex(
            currentIndex,
            event.key as TabNavigationKey,
            enabledIndices,
        )
        if (nextIndex === -1) return

        event.preventDefault()
        tabs[nextIndex].focus()
        tabs[nextIndex].click()
    }

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

<div
    class="tabs-list {className}"
    role="tablist"
    tabindex="-1"
    aria-label={ariaLabel}
    aria-orientation="horizontal"
    onkeydown={handleKeydown}
    {@attach trackIndicator(activeValue)}
>
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
        height: var(--control-height-compact);
        background: var(--surface-color);
        border: var(--border-inline) solid var(--border-color);
        box-shadow: var(--shadow-inline);
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
        background: var(--selected-surface);
        box-shadow: inset 4px 0 0 var(--accent-active-color);
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

    @media (--tiny-mobile) {
        .tabs-list {
            height: 46px;
            border-width: var(--border-inline);
            border-radius: 0;
            box-shadow: var(--shadow-inline);
            overflow-x: auto;
            overflow-y: hidden;
        }

        .active-indicator {
            top: 0;
            bottom: 0;
            border-radius: 0;
            background: var(--selected-surface);
            box-shadow: inset 4px 0 0 var(--accent-active-color);
        }
    }
</style>
