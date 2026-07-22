<script lang="ts">
    import { fly } from "svelte/transition"
    import type { NotificationData } from "../state.svelte"

    let {
        notification,
        animations = true,
        viewerMode = false,
    } = $props<{
        notification?: NotificationData | null
        animations?: boolean
        viewerMode?: boolean
    }>()

    let width = $state(220)
    let pathD = $derived(`M ${width} 2.5 L 22.5 2.5 L 42.5 35 L 22.5 67.5 L ${width} 67.5`)
</script>

{#if notification}
    <div
        class="floating-notification"
        class:viewer-mode={viewerMode}
        bind:clientWidth={width}
        transition:fly={{ x: 50, duration: animations ? 250 : 0 }}
    >
        <svg class="notification-svg" {width} height="70" viewBox="0 0 {width} 70">
            <path
                d={pathD}
                fill="var(--surface-color)"
                stroke="var(--accent-color)"
                stroke-width="5"
                stroke-linejoin="miter"
            />
        </svg>
        {#key notification.line1}
            <div class="notification-text" in:fly={{ y: 8, duration: animations ? 120 : 0 }}>
                <div class="line1">{notification.line1}</div>
                <div class="line2">{notification.line2}</div>
            </div>
        {/key}
    </div>
{/if}

<style>
    .floating-notification {
        position: fixed;
        top: calc(24px + env(safe-area-inset-top));
        right: max(4px, env(safe-area-inset-right));
        z-index: 9999;
        display: inline-block;
        width: max-content;
        min-width: 180px;
        max-width: calc(100dvw - env(safe-area-inset-left) - env(safe-area-inset-right) - 10px);
        height: 70px;
        pointer-events: none;
        filter: drop-shadow(-6px 6px 0 var(--shadow-color));
        box-sizing: border-box;
    }

    .floating-notification.viewer-mode {
        top: calc(68px + env(safe-area-inset-top));
    }

    .notification-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: var(--z-1);
    }

    .notification-text {
        position: relative;
        z-index: var(--z-2);
        width: 100%;
        min-width: 0;
        max-width: 100%;
        height: 70px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding-left: 55px;
        padding-right: 20px;
        box-sizing: border-box;
        font-family: inherit;
        overflow: hidden;
    }

    .line1,
    .line2 {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .line1 {
        font-size: var(--font-size-2xl);
        font-weight: 900;
        color: var(--text-color);
        line-height: 1.2;
    }

    .line2 {
        font-size: var(--font-size-sm);
        font-weight: 900;
        color: var(--faded-text-color);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        line-height: 1.2;
        margin-top: 2px;
    }

    @media (max-width: 800px) {
        .floating-notification {
            top: calc(68px + env(safe-area-inset-top));
        }

        .floating-notification.viewer-mode {
            top: calc(64px + env(safe-area-inset-top));
        }
    }

    @media (--phone) {
        .floating-notification {
            min-width: 160px;
        }

        .notification-text {
            padding-right: 12px;
            padding-left: 50px;
        }

        .line1 {
            font-size: var(--font-size-xl);
        }

        .line2 {
            font-size: var(--font-size-xs);
            letter-spacing: 0.06em;
        }
    }
</style>
