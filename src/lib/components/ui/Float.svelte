<script lang="ts">
    import { settingsStore } from "$lib/settingsStore.svelte"
    import { onMount } from "svelte"
    import type { Snippet } from "svelte"
    import { fade, scale } from "svelte/transition"

    interface Props {
        onClose: () => void
        children: Snippet
        align?: "center" | "top"
    }

    const { onClose, children, align = "center" }: Props = $props()

    let viewportHeight = $state("100dvh")
    let viewportTop = $state("0px")

    onMount(() => {
        if (typeof window === "undefined") return

        const visualViewport = window.visualViewport
        if (!visualViewport) {
            console.warn(
                "window.visualViewport is not supported in this browser. Falling back to window.innerHeight.",
            )
            const updateViewportFallback = () => {
                viewportHeight = `${window.innerHeight}px`
                viewportTop = "0px"
            }
            window.addEventListener("resize", updateViewportFallback)
            updateViewportFallback()
            return () => {
                window.removeEventListener("resize", updateViewportFallback)
            }
        }

        const updateViewport = () => {
            viewportHeight = `${visualViewport.height}px`
            viewportTop = `${visualViewport.offsetTop}px`
        }

        visualViewport.addEventListener("resize", updateViewport)
        visualViewport.addEventListener("scroll", updateViewport)
        updateViewport()

        return () => {
            visualViewport.removeEventListener("resize", updateViewport)
            visualViewport.removeEventListener("scroll", updateViewport)
        }
    })

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            onClose()
        }
    }
</script>

<div
    class="backdrop"
    class:align-top={align === "top"}
    style="height: {viewportHeight}; top: {viewportTop};"
    transition:fade={{ duration: settingsStore.animations ? 150 : 0 }}
    onclick={handleBackdropClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
>
    <div
        class="float-card"
        transition:scale={{ duration: settingsStore.animations ? 150 : 0, start: 0.95 }}
    >
        {@render children()}
    </div>
</div>

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100dvh;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
        box-sizing: border-box;
    }

    .backdrop.align-top {
        align-items: flex-start;
        padding-top: 120px;
    }

    .float-card {
        background: var(--surface-color);
        border: 3px solid var(--border-color);
        box-shadow: 6px 6px 0 var(--shadow-color);
        width: 100%;
        max-width: 580px;
        max-height: 85dvh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 4px;
        font-family: inherit;
        animation: card-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        overscroll-behavior: contain;
    }

    @keyframes card-appear {
        from {
            transform: scale(0.95);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    @media (max-width: 640px), (max-height: 800px) {
        .backdrop.align-top {
            align-items: flex-end;
            padding: 0;
        }

        .float-card {
            max-width: 100%;
            border-radius: 0;
            max-height: 100%;
            box-shadow: none;
            border-left: none;
            border-right: none;
            border-bottom: none;
        }
    }

    @media (max-height: 800px) {
        .float-card {
            height: 100%;
        }
    }
</style>
