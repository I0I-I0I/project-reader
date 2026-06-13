<script lang="ts">
    import type { Snippet } from "svelte"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"

    interface Props {
        children: Snippet
        class?: string
        activeValue?: any
    }

    let { children, class: className = "", activeValue }: Props = $props()

    let containerEl = $state<HTMLElement | null>(null)
    let indicatorStyle = $state("opacity: 0;")
    let isInitialized = $state(false)

    $effect(() => {
        const _ = activeValue

        function updatePosition() {
            const activeItem = containerEl?.querySelector(".tab-item.active") as HTMLElement | null
            if (activeItem && containerEl) {
                const left = activeItem.offsetLeft
                const width = activeItem.offsetWidth
                indicatorStyle = `left: ${left}px; width: ${width}px; opacity: 1;`

                if (!isInitialized) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            isInitialized = true
                        })
                    })
                }
            } else {
                indicatorStyle = `opacity: 0;`
            }
        }

        updatePosition()

        window.addEventListener("resize", updatePosition)
        return () => {
            window.removeEventListener("resize", updatePosition)
        }
    })
</script>

<div class="tabs-list {className}" bind:this={containerEl}>
    <div
        class="active-indicator"
        class:animated={settingsStore.animations && isInitialized}
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
        z-index: 1;
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
