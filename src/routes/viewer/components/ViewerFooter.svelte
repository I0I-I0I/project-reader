<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import { getContext } from "svelte"
    import {
        KEYMAP_CONTEXT_KEY,
        type KeymapNode,
        getShortcutHint,
    } from "$lib/stores/keymapStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"

    const keymapNode = getContext<KeymapNode>(KEYMAP_CONTEXT_KEY)

    let {
        currentPage = $bindable(),
        totalPages,
        isPageLoading,
        nextPage,
        prevPage,
    } = $props<{
        currentPage: number
        totalPages: number
        isPageLoading: boolean
        nextPage: () => void
        prevPage: () => void
    }>()

    function handlePageInput(event: Event) {
        const input = event.target as HTMLInputElement
        const value = parseInt(input.value, 10)
        if (!isNaN(value) && value >= 1 && value <= totalPages) {
            currentPage = value
        } else {
            input.value = currentPage.toString()
        }
    }
</script>

<div class="viewer-footer">
    {#if uiStore.isCompact}
        <div class="mobile-scrub-bar">
            <input
                type="range"
                min="1"
                max={totalPages}
                value={currentPage}
                oninput={(e) => {
                    const val = parseInt((e.target as HTMLInputElement).value, 10)
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        currentPage = val
                    }
                }}
                class="mobile-scrubber"
                disabled={isPageLoading}
                aria-label="Mobile page scrub slider"
            />
            <div class="mobile-progress" style="width: {(currentPage / totalPages) * 100}%"></div>
        </div>
    {/if}

    <Button
        variant="action"
        size={uiStore.isCompact ? "default" : "large"}
        onclick={prevPage}
        square={uiStore.isCompact}
        disabled={currentPage <= 1 || isPageLoading}
        aria-label={m.prev_page()}
        tooltip={m.prev_page() + getShortcutHint(keymapNode, "prev-page")}
    >
        <span class="btn-text">{m.prev_page()}</span>
        <span class="btn-arrow">←</span>
    </Button>

    <div class="pagination-indicator">
        <span class="page-label">{m.page()}</span>
        <input
            type="number"
            inputmode="numeric"
            pattern="[0-9]*"
            aria-label="Page number"
            value={currentPage}
            min="1"
            max={totalPages}
            onchange={handlePageInput}
            class="page-input"
            disabled={isPageLoading}
        />
        {m.of_pages({ total: totalPages })}
    </div>

    {#if !uiStore.isCompact}
        <div class="scrubber-container">
            <input
                type="range"
                min="1"
                max={totalPages}
                value={currentPage}
                oninput={(e) => {
                    const val = parseInt((e.target as HTMLInputElement).value, 10)
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        currentPage = val
                    }
                }}
                class="footer-scrubber"
                disabled={isPageLoading}
                aria-label="Page scrub slider"
            />
        </div>
    {/if}

    <Button
        variant="action"
        size={uiStore.isCompact ? "default" : "large"}
        onclick={nextPage}
        square={uiStore.isCompact}
        disabled={currentPage >= totalPages || isPageLoading}
        aria-label={m.next_page()}
        tooltip={m.next_page() + getShortcutHint(keymapNode, "next-page")}
    >
        <span class="btn-text">{m.next_page()}</span>
        <span class="btn-arrow">→</span>
    </Button>
</div>

