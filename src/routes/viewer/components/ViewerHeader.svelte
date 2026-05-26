<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/Button.svelte"
    import MenuIcon from "$lib/components/icons/MenuIcon.svelte"
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import MinusIcon from "$lib/components/icons/MinusIcon.svelte"
    import SinglePageIcon from "$lib/components/icons/SinglePageIcon.svelte"
    import SplitPagesIcon from "$lib/components/icons/SplitPagesIcon.svelte"
    import ScrollPagesIcon from "$lib/components/icons/ScrollPagesIcon.svelte"

    let {
        name,
        isLoaded,
        isOutlineOpen = $bindable(),
        onClose,
        scale = $bindable(1.5),
        layoutMode = $bindable("single"),
    } = $props<{
        name: string
        isLoaded: boolean
        isOutlineOpen?: boolean
        scale?: number
        layoutMode?: "single" | "split" | "scroll"
        onClose: () => void
    }>()

    let isLayoutDropdownOpen = $state(false)
    let dropdownEl = $state<HTMLElement | null>(null)

    function upScale() {
        scale = Math.min(scale + 0.25, 3)
    }

    function downScale() {
        scale = Math.max(scale - 0.25, 0.5)
    }

    function toggleLayoutDropdown() {
        isLayoutDropdownOpen = !isLayoutDropdownOpen
    }

    $effect(() => {
        if (!isLayoutDropdownOpen) return

        function handleClickOutside(event: MouseEvent) {
            if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
                isLayoutDropdownOpen = false
            }
        }

        document.addEventListener("click", handleClickOutside)
        return () => {
            document.removeEventListener("click", handleClickOutside)
        }
    })
</script>

