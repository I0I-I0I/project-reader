<script lang="ts">
    import { viewport } from "$lib/shared/state/viewport.svelte"
    import Switcher from "$lib/shared/ui/Switcher.svelte"
    import SunIcon from "$lib/shared/icons/SunIcon.svelte"
    import MoonIcon from "$lib/shared/icons/MoonIcon.svelte"
    import SystemIcon from "$lib/shared/icons/SystemIcon.svelte"
    import GlobeIcon from "$lib/shared/icons/GlobeIcon.svelte"
    import { locales, getLocale } from "$lib/paraglide/runtime"
    import { settingsStore } from "$lib/modules/settings"
    import { resolve } from "$app/paths"
    import { page } from "$app/state"
    import * as m from "$lib/paraglide/messages"

    import { getLanguageName } from "$lib/modules/settings"
    import AppUpdateButton from "$lib/shared/ui/AppUpdateButton.svelte"
    import Input from "$lib/shared/ui/Input.svelte"
    import TerminalIcon from "$lib/shared/icons/TerminalIcon.svelte"
    import { vfsStore } from "$lib/modules/documents"
    import Button from "$lib/shared/ui/Button.svelte"
    import BookOpenIcon from "$lib/shared/icons/BookOpenIcon.svelte"
    import { getLocalizedCurrentHref, type AppLocale } from "$lib/modules/settings"
    import { getContext } from "svelte"
    import {
        COMMANDS_CONTEXT_KEY,
        type CommandScope,
        getShortcutHint,
        commandsStore,
    } from "$lib/modules/commands"

    const THEMES = [
        { value: "light", label: () => m.light(), Icon: SunIcon },
        { value: "dark", label: () => m.dark(), Icon: MoonIcon },
        { value: "system", label: () => m.system(), Icon: SystemIcon },
    ] as const

    let inputValue = $state("")

    const currentThemeInfo = $derived(
        THEMES.find((t) => t.value === settingsStore.theme) || THEMES[2],
    )

    const currentBook = $derived(
        vfsStore.activeFileId ? vfsStore.nodes[vfsStore.activeFileId] : undefined,
    )
    const commandsNode = getContext<CommandScope>(COMMANDS_CONTEXT_KEY)
</script>

<header>
    <div class="title-wrapper">
        <h1 class="title" data-text={m.library()}>{m.library()} ()</h1>
    </div>
    <div class="actions-wrapper" role="toolbar" aria-label={m.action_controls()}>
        <div class="header-btn-wrapper">
            <AppUpdateButton />

            {#if !viewport.isCompact}
                <div class="search-btn">
                    <TerminalIcon class="search-icon" />
                    <Input
                        class="search-input-wrapper"
                        classInput="search-input"
                        placeholder={m.header_prompt_placeholder()}
                        oninput={(event) => {
                            const input = event.currentTarget as HTMLInputElement
                            const initialQuery = input.value
                            inputValue = ""
                            input.value = ""
                            void commandsStore.execute("prompt.open", { initialQuery })
                        }}
                        bind:value={inputValue}
                    />
                </div>
            {/if}

            {#if currentBook}
                <Button
                    variant="action"
                    class="continue-btn"
                    onclick={() => void commandsStore.execute("library.continue-reading")}
                    aria-label={m.continue_reading()}
                    tooltip={`${m.continue_reading()}${getShortcutHint(commandsNode, "library.continue-reading")}`}
                >
                    <BookOpenIcon class="switcher-icon" />
                </Button>
            {/if}

            <div class="switchers-group">
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
                                        void commandsStore.execute("settings.theme", { value })
                                        close()
                                    }}
                                    aria-current={settingsStore.theme === value
                                        ? "true"
                                        : undefined}
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
                                        getLocalizedCurrentHref(
                                            page.url,
                                            locale as AppLocale,
                                        ) as any,
                                    )}
                                    class="dropdown-item"
                                    class:active={getLocale() === locale}
                                    aria-current={getLocale() === locale ? "true" : undefined}
                                    onclick={(event) => {
                                        event.preventDefault()
                                        void commandsStore.execute("settings.language", {
                                            value: locale as AppLocale,
                                        })
                                        close()
                                    }}
                                >
                                    <span>{getLanguageName(locale)}</span>
                                </a>
                            </li>
                        {/each}
                    {/snippet}
                </Switcher>
            </div>
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
        flex-wrap: wrap;
    }

    .title-wrapper {
        position: relative;
    }

    .title {
        font-size: clamp(var(--font-size-6xl), 6vw, var(--font-size-7xl));
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

    .header-btn-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .switchers-group {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-left: auto;
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

    .search-btn {
        position: relative;
        height: 100%;

        :global(.search-input-wrapper) {
            height: 32px;

            :global(.search-input) {
                background: var(--surface-color) !important;
                padding: 0 !important;
                height: 100%;
                padding-left: 32px !important;
                padding-right: 12px !important;
                box-shadow: 2px 2px 0 var(--shadow-color) !important;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
            }

            @media (hover: hover) {
                :global(.search-input:hover) {
                    background: var(--surface-hover-color) !important;
                    transform: translate(-1px, -1px);
                    box-shadow: 3px 3px 0 var(--shadow-color) !important;
                }
            }

            :global(.search-input:focus) {
                background: var(--surface-color) !important;
                transform: translate(-1px, -1px);
                box-shadow: 3px 3px 0 var(--shadow-color) !important;
                border-color: var(--accent-color) !important;
            }
        }

        :global(.search-icon) {
            max-height: 100%;
            position: absolute;
            top: 50%;
            left: 18px;
            transform: translate(-50%, -50%);
            width: 16px;
            height: 16px;
            color: var(--text-color);
            margin-right: 12px;
            flex-shrink: 0;
            z-index: var(--z-2);
            pointer-events: none;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        &:hover :global(.search-icon) {
            transform: translate(calc(-50% - 1px), calc(-50% - 1px));
        }

        &:focus-within :global(.search-icon) {
            transform: translate(calc(-50% - 1px), calc(-50% - 1px));
            color: var(--accent-color);
        }
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
    }

    @media (--tablet) {
        header {
            flex-direction: column;
            align-items: flex-start;
            padding-bottom: 20px;
            gap: 20px;
        }

        .actions-wrapper {
            width: 100%;
        }

        .header-btn-wrapper {
            width: 100%;
            flex-wrap: wrap;
            gap: 16px;
        }

        .search-btn {
            flex: 1;
        }
    }

    @media (max-width: 640px) {
        .search-btn {
            flex: 1 1 100%;
        }
    }

    :global(.continue-btn) {
        padding: 6px 12px !important;
        font-size: var(--font-size-base) !important;
        height: 32px;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: unset !important;
    }

    @media (--mobile-width) {
        :global(.continue-btn) {
            width: 32px !important;
            padding: 0 !important;
        }
    }
</style>
