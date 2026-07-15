<script lang="ts">
    import { motionPreferences } from "$lib/shared/state/motion.svelte"
    import { onMount, type Snippet } from "svelte"
    import { fade, scale } from "svelte/transition"

    export type FloatPlacement = "center" | "top" | "bottom" | "anchor"

    type Props = {
        children: Snippet
        backdrop?: "none" | "transparent" | "blur"
        onBackdropPointerDown?: (event: PointerEvent) => void
        onSurfacePointerDown?: (event: PointerEvent) => void
        onSurfaceFocusIn?: (event: FocusEvent) => void
        surfaceRef?: HTMLElement | null
        class?: string
        style?: string
        role?: string
        ariaModal?: boolean
        ariaLabel?: string
        ariaLabelledby?: string
        ariaDescribedby?: string
        zIndex?: number
    } & (
        | { placement: "anchor"; anchor: HTMLElement }
        | { placement?: Exclude<FloatPlacement, "anchor">; anchor?: never }
    )

    let {
        children,
        placement = "center",
        anchor,
        backdrop = "blur",
        onBackdropPointerDown,
        onSurfacePointerDown,
        onSurfaceFocusIn,
        surfaceRef = $bindable(null),
        class: className = "",
        style = "",
        role,
        ariaModal,
        ariaLabel,
        ariaLabelledby,
        ariaDescribedby,
        zIndex = 1000,
    }: Props = $props()

    let viewportHeight = $state("100dvh")
    let viewportWidth = $state("100vw")
    let viewportTop = $state("0px")
    let viewportLeft = $state("0px")
    let anchorPosition = $state({ x: 0, y: 0 })

    function updateAnchorPosition() {
        if (placement !== "anchor" || !anchor || !surfaceRef) return
        const anchorRect = anchor.getBoundingClientRect()
        const surfaceRect = surfaceRef.getBoundingClientRect()
        const viewport = window.visualViewport
        const left = viewport?.offsetLeft ?? 0
        const top = viewport?.offsetTop ?? 0
        const right = left + (viewport?.width ?? window.innerWidth)
        const bottom = top + (viewport?.height ?? window.innerHeight)
        anchorPosition = {
            x: Math.min(Math.max(anchorRect.left, left + 8), right - surfaceRect.width - 8),
            y: Math.min(Math.max(anchorRect.bottom + 8, top + 8), bottom - surfaceRect.height - 8),
        }
    }

    onMount(() => {
        const visualViewport = window.visualViewport
        const updateViewport = () => {
            viewportHeight = `${visualViewport?.height ?? window.innerHeight}px`
            viewportWidth = `${visualViewport?.width ?? window.innerWidth}px`
            viewportTop = `${visualViewport?.offsetTop ?? 0}px`
            viewportLeft = `${visualViewport?.offsetLeft ?? 0}px`
            updateAnchorPosition()
        }
        visualViewport?.addEventListener("resize", updateViewport)
        visualViewport?.addEventListener("scroll", updateViewport)
        window.addEventListener("resize", updateViewport)
        window.addEventListener("scroll", updateViewport, true)
        requestAnimationFrame(updateViewport)
        return () => {
            visualViewport?.removeEventListener("resize", updateViewport)
            visualViewport?.removeEventListener("scroll", updateViewport)
            window.removeEventListener("resize", updateViewport)
            window.removeEventListener("scroll", updateViewport, true)
        }
    })

    function portal(node: HTMLElement) {
        let host = document.getElementById("modal-overlay-host")
        if (!host) {
            host = document.createElement("div")
            host.id = "modal-overlay-host"
            document.body.appendChild(host)
        }
        host.appendChild(node)
        return () => {
            node.remove()
            if (host?.childElementCount === 0) host.remove()
        }
    }

    let surfaceStyle = $derived(
        [
            style,
            placement === "anchor"
                ? `position:fixed;left:${anchorPosition.x}px;top:${anchorPosition.y}px;margin:0;`
                : "",
        ]
            .filter(Boolean)
            .join(";"),
    )
</script>

<div
    {@attach portal}
    class={["float-wrapper", `placement-${placement}`, backdrop === "none" && "without-backdrop"]}
    style:height={viewportHeight}
    style:width={viewportWidth}
    style:top={viewportTop}
    style:left={viewportLeft}
    style:z-index={zIndex}
    style:--float-viewport-height={viewportHeight}
    style:--float-viewport-width={viewportWidth}
>
    {#if backdrop !== "none"}
        <div
            class={["float-backdrop", `backdrop-${backdrop}`]}
            transition:fade|global={{ duration: motionPreferences.enabled ? 150 : 0 }}
            onpointerdown={onBackdropPointerDown}
            aria-hidden="true"
        ></div>
    {/if}
    <div
        bind:this={surfaceRef}
        class={["float-surface", className]}
        style={surfaceStyle}
        {role}
        aria-modal={ariaModal}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        tabindex="-1"
        onpointerdown={onSurfacePointerDown}
        onfocusin={onSurfaceFocusIn}
        transition:scale|global={{
            duration: motionPreferences.enabled ? 180 : 0,
            start: 0.96,
        }}
    >
        {@render children()}
    </div>
</div>

<style>
    .float-wrapper {
        position: fixed;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 20px;
        box-sizing: border-box;
        pointer-events: none;
    }

    .float-backdrop {
        position: absolute;
        inset: 0;
        background: rgb(0 0 0 / 0.4);
        pointer-events: auto;
    }

    .backdrop-blur {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
    }

    .backdrop-transparent {
        background: transparent;
    }

    .float-surface {
        position: relative;
        z-index: 1;
        min-width: 0;
        min-height: 0;
        max-width: 100%;
        max-height: 100%;
        margin: auto;
        box-sizing: border-box;
        pointer-events: auto;
        overscroll-behavior: contain;
    }

    .placement-top .float-surface {
        margin-top: 80px;
        margin-bottom: auto;
    }

    .placement-bottom .float-surface {
        margin-top: auto;
        margin-bottom: 0;
    }

    @media (--mobile) {
        .float-wrapper {
            padding: 16px 12px;
        }

        .placement-top .float-surface {
            margin-top: 0;
        }
    }
</style>
