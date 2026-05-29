<script lang="ts">
    import { getContext } from "svelte"
    import { settingsStore } from "$lib/settingsStore.svelte"
    import { useKeymap, type KeymapNode } from "$lib/keymaps"
    import * as m from "$lib/paraglide/messages"
    import Modal from "./ui/Modal.svelte"

    interface Props {
        onClose: () => void
    }

    let { onClose }: Props = $props()

    const getActiveNode = getContext<() => KeymapNode>("get_active_keymap_node")
    const activeNodeBeforeOpen = getActiveNode()

    let contentElement = $state<HTMLElement | null>(null)
    let searchQuery = $state("")
    let searchInputRef = $state<HTMLInputElement | null>(null)

    const keymaps = (() => {
        if (!activeNodeBeforeOpen) return []
        const allBindings = activeNodeBeforeOpen.getAllKeymaps()

        const seen = new Set<string>()
        return allBindings
            .filter((b) => {
                if (!b.description || seen.has(b.keys)) return false
                seen.add(b.keys)
                return true
            })
            .map((b) => ({
                keys: b.keys,
                description: b.description,
            }))
    })()

    let filteredKeymaps = $derived(
        keymaps.filter(
            (k) =>
                k.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                k.keys.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault()
            searchInputRef?.blur()
        } else if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
            event.preventDefault()
            contentElement?.scrollBy({
                top: 80,
                behavior: settingsStore.animations ? "smooth" : "auto",
            })
        } else if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
            event.preventDefault()
            contentElement?.scrollBy({
                top: -80,
                behavior: settingsStore.animations ? "smooth" : "auto",
            })
        }
    }

    useKeymap(
        [
            {
                keys: "q",
                description: m.keymap_close_help(),
                action: (e) => {
                    e.preventDefault()
                    onClose()
                },
            },
            {
                keys: "escape",
                description: m.keymap_close_help(),
                action: (e) => {
                    e.preventDefault()
                    onClose()
                },
            },
            {
                keys: "?",
                description: m.keymap_close_help(),
                action: (e) => {
                    e.preventDefault()
                    onClose()
                },
            },
            {
                keys: "/",
                description: m.keymap_search_shortcuts(),
                action: (e) => {
                    e.preventDefault()
                    searchInputRef?.focus()
                    searchInputRef?.select()
                },
            },
            {
                keys: "j",
                description: m.keymap_scroll_down(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: 80,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "k",
                description: m.keymap_scroll_up(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: -80,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "arrowdown",
                description: m.keymap_scroll_down(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: 80,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "arrowup",
                description: m.keymap_scroll_up(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: -80,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "d",
                description: m.keymap_scroll_page_down(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: 200,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "pagedown",
                description: m.keymap_scroll_page_down(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: 200,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "u",
                description: m.keymap_scroll_page_up(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: -200,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                keys: "pageup",
                description: m.keymap_scroll_page_up(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: -200,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
        ],
        activeNodeBeforeOpen,
    )

    function formatKeys(keyStr: string): string[] {
        if (keyStr === "+") return ["+"]
        if (keyStr.endsWith("++")) {
            const base = keyStr.slice(0, -2)
            return [...base.split("+").map((k) => k.trim()), "+"]
        }
        return keyStr.split("+").map((k) => k.trim())
    }
</script>

<Modal {onClose} title={m.keymap_modal_title()} closeLabel={m.close()}>
    {#snippet children()}
        {#if keymaps.length > 0}
            <div class="modal-search">
                <input
                    bind:this={searchInputRef}
                    type="text"
                    bind:value={searchQuery}
                    placeholder="{m.keymap_search_shortcuts()} (/)"
                    class="search-input"
                    onkeydown={handleSearchKeydown}
                />
                {#if searchQuery}
                    <button
                        class="clear-search-btn"
                        onclick={() => {
                            searchQuery = ""
                            searchInputRef?.focus()
                        }}
                        aria-label="Clear search"
                    >
                        &times;
                    </button>
                {/if}
            </div>
        {/if}

        <div class="modal-content" bind:this={contentElement}>
            {#if filteredKeymaps.length === 0}
                <div class="empty-state">
                    {#if searchQuery}
                        {m.keymap_no_matching_shortcuts()}
                    {:else}
                        {m.keymap_no_shortcuts()}
                    {/if}
                </div>
            {:else}
                <div class="shortcuts-grid">
                    {#each filteredKeymaps as keymap}
                        <div class="shortcut-row">
                            <div class="key-combo">
                                {#each formatKeys(keymap.keys) as key}
                                    <kbd class="key-badge">{key}</kbd>
                                {/each}
                            </div>
                            <span class="shortcut-desc">{keymap.description}</span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/snippet}

    {#snippet footer()}
        <span class="footer-hint">{m.keymap_modal_close_hint()}</span>
    {/snippet}
</Modal>

<style>
    .modal-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
    }

    .shortcuts-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
    }

    .shortcut-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px dashed var(--border-color);
        transition: background 0.15s ease;
        gap: 16px;
    }

    .shortcut-row:hover {
        background: var(--card-hover-bg);
    }

    .key-combo {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .key-badge {
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
        font-size: 0.85rem;
        font-weight: 700;
        background: var(--button-bg);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        border-radius: 4px;
        padding: 4px 8px;
        min-width: 20px;
        text-align: center;
        text-transform: uppercase;
        display: inline-block;
    }

    .shortcut-desc {
        font-size: 0.95rem;
        color: var(--text-color);
        text-align: right;
        font-weight: 500;
    }

    .footer-hint {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
    }

    .modal-search {
        position: relative;
        padding: 12px 24px;
        background: var(--bg-color);
        border-bottom: 2px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
    }

    .search-input {
        width: 100%;
        padding: 8px 36px 8px 12px;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 700;
        background: var(--button-bg);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        border-radius: 4px;
    }

    .search-input:focus {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-color: var(--border-color);
    }

    .clear-search-btn {
        position: absolute;
        right: 32px;
        background: none;
        border: none;
        font-size: 20px;
        font-weight: 800;
        cursor: pointer;
        color: var(--text-color);
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.1s ease;
    }

    .clear-search-btn:hover {
        opacity: 1;
    }

    .empty-state {
        text-align: center;
        padding: 32px 0;
        opacity: 0.6;
        font-style: italic;
    }
</style>
