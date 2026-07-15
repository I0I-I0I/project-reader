<script lang="ts">
    import Float from "$lib/core/components/ui/modal/Float.svelte"
    import SearchIcon from "$lib/core/components/icons/SearchIcon.svelte"
    import SearchNoResultsIcon from "$lib/core/components/icons/SearchNoResultsIcon.svelte"
    import { useCommands } from "$lib/features/commands/commandsStore.svelte"
    import { createPromptCommands } from "$lib/features/prompt/promptCommands"
    import type { PromptSnapshot } from "$lib/features/prompt/prompt.types"
    import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import { tick } from "svelte"
    import PromptItem from "./PromptItem.svelte"

    let results: HTMLDivElement | undefined
    let snapshot = $derived(
        promptStore.snapshot as (PromptSnapshot & { errorLabel?: string }) | null,
    )

    function focusInput(node: HTMLInputElement) {
        queueMicrotask(() => {
            node.focus()
            if (node.value) node.select()
        })
    }

    function captureResults(node: HTMLDivElement) {
        results = node
    }

    async function scrollToSelection() {
        await tick()
        const selected = results?.querySelector<HTMLElement>("[aria-selected='true']")
        selected?.scrollIntoView({ block: "nearest" })
    }

    const promptCommands = createPromptCommands({
        close: () => promptStore.close(),
        next: () => {
            promptStore.moveSelection(1)
            void scrollToSelection()
        },
        previous: () => {
            promptStore.moveSelection(-1)
            void scrollToSelection()
        },
        select: () => promptStore.selectCurrent(),
        navigateBack: () => promptStore.navigateBack(),
        canNavigateBack: () => promptStore.canNavigateBack,
        historyBack: () => promptStore.historyBack(),
        historyForward: () => promptStore.historyForward(),
    })
    const promptCommandScope = useCommands(Object.values(promptCommands), undefined, {
        keyboardBoundary: true,
    })

    function handleKeydown(event: KeyboardEvent) {
        event.stopPropagation()
        promptCommandScope.handleKeydown(event)
    }
</script>

