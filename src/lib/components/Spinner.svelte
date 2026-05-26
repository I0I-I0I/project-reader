<script lang="ts">
    interface Props {
        variant?: "classic" | "square" | "dots"
        size?: "sm" | "md" | "lg" | "xl"
        stepped?: boolean
        speed?: "slow" | "normal" | "fast"
        label?: string
        labelPosition?: "bottom" | "right"
        class?: string
    }

    let {
        variant = "classic",
        size = "md",
        stepped = true,
        speed = "normal",
        label,
        labelPosition = "bottom",
        class: className = "",
        ...props
    }: Props = $props()
</script>

<div class="spinner-container {labelPosition} {className}" {...props}>
    {#if variant === "classic"}
        <div class="spinner-element classic size-{size} speed-{speed}" class:stepped></div>
    {:else if variant === "square"}
        <div class="spinner-element square size-{size} speed-{speed}" class:stepped>
            <div class="square-outer">
                <div class="square-inner"></div>
            </div>
        </div>
    {:else if variant === "dots"}
        <div class="spinner-element dots size-{size} speed-{speed}">
            <span class="dot dot-1"></span>
            <span class="dot dot-2"></span>
            <span class="dot dot-3"></span>
        </div>
    {/if}

    {#if label}
        <span class="spinner-label size-{size}">{label}</span>
    {/if}
</div>

<style>
    .spinner-container {
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        vertical-align: middle;
    }

    .spinner-container.bottom {
        flex-direction: column;
        justify-content: center;
        gap: 12px;
    }

    .spinner-container.right {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
    }

    .size-sm {
        --spinner-size: 20px;
        --thickness: 2px;
        --dot-size: 6px;
        --dot-gap: 3px;
        --font-size: 11px;
    }

    .size-md {
        --spinner-size: 36px;
        --thickness: 3px;
        --dot-size: 10px;
        --dot-gap: 5px;
        --font-size: 12px;
    }

    .size-lg {
        --spinner-size: 56px;
        --thickness: 4px;
        --dot-size: 14px;
        --dot-gap: 7px;
        --font-size: 14px;
    }

    .size-xl {
        --spinner-size: 80px;
        --thickness: 5px;
        --dot-size: 20px;
        --dot-gap: 9px;
        --font-size: 16px;
    }

    /* Animation Duration Variables */
    .spinner-element {
        --speed-slow: 1.5s;
        --speed-normal: 0.8s;
        --speed-fast: 0.4s;
    }

    .spinner-element.classic {
        width: var(--spinner-size);
        height: var(--spinner-size);
        border: var(--thickness) solid var(--border-color);
        border-radius: 50%;
        border-top-color: var(--badge-bg);
        border-right-color: var(--badge-bg);
        box-sizing: border-box;
        flex-shrink: 0;
        transition: border-color 0.3s ease;
    }

    .spinner-element.classic.speed-slow {
        animation: spin var(--speed-slow) linear infinite;
    }
    .spinner-element.classic.speed-normal {
        animation: spin var(--speed-normal) linear infinite;
    }
    .spinner-element.classic.speed-fast {
        animation: spin var(--speed-fast) linear infinite;
    }

    .spinner-element.classic.speed-slow.stepped {
        animation: spin var(--speed-slow) steps(8) infinite;
    }
    .spinner-element.classic.speed-normal.stepped {
        animation: spin var(--speed-normal) steps(8) infinite;
    }
    .spinner-element.classic.speed-fast.stepped {
        animation: spin var(--speed-fast) steps(8) infinite;
    }

    .spinner-element.square {
        width: var(--spinner-size);
        height: var(--spinner-size);
        position: relative;
        box-sizing: border-box;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .square-outer {
        width: 100%;
        height: 100%;
        border: var(--thickness) solid var(--border-color);
        background-color: var(--card-bg);
        box-shadow: 2px 2px 0 var(--shadow-color);
        box-sizing: border-box;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background-color 0.3s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
    }

    .square-inner {
        width: 42%;
        height: 42%;
        background-color: var(--badge-bg);
        border: calc(var(--thickness) * 0.7) solid var(--border-color);
        box-sizing: border-box;
        transition: border-color 0.3s ease;
    }

    .spinner-element.square.speed-slow .square-outer {
        animation: spin-clockwise var(--speed-slow) linear infinite;
    }
    .spinner-element.square.speed-normal .square-outer {
        animation: spin-clockwise var(--speed-normal) linear infinite;
    }
    .spinner-element.square.speed-fast .square-outer {
        animation: spin-clockwise var(--speed-fast) linear infinite;
    }

    .spinner-element.square.speed-slow.stepped .square-outer {
        animation: spin-clockwise var(--speed-slow) steps(8) infinite;
    }
    .spinner-element.square.speed-normal.stepped .square-outer {
        animation: spin-clockwise var(--speed-normal) steps(8) infinite;
    }
    .spinner-element.square.speed-fast.stepped .square-outer {
        animation: spin-clockwise var(--speed-fast) steps(8) infinite;
    }

    .spinner-element.square.speed-slow .square-inner {
        animation: spin-counter-clockwise var(--speed-slow) linear infinite;
    }
    .spinner-element.square.speed-normal .square-inner {
        animation: spin-counter-clockwise var(--speed-normal) linear infinite;
    }
    .spinner-element.square.speed-fast .square-inner {
        animation: spin-counter-clockwise var(--speed-fast) linear infinite;
    }

    .spinner-element.square.speed-slow.stepped .square-inner {
        animation: spin-counter-clockwise var(--speed-slow) steps(8) infinite;
    }
    .spinner-element.square.speed-normal.stepped .square-inner {
        animation: spin-counter-clockwise var(--speed-normal) steps(8) infinite;
    }
    .spinner-element.square.speed-fast.stepped .square-inner {
        animation: spin-counter-clockwise var(--speed-fast) steps(8) infinite;
    }

    .spinner-element.dots {
        display: inline-flex;
        gap: var(--dot-gap);
        align-items: center;
        justify-content: center;
        height: var(--spinner-size);
        flex-shrink: 0;
    }

    .dot {
        width: var(--dot-size);
        height: var(--dot-size);
        background-color: var(--text-color);
        border: calc(var(--thickness) * 0.5) solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        display: inline-block;
        box-sizing: border-box;
        transition:
            background-color 0.3s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
    }

    .spinner-element.dots.speed-slow .dot-1 {
        animation: dot-pulse var(--speed-slow) infinite;
        animation-delay: 0s;
    }
    .spinner-element.dots.speed-slow .dot-2 {
        animation: dot-pulse var(--speed-slow) infinite;
        animation-delay: calc(var(--speed-slow) / 4);
    }
    .spinner-element.dots.speed-slow .dot-3 {
        animation: dot-pulse var(--speed-slow) infinite;
        animation-delay: calc(var(--speed-slow) / 2);
    }

    .spinner-element.dots.speed-normal .dot-1 {
        animation: dot-pulse var(--speed-normal) infinite;
        animation-delay: 0s;
    }
    .spinner-element.dots.speed-normal .dot-2 {
        animation: dot-pulse var(--speed-normal) infinite;
        animation-delay: calc(var(--speed-normal) / 4);
    }
    .spinner-element.dots.speed-normal .dot-3 {
        animation: dot-pulse var(--speed-normal) infinite;
        animation-delay: calc(var(--speed-normal) / 2);
    }

    .spinner-element.dots.speed-fast .dot-1 {
        animation: dot-pulse var(--speed-fast) infinite;
        animation-delay: 0s;
    }
    .spinner-element.dots.speed-fast .dot-2 {
        animation: dot-pulse var(--speed-fast) infinite;
        animation-delay: calc(var(--speed-fast) / 4);
    }
    .spinner-element.dots.speed-fast .dot-3 {
        animation: dot-pulse var(--speed-fast) infinite;
        animation-delay: calc(var(--speed-fast) / 2);
    }

    .spinner-label {
        font-family: inherit;
        font-size: var(--font-size);
        font-weight: bold;
        text-transform: uppercase;
        color: var(--text-color);
        letter-spacing: 0.5px;
        margin: 0;
        text-align: center;
        transition: color 0.3s ease;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes spin-clockwise {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes spin-counter-clockwise {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(-360deg);
        }
    }

    @keyframes dot-pulse {
        0%,
        100% {
            transform: translateY(0);
            background-color: var(--text-color);
        }
        50% {
            transform: translateY(-30%);
            background-color: var(--badge-bg);
            box-shadow: 2px 2px 0 var(--shadow-color);
        }
    }
</style>
