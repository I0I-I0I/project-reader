<script lang="ts">
    import type { Snippet } from "svelte"
    import { motionPreferences } from "$lib/shared/state/motion.svelte"
    import { createSliderState } from "./sliderState.svelte"
    import type { SliderDirection } from "./sliderGesture"

    interface Props {
        current: Snippet
        previous?: Snippet
        next?: Snippet
        enabled?: boolean
        canMove: (direction: SliderDirection) => boolean
        onMove: (direction: SliderDirection) => void
        getHorizontalScrollContainer?: () => HTMLElement | null
        ariaLabel?: string
        class?: string
    }

    let {
        current,
        previous,
        next,
        enabled = true,
        canMove,
        onMove,
        getHorizontalScrollContainer,
        ariaLabel,
        class: className = "",
    }: Props = $props()

    const slider = createSliderState({
        enabled: () => enabled,
        canMove: (direction) => canMove(direction),
        onMove: (direction) => onMove(direction),
        getHorizontalScrollContainer: () => getHorizontalScrollContainer?.() ?? null,
        motionEnabled: () => motionPreferences.enabled,
    })

    const trackStyle = $derived(
        `transform: translate3d(calc(-33.333333% + ${slider.offsetX}), 0, 0); transition: ${slider.transition};`,
    )
</script>

<div
    class={["slider-viewport", className]}
    role="group"
    aria-label={ariaLabel}
    {@attach enabled && slider.attach}
>
    <div class="slider-track" style={trackStyle}>
        <div class="slider-slide slider-neighbor" inert aria-hidden="true">
            {@render previous?.()}
        </div>
        <div class="slider-slide slider-current">
            {@render current()}
        </div>
        <div class="slider-slide slider-neighbor" inert aria-hidden="true">
            {@render next?.()}
        </div>
    </div>
</div>

<style>
    .slider-viewport {
        display: flex;
        flex: 1;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
    }

    .slider-track {
        display: flex;
        flex: 0 0 300%;
        width: 300%;
        height: 100%;
        min-height: 0;
        will-change: transform;
    }

    .slider-slide {
        display: flex;
        flex: 0 0 33.333333%;
        width: 33.333333%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        box-sizing: border-box;
    }

    .slider-neighbor {
        pointer-events: none;
        user-select: none;
    }
</style>
