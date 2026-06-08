<script lang="ts">
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import SearchIcon from "$lib/components/icons/SearchIcon.svelte"
    import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte"
    import * as m from "$lib/paraglide/messages"
    import { onMount } from "svelte"
    import { fly } from "svelte/transition"
    import { settingsStore } from "$lib/stores/settingsStore.svelte"

    let inputEl = $state<HTMLInputElement | null>(null)

    onMount(() => {
        inputEl?.focus()
    })

    function handleClose() {
        uiStore.isSearchModeActive = false
        searchStore.setQuery("")
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            e.preventDefault()
            handleClose()
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (e.shiftKey) {
                searchStore.prev()
            } else {
                searchStore.next()
            }
        }
    }
</script>

<div
    class="search-toolbar"
    transition:fly={{ y: 24, duration: settingsStore.animations ? 200 : 0 }}
    role="search"
>
    <div class="search-input-wrapper">
        <SearchIcon class="search-icon" />
        <input
            bind:this={inputEl}
            type="search"
            value={searchStore.query}
            oninput={(e) => searchStore.setQuery(e.currentTarget.value)}
            onkeydown={handleKeyDown}
            placeholder={m.search_pdf ? m.search_pdf() : "Search PDF..."}
            aria-label={m.search_pdf ? m.search_pdf() : "Search PDF..."}
            class="search-input"
        />
        {#if searchStore.query}
            <button
                type="button"
                class="clear-btn"
                onclick={() => {
                    searchStore.setQuery("")
                    inputEl?.focus()
                }}
                aria-label={m.clear_search_aria ? m.clear_search_aria() : "Clear search"}
            >
                ✕
            </button>
        {/if}
    </div>

    <div class="search-controls">
        <span class="matches-count">
            {searchStore.matches.length > 0 ? searchStore.currentMatchIndex + 1 : 0} / {searchStore
                .matches.length}
        </span>

        <div class="divider"></div>

        <Button
            variant="ghost"
            size="small"
            square={true}
            onclick={() => searchStore.prev()}
            disabled={searchStore.matches.length === 0}
            aria-label={m.keymap_prev_match ? m.keymap_prev_match() : "Previous match"}
            tooltip={m.keymap_prev_match ? m.keymap_prev_match() : "Previous match"}
            class="nav-btn prev-btn"
        >
            <ChevronIcon style="transform: rotate(180deg);" />
        </Button>

        <Button
            variant="ghost"
            size="small"
            square={true}
            onclick={() => searchStore.next()}
            disabled={searchStore.matches.length === 0}
            aria-label={m.keymap_next_match ? m.keymap_next_match() : "Next match"}
            tooltip={m.keymap_next_match ? m.keymap_next_match() : "Next match"}
            class="nav-btn next-btn"
        >
            <ChevronIcon />
        </Button>

        <div class="divider"></div>

        <Button
            variant="close"
            size="small"
            square={true}
            onclick={handleClose}
            aria-label={m.prompt_close_aria ? m.prompt_close_aria() : "Close"}
            tooltip={m.prompt_close_aria ? m.prompt_close_aria() : "Close"}
            class="close-btn"
        >
            ✕
        </Button>
    </div>
</div>

<style>
    .search-toolbar {
        position: fixed;
        bottom: calc(24px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        z-index: 500;

        display: flex;
        align-items: center;
        gap: 12px;

        width: calc(100% - 32px);
        max-width: 480px;
        padding: 8px 12px;

        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        border-radius: 4px;
        box-sizing: border-box;
    }

    .search-input-wrapper {
        display: flex;
        align-items: center;
        flex: 1;
        background: var(--bg-color, #f5f0e1);
        border: 2px solid var(--border-color);
        padding: 6px 10px;
        gap: 8px;
        min-width: 0;
        box-sizing: border-box;
    }

    .search-input-wrapper:focus-within {
        border-color: var(--accent-active-color);
        background: var(--surface-hover-color);
    }

    :global(.search-icon) {
        width: 16px;
        height: 16px;
        color: var(--text-color);
        opacity: 0.6;
        flex-shrink: 0;
    }

    .search-input {
        flex: 1;
        border: none;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color);
        outline: none;
        padding: 0;
        min-width: 0;
    }

    .search-input::placeholder {
        color: var(--text-color);
        opacity: 0.4;
    }

    .search-input::-webkit-search-decoration,
    .search-input::-webkit-search-cancel-button,
    .search-input::-webkit-search-results-button,
    .search-input::-webkit-search-results-decoration {
        display: none;
    }

    .clear-btn {
        background: transparent;
        border: none;
        color: var(--text-color);
        opacity: 0.5;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        padding: 2px 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .clear-btn:hover {
        opacity: 1;
    }

    .search-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .matches-count {
        font-size: 13px;
        font-weight: 800;
        color: var(--text-color);
        font-variant-numeric: tabular-nums;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        user-select: none;
        white-space: nowrap;
        padding: 0 4px;
    }

    .divider {
        width: 2px;
        height: 20px;
        background: var(--border-color);
        opacity: 0.2;
    }

    :global(.search-controls .button) {
        min-height: 28px !important;
        max-height: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
        max-width: 28px !important;
        width: 28px !important;
        border-width: 2px !important;
        box-shadow: 1.5px 1.5px 0 var(--shadow-color) !important;
        padding: 0 !important;
    }

    @media (hover: hover) {
        :global(.search-controls .button:hover:not(:disabled)) {
            transform: translate(-1px, -1px) !important;
            box-shadow: 2px 2px 0 var(--shadow-color) !important;
        }
    }

    :global(.search-controls .button:active:not(:disabled)) {
        transform: translate(1px, 1px) !important;
        box-shadow: 0.5px 0.5px 0 var(--shadow-color) !important;
    }

    @media (--mobile) {
        .search-toolbar {
            bottom: calc(12px + env(safe-area-inset-bottom));
            width: calc(100% - 16px);
            padding: 6px 8px;
            gap: 8px;
        }

        .search-input-wrapper {
            padding: 4px 8px;
        }

        .matches-count {
            font-size: 12px;
        }
    }
</style>
