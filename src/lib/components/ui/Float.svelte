<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore.svelte"
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

        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

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
                document.body.style.overflow = originalOverflow
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
            document.body.style.overflow = originalOverflow
        }
    })

    function portal(node: HTMLElement) {
        document.body.appendChild(node)
        return {
            destroy() {
                if (node.parentNode) {
                    node.parentNode.removeChild(node)
                }
            },
        }
    }
</script>

<div
    use:portal
    class="wrapper"
    class:align-top={align === "top"}
    style="height: {viewportHeight}; top: {viewportTop};"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="backdrop"
        style="height: {viewportHeight}; top: {viewportTop};"
        transition:fade={{ duration: settingsStore.animations ? 150 : 0 }}
        onmousedown={onClose}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="float-card"
        transition:scale={{ duration: settingsStore.animations ? 150 : 0, start: 0.95 }}
        onmousedown={(e) => e.stopPropagation()}
        onclick={(e) => e.stopPropagation()}
    >
        {@render children()}
    </div>
</div>

<style>
    .wrapper {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 9999;
        padding: 40px 20px;
        box-sizing: border-box;
    }

    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100dvh;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 0;
    }

    @media (--mobile) {
        .wrapper {
            padding: 16px 12px;
        }
    }

    .wrapper.align-top {
        padding-top: 120px;
    }

    .float-card {
        position: relative;
        z-index: var(--z-10);
        background: var(--surface-color);
        border: 3px solid var(--border-color);
        box-shadow: 6px 6px 0 var(--shadow-color);
        width: 100%;
        max-width: 580px;
        display: flex;
        flex-direction: column;
        border-radius: var(--radius-md);
        font-family: inherit;
        animation: card-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        overscroll-behavior: contain;
        margin: auto;
        flex-shrink: 0;
        box-sizing: border-box;
    }

    .wrapper.align-top .float-card {
        margin-top: 0;
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

    @media (--prompt) {
        .wrapper.align-top {
            padding: 0;
        }

        .wrapper.align-top .float-card {
            border-radius: 0;
            height: 100%;
            box-shadow: none;
            border-left: none;
            border-right: none;
            border-bottom: none;
            margin-top: auto;
        }

        .float-card {
            max-width: 100%;
            height: auto;
        }
    }
</style>
