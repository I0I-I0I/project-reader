<script lang="ts">
    import { getContext } from "svelte"
    import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
    import {
        useCommands,
        type CommandNode,
        KeyboardHandler,
    } from "$lib/features/prompt/stores/commandsStore.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/core/components/ui/Modal.svelte"

    interface Props {
        onClose: () => void
    }

    let { onClose }: Props = $props()

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode()

    let contentElement = $state<HTMLElement | null>(null)
    let searchQuery = $state("")
    let searchInputRef = $state<HTMLInputElement | null>(null)

    const keymaps = (() => {
        if (!activeNodeBeforeOpen) return []
        const allBindings = activeNodeBeforeOpen.getAllCommands()

        const seen = new Set<string>()
        return allBindings
            .filter((b) => {
                if (!b.description || !b.keys) return false
                const keyStr = Array.isArray(b.keys)
                    ? b.keys.map((k) => KeyboardHandler.normalize(k)).join(",")
                    : KeyboardHandler.normalize(b.keys)
                if (seen.has(keyStr)) return false
                seen.add(keyStr)
                return true
            })
            .map((b) => ({
                keys: b.keys!,
                description: b.description,
            }))
    })()

    let filteredKeymaps = $derived(
        keymaps.filter(
            (k) =>
                k.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (Array.isArray(k.keys)
                    ? k.keys.some((key) => key.toLowerCase().includes(searchQuery.toLowerCase()))
                    : k.keys.toLowerCase().includes(searchQuery.toLowerCase())),
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
                behavior: !event.repeat && settingsStore.animations ? "smooth" : "auto",
            })
        } else if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
            event.preventDefault()
            contentElement?.scrollBy({
                top: -80,
                behavior: !event.repeat && settingsStore.animations ? "smooth" : "auto",
            })
        }
    }

    useCommands(
        [
            {
                id: "close",
                keys: ["escape", "ctrl+c", "ctrl+["],
                description: m.keymap_close_help(),
                action: (e) => {
                    e.preventDefault()
                    onClose()
                },
                allowInInputs: true,
            },
            {
                id: "close-alt",
                keys: ["q", "?"],
                action: (e) => {
                    e.preventDefault()
                    onClose()
                },
                description: m.keymap_close_help(),
                allowInInputs: false,
            },
            {
                id: "search",
                keys: "/",
                description: m.keymap_search_shortcuts(),
                action: (e) => {
                    e.preventDefault()
                    searchInputRef?.focus()
                    searchInputRef?.select()
                },
            },
            {
                id: "scroll-down",
                keys: ["arrowdown", "j"],
                description: m.keymap_scroll_down(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: 80,
                        behavior: !e.repeat && settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                id: "scroll-up",
                keys: ["arrowup", "k"],
                description: m.keymap_scroll_up(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: -80,
                        behavior: !e.repeat && settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                id: "scroll-page-down",
                keys: ["pagedown", "d"],
                description: m.keymap_scroll_page_down(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: 200,
                        behavior: !e.repeat && settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
            {
                id: "scroll-page-up",
                keys: ["pageup", "u"],
                description: m.keymap_scroll_page_up(),
                action: (e) => {
                    e.preventDefault()
                    contentElement?.scrollBy({
                        top: -200,
                        behavior: !e.repeat && settingsStore.animations ? "smooth" : "auto",
                    })
                },
            },
        ],
        activeNodeBeforeOpen,
    )

    function formatKeys(keyStr: string): string[] {
        return KeyboardHandler.getFormattedParts(keyStr)
    }

    function getShortcutsArray(keys: string | string[]): string[] {
        return Array.isArray(keys) ? keys : [keys]
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
                        aria-label={m.clear_search_aria()}
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
                                {#each getShortcutsArray(keymap.keys) as shortcut, idx}
                                    {#if idx > 0}
                                        <span class="shortcut-separator">/</span>
                                    {/if}
                                    {#each formatKeys(shortcut) as key}
                                        <kbd class="key-badge">{key}</kbd>
                                    {/each}
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

    @media (hover: hover) {
        .shortcut-row:hover {
            background: var(--surface-hover-color);
        }
    }

    .key-combo {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .key-badge {
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
        font-size: var(--font-size-base);
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        border-radius: var(--radius-md);
        padding: 4px 8px;
        min-width: 20px;
        text-align: center;
        text-transform: uppercase;
        display: inline-block;
    }

    .shortcut-separator {
        opacity: 0.5;
        font-weight: 500;
        margin: 0 2px;
        color: var(--text-color);
        font-size: var(--font-size-base);
    }

    .shortcut-desc {
        font-size: var(--font-size-xl);
        color: var(--text-color);
        text-align: right;
        font-weight: 500;
    }

    .footer-hint {
        font-size: var(--font-size-sm);
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
        font-size: var(--font-size-base);
        font-weight: 700;
        background: var(--surface-color);
        color: var(--text-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        border-radius: var(--radius-md);
    }

    @media (max-width: 640px) {
        .search-input {
            font-size: var(--font-size-xl);
        }
    }

    .search-input:focus-visible {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-color: var(--border-color);
    }

    .clear-search-btn {
        position: absolute;
        right: 32px;
        background: none;
        border: none;
        font-size: var(--font-size-3xl);
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

    @media (hover: hover) {
        .clear-search-btn:hover {
            opacity: 1;
        }
    }

    .empty-state {
        text-align: center;
        padding: 32px 0;
        opacity: 0.6;
        font-style: italic;
    }
</style>
