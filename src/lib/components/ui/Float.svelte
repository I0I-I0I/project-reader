<script lang="ts">
    import { settingsStore } from "$lib/settingsStore.svelte"
    import type { Snippet } from "svelte"
    import { fade, scale } from "svelte/transition"

    interface Props {
        onClose: () => void
        children: Snippet
    }

    const { onClose, children }: Props = $props()

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
        height: 100vh;
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

    .float-card {
        background: var(--card-bg);
        border: 3px solid var(--border-color);
        box-shadow: 6px 6px 0 var(--shadow-color);
        width: 100%;
        max-width: 580px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 4px;
        font-family: inherit;
        animation: card-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
</style>
