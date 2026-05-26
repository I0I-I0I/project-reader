<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/Button.svelte"

    let {
        currentPage = $bindable(),
        totalPages,
        isPageLoading,
    } = $props<{
        currentPage: number
        totalPages: number
        isPageLoading: boolean
    }>()

    function nextValidPage() {
        if (currentPage < totalPages) {
            currentPage += 1
        }
    }

    function prevValidPage() {
        if (currentPage > 1) {
            currentPage -= 1
        }
    }

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
    <Button
        onclick={prevValidPage}
        disabled={currentPage <= 1 || isPageLoading}
        aria-label={m.prev_page()}
    >
        <span class="btn-text">{m.prev_page()}</span>
        <span class="btn-arrow">←</span>
    </Button>
    <div class="pagination-indicator">
        <span class="page-label">{m.page()}</span>
        <input
            type="number"
            value={currentPage}
            min="1"
            max={totalPages}
            onchange={handlePageInput}
            class="page-input"
            disabled={isPageLoading}
        />
        {m.of_pages({ total: totalPages })}
    </div>
    <Button
        onclick={nextValidPage}
        disabled={currentPage >= totalPages || isPageLoading}
        aria-label={m.next_page()}
    >
        <span class="btn-text">{m.next_page()}</span>
        <span class="btn-arrow">→</span>
    </Button>
</div>

<style>
    .viewer-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--viewer-footer-bg);
        border-top: 3px solid var(--border-color);
        padding: 14px 20px;
    }

    .viewer-footer :global(.action-btn) {
        background: var(--button-bg);
        min-width: 120px;
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        padding: 8px 16px;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        color: var(--text-color);
    }

    .viewer-footer :global(.action-btn:hover:not(:disabled)) {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 var(--shadow-color);
        background: var(--button-hover-bg, #faf8f5);
    }

    .viewer-footer :global(.action-btn:active:not(:disabled)) {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .viewer-footer :global(.action-btn:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 var(--shadow-color);
        transform: translate(1px, 1px);
    }

    .pagination-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 900;
        font-size: 14px;
        color: var(--badge-text, #ffffff);
        text-shadow: 1.5px 1.5px 0 var(--pagination-text-shadow);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .page-input {
        width: 55px;
        height: 32px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        text-align: center;
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        background: var(--button-bg);
        color: var(--text-color);
        outline: none;
    }

    .page-input:focus {
        border-color: var(--page-input-focus);
    }

    .page-input:disabled {
        background: var(--page-input-disabled-bg);
        cursor: not-allowed;
    }

    .btn-arrow {
        display: none;
    }

    @media (max-width: 600px) {
        .viewer-footer {
            padding: 8px 12px;
            border-top-width: 2px;
        }

        .viewer-footer :global(.action-btn) {
            min-width: 40px !important;
            width: 40px;
            height: 40px;
            padding: 0 !important;
            box-shadow: 2px 2px 0 var(--shadow-color);
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

    @media (max-width: 400px) {
        .page-label {
            display: none;
        }
    }
</style>
