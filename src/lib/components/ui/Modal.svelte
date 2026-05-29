<script lang="ts">
    import { onMount } from "svelte"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import { fade, scale } from "svelte/transition"
    import type { Snippet } from "svelte"

    interface Props {
        onClose: () => void
        title?: string
        closeLabel?: string
        header?: Snippet
        children?: Snippet
        footer?: Snippet
    }

    let { onClose, title = "", closeLabel = "Close", header, children, footer }: Props = $props()

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

    onMount(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null

        const closeBtn = document.querySelector(".close-btn") as HTMLElement | null
        closeBtn?.focus()

        return () => {
            previouslyFocused?.focus()
        }
    })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
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
        class="modal-card"
        transition:scale={{ duration: settingsStore.animations ? 150 : 0, start: 0.95 }}
    >
        {#if header}
            {@render header()}
        {:else}
            <div class="modal-header">
                <h2 id="modal-title" class="modal-title">
                    {title}
                </h2>
                <button class="close-btn" onclick={onClose} aria-label={closeLabel}>
                    &times;
                </button>
            </div>
        {/if}

        {@render children?.()}

        {#if footer}
            <div class="modal-footer">
                {@render footer()}
            </div>
        {/if}
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

    .modal-card {
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

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-color);
    }

    .modal-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        color: var(--text-color);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.75rem;
        font-weight: bold;
        color: var(--text-color);
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        transition: transform 0.1s ease;
    }

    .close-btn:hover {
        transform: scale(1.15);
    }

    .close-btn:active {
        transform: scale(0.95);
    }

    .modal-footer {
        padding: 12px 24px;
        border-top: 2px solid var(--border-color);
        background: var(--bg-color);
        text-align: center;
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
</style>