{#if snapshot}
    <Float
        placement="top"
        backdrop="blur"
        onBackdropPointerDown={() => promptStore.close()}
        role="dialog"
        ariaModal={true}
        ariaLabel={snapshot.request.placeholder ?? m.prompt_search_aria()}
    >
        <div class="prompt-container" role="presentation" onkeydown={handleKeydown}>
            <form
                class={["input-wrapper", snapshot.isLoading && "loading"]}
                onsubmit={(event) => {
                    event.preventDefault()
                    void promptStore.selectCurrent()
                }}
            >
                <SearchIcon class="search-icon" />
                <input
                    {@attach focusInput}
                    class="prompt-input"
                    type="search"
                    value={snapshot.query}
                    placeholder={snapshot.request.placeholder ?? m.prompt_placeholder()}
                    aria-label={m.prompt_search_aria()}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="prompt-results-list"
                    aria-expanded={snapshot.items.length > 0}
                    aria-activedescendant={snapshot.selectedIndex >= 0
                        ? `prompt-result-${snapshot.selectedIndex}`
                        : undefined}
                    oninput={(event) => promptStore.setQuery(event.currentTarget.value)}
                />
                <button
                    type="button"
                    class="close-btn"
                    onclick={() => promptStore.close()}
                    aria-label={m.prompt_close_aria()}>✕</button
                >
            </form>

            <div
                {@attach captureResults}
                id="prompt-results-list"
                class="results-list"
                role="listbox"
                aria-label={m.prompt_search_aria()}
            >
                {#if snapshot.items.length > 0}
                    {#each snapshot.items as item, index (item.id)}
                        <PromptItem
                            id={`prompt-result-${index}`}
                            {item}
                            isSelected={snapshot.selectedIndex === index}
                            onclick={() => {
                                const offset = index - snapshot.selectedIndex
                                if (offset) promptStore.moveSelection(offset)
                                void promptStore.selectCurrent()
                            }}
                        />
                    {/each}
                {:else}
                    <div class="empty-state">
                        {#if snapshot.isLoading}
                            <span class="loading-mark" aria-hidden="true"></span>
                            <p>{snapshot.request.loadingLabel ?? "Loading…"}</p>
                        {:else if snapshot.errorLabel}
                            <SearchNoResultsIcon />
                            <p>{snapshot.errorLabel}</p>
                        {:else}
                            <SearchNoResultsIcon />
                            <p>
                                {snapshot.request.emptyLabel ??
                                    m.prompt_no_results({ value: snapshot.query })}
                            </p>
                        {/if}
                    </div>
                {/if}
            </div>

            <footer>
                <span>{snapshot.items.length} {m.prompt_suggestions().toLocaleLowerCase()}</span>
                <span class="footer-help">
                    <span class="key-group">
                        {#each ["↓", "C-j", "C-n"] as key (key)}
                            <kbd>{key}</kbd>
                        {/each}
                        <span> / </span>
                        {#each ["↑", "C-k", "C-p"] as key (key)}
                            <kbd>{key}</kbd>
                        {/each}
                        {m.prompt_help_navigate()}
                    </span>
                    <span class="key-group"
                        ><kbd>A-n</kbd> <kbd>A-p</kbd> {m.prompt_help_history()}</span
                    >
                    <span class="key-group"><kbd>↵</kbd> {m.prompt_help_select()}</span>
                    <span class="key-group"><kbd>esc</kbd> {m.prompt_help_close()}</span>
                </span>
            </footer>
        </div>
    </Float>
{/if}

<style>
    .prompt-container {
        display: flex;
        width: 100%;
        flex-direction: column;
        overflow: hidden;
        background: var(--surface-color);
    }

    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        padding: 1rem;
        border-bottom: 2px solid var(--border-color);
    }

    .input-wrapper::after {
        position: absolute;
        right: 0;
        bottom: -2px;
        left: 0;
        height: 2px;
        background: linear-gradient(90deg, #0984e3, #00b894, #e84393);
        content: "";
        opacity: 0;
    }

    .input-wrapper.loading::after {
        opacity: 1;
        animation: loading 1.2s ease-in-out infinite alternate;
    }

    @keyframes loading {
        to {
            filter: hue-rotate(80deg);
        }
    }

    :global(.search-icon) {
        width: 1.25rem;
        height: 1.25rem;
        margin-right: 0.75rem;
        opacity: 0.6;
    }

    .prompt-input {
        min-width: 0;
        flex: 1;
        padding: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--text-color);
        font: inherit;
        font-size: var(--font-size-2xl);
    }

    .close-btn {
        padding: 0.25rem;
        border: 0;
        background: transparent;
        color: var(--text-color);
        cursor: pointer;
        font-size: var(--font-size-xl);
        opacity: 0.55;
    }

    .results-list {
        display: flex;
        max-height: 380px;
        flex-direction: column;
        gap: 0.25rem;
        overflow-y: auto;
        padding: 0.5rem;
    }

    .empty-state {
        display: grid;
        min-height: 10rem;
        place-items: center;
        align-content: center;
        color: var(--text-color);
        opacity: 0.65;
    }

    :global(.empty-state svg) {
        width: 3rem;
        height: 3rem;
    }

    .loading-mark {
        width: 2rem;
        height: 2rem;
        border: 3px solid var(--border-color);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(1turn);
        }
    }

    footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.65rem 1rem;
        border-top: 2px solid var(--border-color);
        background: var(--surface-hover-color);
        color: var(--text-color);
        font-size: var(--font-size-sm);
        opacity: 0.8;
    }

    .footer-help,
    .key-group {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .footer-help {
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.35rem 0.65rem;
    }

    footer kbd {
        padding: 0.1rem 0.25rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-family: ui-monospace, monospace;
    }

    @media (--prompt) {
        .results-list {
            max-height: 60dvh;
        }

        footer span:last-child {
            display: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .input-wrapper.loading::after,
        .loading-mark {
            animation: none;
        }
    }
</style>
