<script lang="ts">
    import { onMount } from "svelte"

    import type { Snippet } from "svelte"
    import Float from "./Float.svelte"

    interface Props {
        onClose: () => void
        title?: string
        closeLabel?: string
        header?: Snippet
        children?: Snippet
        footer?: Snippet
        autofocusClose?: boolean
    }

    let {
        onClose,
        title = "",
        closeLabel = "Close",
        header,
        children,
        footer,
        autofocusClose = true,
    }: Props = $props()

    onMount(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null

        if (autofocusClose) {
            const closeBtn = document.querySelector(".close-btn") as HTMLElement | null
            closeBtn?.focus()
        } else if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }

        return () => {
            previouslyFocused?.focus()
        }
    })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<Float {onClose}>
    {#if header}
        {@render header()}
    {:else}
        <div class="modal-header">
            <h2 id="modal-title" class="modal-title">
                {title}
            </h2>
            <button class="close-btn" onclick={onClose} aria-label={closeLabel}> &times; </button>
        </div>
    {/if}

    <div class="modal-body">
        {@render children?.()}
    </div>

    {#if footer}
        <div class="modal-footer">
            {@render footer()}
        </div>
    {/if}
</Float>

<style>
    .modal-body {
        overflow-y: hidden;
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-color);
    }

    @media (--mobile) {
        .modal-header {
            padding: 12px 16px;
        }
    }

    .modal-title {
        margin: 0;
        font-size: var(--font-size-3xl);
        font-weight: 800;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        color: var(--text-color);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: var(--font-size-5xl);
        font-weight: bold;
        color: var(--text-color);
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        transition: transform 0.1s ease;
    }

    @media (hover: hover) {
        .close-btn:hover {
            transform: scale(1.15);
        }
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

    @media (--mobile) {
        .modal-footer {
            padding: 12px 16px;
        }
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