<div class="viewer-header">
    <div class="doc-info">
        {#if isLoaded}
            <button
                class="burger-btn"
                onclick={() => (isOutlineOpen = !isOutlineOpen)}
                aria-label={m.outline()}
                class:open={isOutlineOpen}
            >
                <MenuIcon />
            </button>
        {/if}
        <span class="file-badge">PDF</span>
        <span class="file-name" title={name}>{name || "document.pdf"}</span>
    </div>
    <div class="header-actions">
        <div class="layout-switcher" bind:this={dropdownEl}>
            <button
                class="layout-btn"
                onclick={toggleLayoutDropdown}
                aria-expanded={isLayoutDropdownOpen}
                aria-haspopup="listbox"
                aria-label={m.layout()}
            >
                <div class="layout-btn-content">
                    {#if layoutMode === "single"}
                        <SinglePageIcon />
                    {:else if layoutMode === "split"}
                        <SplitPagesIcon />
                    {:else}
                        <ScrollPagesIcon />
                    {/if}
                    <span class="layout-label">
                        {#if layoutMode === "single"}
                            {m.single_page()}
                        {:else if layoutMode === "split"}
                            {m.split_pages()}
                        {:else}
                            {m.scroll_pages()}
                        {/if}
                    </span>
                </div>
                <svg
                    class="chevron"
                    class:open={isLayoutDropdownOpen}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {#if isLayoutDropdownOpen}
                <ul class="layout-dropdown" role="listbox">
                    <li>
                        <button
                            class="dropdown-item"
                            class:active={layoutMode === "single"}
                            onclick={() => {
                                layoutMode = "single"
                                isLayoutDropdownOpen = false
                            }}
                        >
                            <SinglePageIcon />
                            {m.single_page()}
                        </button>
                    </li>
                    <li>
                        <button
                            class="dropdown-item"
                            class:active={layoutMode === "split"}
                            onclick={() => {
                                layoutMode = "split"
                                isLayoutDropdownOpen = false
                            }}
                        >
                            <SplitPagesIcon />
                            {m.split_pages()}
                        </button>
                    </li>
                    <li>
                        <button
                            class="dropdown-item"
                            class:active={layoutMode === "scroll"}
                            onclick={() => {
                                layoutMode = "scroll"
                                isLayoutDropdownOpen = false
                            }}
                        >
                            <ScrollPagesIcon />
                            {m.scroll_pages()}
                        </button>
                    </li>
                </ul>
            {/if}
        </div>

        <div class="zoom-controls">
            <Button onclick={downScale} aria-label={m.zoom_out()}>
                <MinusIcon />
            </Button>
            <Button onclick={upScale} aria-label={m.zoom_in()}>
                <PlusIcon />
            </Button>
        </div>

        <Button onclick={onClose} aria-label={m.close_document()}>
            <span class="close-text">{m.close()} ×</span>
            <span class="close-icon">×</span>
        </Button>
    </div>
</div>

<style>
    .viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--viewer-header-bg);
        background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
        );
        border-bottom: 3px solid var(--border-color);
        padding: 16px 24px;
        color: var(--doc-text-color);
        position: relative;
    }

    .doc-info {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
    }

    .file-badge {
        background: var(--doc-file-badge-bg);
        color: var(--doc-file-badge-text);
        font-size: 11px;
        font-weight: 900;
        padding: 4px 10px;
        border-radius: 2px;
        letter-spacing: 1px;
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .file-name {
        font-size: 16px;
        font-weight: 900;
        color: var(--doc-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .zoom-controls {
        display: flex;
        gap: 8px;
    }

    .layout-switcher {
        position: relative;
    }

    .layout-btn {
        background: var(--button-bg);
        font-size: 12px;
        font-weight: 800;
        padding: 8px 14px;
        border: 2.5px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        text-transform: uppercase;
    }

    .layout-btn-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .layout-btn-content :global(svg) {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }

    .layout-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--button-hover-bg, #faf8f5);
    }

    .layout-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .chevron {
        transition: transform 0.2s ease;
    }

    .chevron.open {
        transform: rotate(180deg);
    }

    .layout-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 1000;
        list-style: none;
        margin: 0;
        padding: 4px;
        border: 2px solid var(--border-color);
        background: var(--card-bg, #ffffff);
        box-shadow: 4px 4px 0 var(--shadow-color);
        min-width: 160px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        background: none;
        border: none;
        color: var(--text-color);
        padding: 10px 14px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        text-align: left;
        cursor: pointer;
        transition: all 0.1s ease;
        gap: 10px;
    }

    .dropdown-item :global(svg) {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }

    .dropdown-item:hover {
        background: var(--viewer-accent);
    }

    .dropdown-item.active {
        background: var(--viewer-accent-active);
    }

    .header-actions :global(.action-btn) {
        background: var(--button-bg);
        font-size: 12px;
        font-weight: 800;
        padding: 8px 14px;
        border: 2.5px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .header-actions :global(.action-btn:hover) {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--button-hover-bg, #faf8f5);
    }

    .header-actions :global(.action-btn:active) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .burger-btn {
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        color: var(--text-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        margin-right: 8px;
        flex-shrink: 0;
    }

    .burger-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--viewer-accent);
    }

    .burger-btn:active,
    .burger-btn.open {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--viewer-accent-active);
    }

    .close-icon {
        display: none;
    }

    @media (max-width: 768px) {
        .layout-label {
            display: none;
        }

        .layout-btn {
            padding: 8px;
        }
    }

    @media (max-width: 600px) {
        .viewer-header {
            padding: 8px 12px;
            border-bottom-width: 2px;
        }

        .burger-btn {
            width: 32px;
            height: 32px;
            margin-right: 4px;
        }

        .file-name {
            font-size: 12px;
        }

        .file-badge {
            font-size: 9px;
            padding: 2px 6px;
        }

        .close-text {
            display: none;
        }

        .close-icon {
            display: inline-block;
            font-size: 16px;
            font-weight: 900;
            line-height: 1;
        }

        .header-actions :global(.action-btn) {
            min-width: unset;
            padding: 4px 8px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .layout-btn {
            height: 32px;
            padding: 4px 8px;
        }
    }

    @media (max-width: 480px) {
        .file-badge {
            display: none;
        }
    }
</style>
