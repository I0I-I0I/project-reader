<script lang="ts">
    import { locales, localizeHref, getLocale } from "$lib/paraglide/runtime"
    import { resolve } from "$app/paths"
    import { page } from "$app/state"
    import type { Pathname } from "$app/types"
    import * as m from "$lib/paraglide/messages"
    import GlobeIcon from "$lib/components/icons/GlobeIcon.svelte"

    let isOpen = $state(false)
    let dropdownEl = $state<HTMLElement | null>(null)

    const LANGUAGE_NAMES: Record<string, string> = {
        en: "English",
        ru: "Русский",
    }

    function toggleDropdown() {
        isOpen = !isOpen
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

<div class="lang-switcher-wrapper" bind:this={dropdownEl}>
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
        aria-label={m.language_switcher()}
    >
        <GlobeIcon class="lang-icon" />
        <span class="current-label">{LANGUAGE_NAMES[getLocale()] || getLocale().toUpperCase()}</span
        >
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
            {#each locales as locale (locale)}
                <li>
                    <a
                        data-sveltekit-reload
                        href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
                        class="dropdown-item"
                        class:active={getLocale() === locale}
                        role="option"
                        aria-selected={getLocale() === locale}
                        onclick={() => {
                            isOpen = false
                        }}
                    >
                        <span>{LANGUAGE_NAMES[locale] || locale.toUpperCase()}</span>
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .lang-switcher-wrapper {
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

    :global(.lang-icon) {
        width: 16px;
        height: 16px;
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
        text-decoration: none;
        box-sizing: border-box;
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

    @media (max-width: 480px) {
        .current-label {
            display: none;
        }

        .switcher-trigger {
            padding: 6px 8px;
        }
    }
</style>