<style>
    .viewer-footer {
        position: relative;
        z-index: 10;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        background: var(--danger-color);
        background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
        );
        border-top: 3px solid var(--border-color);
        padding: 18px 24px;
        padding-bottom: calc(18px + env(safe-area-inset-bottom));
        padding-left: calc(24px + env(safe-area-inset-left));
        padding-right: calc(24px + env(safe-area-inset-right));
    }

    .viewer-footer :global(.action-btn) {
        background: var(--surface-color);
        min-width: 0;
        flex: 0 1 auto;
        border: 2.5px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        padding: 10px 20px;
        font-weight: 800;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        color: var(--text-color);
    }

    @media (hover: hover) {
        .viewer-footer :global(.action-btn:hover:not(:disabled)) {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0 var(--shadow-color);
            background: var(--surface-hover-color, #faf8f5);
        }
    }

    .viewer-footer :global(.action-btn:active:not(:disabled)) {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .viewer-footer :global(.action-btn:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 2px 2px 0 var(--shadow-color);
        transform: translate(2px, 2px);
    }

    .pagination-indicator {
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 900;
        font-size: 15px;
        color: var(--danger-text-color, #ffffff);
        text-shadow: 2px 2px 0 var(--shadow-color);
        text-transform: uppercase;
        letter-spacing: 1px;
        flex-shrink: 0;
    }

    .page-input {
        width: 65px;
        height: 38px;
        border: 2.5px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        text-align: center;
        font-family: inherit;
        font-size: 16px;
        font-weight: 900;
        background: var(--surface-color);
        color: var(--text-color);
        outline: none;
        transition:
            border-color 0.1s ease,
            background-color 0.1s ease;
    }

    .page-input:focus-visible {
        border-color: var(--accent-color);
    }

    .page-input:disabled {
        background: var(--disabled-bg-color);
        cursor: not-allowed;
    }

    .btn-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
    }

    .btn-arrow {
        display: none;
    }

    @media (--mobile) {
        .viewer-footer {
            padding: 6px 12px;
            padding-bottom: calc(6px + env(safe-area-inset-bottom));
            padding-left: calc(12px + env(safe-area-inset-left));
            padding-right: calc(12px + env(safe-area-inset-right));
            border-top-width: 2px;
        }

        .viewer-footer :global(.action-btn) {
            min-width: 40px !important;
            max-width: 40px !important;
            width: 40px !important;
            min-height: 40px !important;
            max-height: 40px !important;
            height: 40px !important;
            padding: 0 !important;
            box-shadow: 2px 2px 0 var(--shadow-color);
            flex: 0 0 40px;
        }

        .btn-text {
            display: none;
        }

        .btn-arrow {
            display: inline-block;
            font-size: 18px;
            font-weight: 900;
        }

        .pagination-indicator {
            font-size: 12px;
            gap: 4px;
        }

        .page-input {
            width: 44px;
            height: 28px;
            font-size: 12px;
            border-width: 1.5px;
            box-shadow: 1.5px 1.5px 0 var(--shadow-color);
        }
    }

    @media (--mobile) {
        .page-label {
            display: none;
        }
    }

    /* Scrubber Styles */
    .scrubber-container {
        flex: 1;
        max-width: 320px;
        margin: 0 16px;
        display: flex;
        align-items: center;
    }

    .footer-scrubber {
        width: 100%;
        height: 10px;
        appearance: none;
        -webkit-appearance: none;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        box-sizing: border-box;
    }

    .footer-scrubber::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 22px;
        background: var(--accent-active-color);
        border: 2px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        cursor: pointer;
        transition: transform 0.1s ease;
    }

    .footer-scrubber::-webkit-slider-thumb:hover {
        transform: scale(1.1);
    }

    .footer-scrubber::-moz-range-thumb {
        width: 14px;
        height: 22px;
        background: var(--accent-active-color);
        border: 2px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        cursor: pointer;
        border-radius: 0;
        transition: transform 0.1s ease;
    }

    .footer-scrubber::-moz-range-thumb:hover {
        transform: scale(1.1);
    }

    /* Mobile Scrub Bar at the top edge of footer */
    .mobile-scrub-bar {
        position: absolute;
        top: -4px;
        left: 0;
        right: 0;
        height: 12px;
        z-index: 10;
        display: flex;
        align-items: center;
    }

    .mobile-scrubber {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
        z-index: 12;
    }

    .mobile-progress {
        height: 4px;
        background: var(--accent-active-color);
        border-bottom: 2px solid var(--border-color);
        transition: width 0.1s ease;
        z-index: 11;
        pointer-events: none;
    }
</style>
