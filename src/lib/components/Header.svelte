<script lang="ts">
    import NewFolderIcon from "$lib/components/icons/NewFolderIcon.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import Switcher from "$lib/components/ui/Switcher.svelte"
    import SunIcon from "$lib/components/icons/SunIcon.svelte"
    import MoonIcon from "$lib/components/icons/MoonIcon.svelte"
    import SystemIcon from "$lib/components/icons/SystemIcon.svelte"
    import GlobeIcon from "$lib/components/icons/GlobeIcon.svelte"
    import { locales, localizeHref, getLocale } from "$lib/paraglide/runtime"
    import { settingsStore, type Theme } from "$lib/stores/settingsStore.svelte"
    import { resolve } from "$app/paths"
    import { page } from "$app/state"
    import type { Pathname } from "$app/types"
    import * as m from "$lib/paraglide/messages"

    const THEMES = [
        { value: "light", label: () => m.light(), Icon: SunIcon },
        { value: "dark", label: () => m.dark(), Icon: MoonIcon },
        { value: "system", label: () => m.system(), Icon: SystemIcon },
    ] as const

    import { getLanguageName } from "$lib/locale"

    function selectTheme(theme: Theme) {
        settingsStore.theme = theme
    }

    const currentThemeInfo = $derived(
        THEMES.find((t) => t.value === settingsStore.theme) || THEMES[2],
    )
</script>

<header>
    <div class="title-wrapper">
        <h1 class="title" data-text={m.library()}>{m.library()}</h1>
    </div>
    <div class="actions-wrapper" role="toolbar" aria-label={m.action_controls()}>
        <div class="header-btn-wrapper">
            <Switcher label={m.select_theme()}>
                {#snippet trigger()}
                    <currentThemeInfo.Icon class="switcher-icon" />
                    <span class="current-label">{currentThemeInfo.label()}</span>
                {/snippet}
                {#snippet children({ close })}
                    {#each THEMES as { value, label, Icon } (value)}
                        <li>
                            <button
                                class="dropdown-item"
                                class:active={settingsStore.theme === value}
                                onclick={() => {
                                    selectTheme(value)
                                    close()
                                }}
                                aria-current={settingsStore.theme === value ? "true" : undefined}
                            >
                                <Icon class="switcher-icon-small" />
                                <span>{label()}</span>
                            </button>
                        </li>
                    {/each}
                {/snippet}
            </Switcher>

            <Switcher label={m.language_switcher()}>
                {#snippet trigger()}
                    <GlobeIcon class="switcher-icon" />
                    <span class="current-label">{getLanguageName(getLocale())}</span>
                {/snippet}
                {#snippet children({ close })}
                    {#each locales as locale (locale)}
                        <li>
                            <a
                                data-sveltekit-reload
                                href={resolve(
                                    localizeHref(page.url.pathname, { locale }) as Pathname,
                                )}
                                class="dropdown-item"
                                class:active={getLocale() === locale}
                                aria-current={getLocale() === locale ? "true" : undefined}
                                onclick={close}
                            >
                                <span>{getLanguageName(locale)}</span>
                            </a>
                        </li>
                    {/each}
                {/snippet}
            </Switcher>
        </div>
    </div>
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 3px solid var(--border-color);
        padding-bottom: 24px;
        margin-bottom: 20px;
        gap: 20px;
    }

    .title-wrapper {
        position: relative;
    }

    .title {
        font-size: clamp(36px, 6vw, 64px);
        margin: 0;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: -2px;
        position: relative;
        display: inline-block;
        color: var(--text-color);
        line-height: 1;
    }

    .actions-wrapper {
        display: flex;
        align-items: center;
        gap: 24px;
    }

    .action-nav {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .header-btn-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .header-btn-wrapper :global(.action-btn) {
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        padding: 8px 16px;
        box-shadow: 2px 2px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (hover: hover) {
        .header-btn-wrapper :global(.action-btn:hover) {
            transform: translate(-2px, -2px);
            box-shadow: 4px 4px 0 var(--shadow-color);
            background: var(--surface-hover-color);
        }
    }

    .header-btn-wrapper :global(.action-btn:active) {
        transform: translate(2px, 2px);
        box-shadow: 0px 0px 0 var(--shadow-color);
    }

    :global(.switcher-icon) {
        width: 16px;
        height: 16px;
        stroke-width: 2.5;
    }

    :global(.switcher-icon-small) {
        width: 14px;
        height: 14px;
        stroke-width: 2.5;
    }

    .current-label {
        letter-spacing: 0.5px;
    }

    @media (max-width: 850px) {
        header {
            flex-direction: column;
            align-items: flex-start;
            padding-bottom: 20px;
            gap: 20px;
        }

        .actions-wrapper {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
        }
    }
</style>
