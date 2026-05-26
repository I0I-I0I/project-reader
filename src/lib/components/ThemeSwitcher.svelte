<script lang="ts">
    import { themeState } from "$lib/theme.svelte"
    import * as m from "$lib/paraglide/messages"
    import SunIcon from "$lib/components/icons/SunIcon.svelte"
    import MoonIcon from "$lib/components/icons/MoonIcon.svelte"
    import SystemIcon from "$lib/components/icons/SystemIcon.svelte"

    let isOpen = $state(false)
    let dropdownEl = $state<HTMLElement | null>(null)

    const THEMES = [
        { value: "light", label: () => m.light(), Icon: SunIcon },
        { value: "dark", label: () => m.dark(), Icon: MoonIcon },
        { value: "system", label: () => m.system(), Icon: SystemIcon },
    ] as const

    function toggleDropdown() {
        isOpen = !isOpen
    }

    function selectTheme(theme: "light" | "dark" | "system") {
        themeState.set(theme)
        isOpen = false
    }

    $effect(() => {
        if (!isOpen) return

        function handleClickOutside(event: MouseEvent) {
            if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
                isOpen = false
            }
        }

        document.addEventListener("click", handleClickOutside)
        return () => {
            document.removeEventListener("click", handleClickOutside)
        }
    })
</script>

<div class="theme-switcher-wrapper" bind:this={dropdownEl}>
    <button
        class="switcher-trigger"
        onclick={toggleDropdown}
        onkeydown={(e) => {
            if (e.key === "Escape" && isOpen) {
                isOpen = false
            }
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={m.select_theme()}
    >
        {#if themeState.current === "light"}
            <SunIcon class="theme-icon" />
            <span class="current-label">{m.light()}</span>
        {:else if themeState.current === "dark"}
            <MoonIcon class="theme-icon" />
            <span class="current-label">{m.dark()}</span>
        {:else}
            <SystemIcon class="theme-icon" />
            <span class="current-label">{m.system()}</span>
        {/if}
        <svg
            class="chevron"
            class:open={isOpen}
            width="14"
            height="14"
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

    {#if isOpen}
        <ul
            class="switcher-dropdown"
            role="listbox"
            onkeydown={(e) => {
                if (e.key === "Escape") {
                    isOpen = false
                    dropdownEl?.querySelector("button")?.focus()
                }
            }}
        >
            {#each THEMES as { value, label, Icon } (value)}
                <li>
                    <button
                        class="dropdown-item"
                        class:active={themeState.current === value}
                        onclick={() => selectTheme(value)}
                        role="option"
                        aria-selected={themeState.current === value}
                    >
                        <Icon class="theme-icon-small" />
                        <span>{label()}</span>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .theme-switcher-wrapper {
        position: relative;
        display: inline-block;
        font-family: inherit;
    }

    .switcher-trigger {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 2px solid var(--border-color);
        background: var(--button-bg);
        color: var(--text-color);
        padding: 6px 12px;
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .switcher-trigger:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        background: var(--button-hover-bg);
    }

    .switcher-trigger:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .current-label {
        letter-spacing: 0.5px;
    }

    .chevron {
        transition: transform 0.2s ease;
    }

    .chevron.open {
        transform: rotate(180deg);
    }

    :global(.theme-icon) {
        width: 16px;
        height: 16px;
        stroke-width: 2.5;
    }

    :global(.theme-icon-small) {
        width: 14px;
        height: 14px;
        stroke-width: 2.5;
    }

    .switcher-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 1000;
        list-style: none;
        margin: 0;
        padding: 4px;
        border: 2px solid var(--border-color);
        background: var(--dropdown-bg);
        box-shadow: 4px 4px 0 var(--shadow-color);
        min-width: 140px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        background: none;
        border: none;
        color: var(--text-color);
        padding: 8px 12px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        cursor: pointer;
        transition: all 0.1s ease;
    }

    .dropdown-item:hover {
        background: var(--dropdown-hover-bg);
    }

    .dropdown-item.active {
        background: var(--text-color);
        color: var(--bg-color);
    }
</style>
