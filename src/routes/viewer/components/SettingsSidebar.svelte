<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import MinusIcon from "$lib/components/icons/MinusIcon.svelte"
    import SinglePageIcon from "$lib/components/icons/SinglePageIcon.svelte"
    import SplitPagesIcon from "$lib/components/icons/SplitPagesIcon.svelte"
    import ScrollPagesIcon from "$lib/components/icons/ScrollPagesIcon.svelte"
    import SunIcon from "$lib/components/icons/SunIcon.svelte"
    import MoonIcon from "$lib/components/icons/MoonIcon.svelte"
    import SystemIcon from "$lib/components/icons/SystemIcon.svelte"
    import Toggle from "$lib/components/ui/Toggle.svelte"
    import { CONSTANTS, settingsStore, type Theme } from "$lib/stores/settingsStore.svelte"
    import { cubicOut } from "svelte/easing"
    import { useCommands, type CommandNode } from "$lib/stores/commandsStore.svelte"
    import { getContext, onMount } from "svelte"
    import { locales, getLocale } from "$lib/paraglide/runtime"
    import { resolve } from "$app/paths"
    import { page } from "$app/state"
    import GlobeIcon from "$lib/components/icons/GlobeIcon.svelte"
    import { getLanguageName } from "$lib/locale"
    import { browser } from "$app/environment"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { getLocalizedCurrentHref, switchLanguage, type AppLocale } from "$lib/language"

    let { onClose } = $props<{
        onClose: () => void
    }>()

    let isShortHeight = $derived(uiStore.isShortHeight)

    function upScale() {
        settingsStore.scale = Math.min(settingsStore.scale + 0.25, CONSTANTS.maxScale)
    }

    function downScale() {
        settingsStore.scale = Math.max(settingsStore.scale - 0.25, CONSTANTS.minScale)
    }

    function handleScaleChange(e: Event) {
        const input = e.target as HTMLInputElement
        const value = parseInt(input.value, 10)
        if (!isNaN(value)) {
            const clamped = Math.max(50, Math.min(300, value))
            settingsStore.scale = clamped / 100
            input.value = clamped.toString()
        } else {
            input.value = Math.round(settingsStore.scale * 100).toString()
        }
    }

    function downQuality() {
        settingsStore.quality = Math.max(settingsStore.quality - 1, CONSTANTS.minQuality)
    }

    function upQuality() {
        settingsStore.quality = Math.min(settingsStore.quality + 1, CONSTANTS.maxQuality)
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            ;(e.target as HTMLInputElement).blur()
        }
    }

    const THEMES: { value: Theme; label: () => string; Icon: typeof SunIcon }[] = [
        { value: "light", label: () => m.light(), Icon: SunIcon },
        { value: "dark", label: () => m.dark(), Icon: MoonIcon },
        { value: "system", label: () => m.system(), Icon: SystemIcon },
    ] as const

    function slideFromRight(_: HTMLElement, { duration = 150 }) {
        return {
            duration,
            css: (t: number) => {
                const eased = cubicOut(t)
                return `
                    transform: translateX(${(1 - eased) * 100}%);
                `
            },
        }
    }

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useCommands(
        [
            {
                id: "close",
                keys: ["escape", "ctrl+c", "ctrl+["],
                action: () => {
                    onClose()
                },
                description: m.keymap_close_settings(),
                allowInInputs: true,
            },
            {
                id: "close-alt",
                keys: "q",
                action: () => {
                    onClose()
                },
                description: m.keymap_close_settings(),
                allowInInputs: false,
            },
        ],
        activeNodeBeforeOpen,
    )
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="settings-sidebar"
    transition:slideFromRight={{ duration: settingsStore.animations ? 150 : 0 }}
    onclick={(e) => e.stopPropagation()}
>
    <div class="sidebar-header">
        <h3>{m.settings()}</h3>
        <Button
            variant="close"
            size="small"
            square={true}
            onclick={onClose}
            aria-label={m.close()}
            tooltip={m.close()}
        >
            ×
        </Button>
    </div>

    <div class="sidebar-content">
        <section class="settings-section">
            <h4 class="section-title">{m.layout()}</h4>
            <div class="layout-options" role="group" aria-label={m.layout()}>
                <Button
                    class={"option-btn" + (settingsStore.layout === "single" ? " active" : "")}
                    variant="action"
                    size="default"
                    onclick={() => (settingsStore.layout = "single")}
                >
                    <SinglePageIcon />
                    <span>{m.single_page()}</span>
                </Button>
                <Button
                    class={"option-btn" + (settingsStore.layout === "split" ? " active" : "")}
                    variant="action"
                    size="default"
                    onclick={() => (settingsStore.layout = "split")}
                >
                    <SplitPagesIcon />
                    <span>{m.split_pages()}</span>
                </Button>
                <Button
                    class={"option-btn" + (settingsStore.layout === "scroll" ? " active" : "")}
                    variant="action"
                    size="default"
                    onclick={() => (settingsStore.layout = "scroll")}
                >
                    <ScrollPagesIcon />
                    <span>{m.scroll_pages()}</span>
                </Button>
            </div>
        </section>

        {#if !uiStore.isCompact || isShortHeight}
            <section class="settings-section">
                <h4 class="section-title">{m.page()}</h4>
                <div class="zoom-controls" role="group" aria-label={m.page()}>
                    <Button
                        variant="action"
                        size="default"
                        square={true}
                        onclick={downScale}
                        aria-label={m.zoom_out()}
                        class="zoom-btn"
                    >
                        <MinusIcon />
                    </Button>
                    <div class="scale-input-container">
                        <input
                            type="number"
                            value={Math.round(settingsStore.scale * 100)}
                            onchange={handleScaleChange}
                            onkeydown={handleKeyDown}
                            min={Math.round(CONSTANTS.minScale * 100)}
                            max={Math.round(CONSTANTS.maxScale * 100)}
                            class="scale-input"
                            aria-label={m.zoom_scale()}
                        />
                        <span class="percent-sign">%</span>
                    </div>
                    <Button
                        variant="action"
                        size="default"
                        square={true}
                        onclick={upScale}
                        aria-label={m.zoom_in()}
                        class="zoom-btn"
                    >
                        <PlusIcon />
                    </Button>
                </div>
                <div class="slider-container">
                    <input
                        type="range"
                        min={Math.round(CONSTANTS.minScale * 100)}
                        max={Math.round(CONSTANTS.maxScale * 100)}
                        step="5"
                        value={Math.round(settingsStore.scale * 100)}
                        oninput={(e) => {
                            const val = parseInt((e.target as HTMLInputElement).value, 10)
                            if (!isNaN(val)) {
                                settingsStore.scale = val / 100
                            }
                        }}
                        class="sidebar-slider"
                        aria-label={m.zoom_slider_aria()}
                    />
                </div>
            </section>
        {/if}

        <section class="settings-section">
            <h4 class="section-title">{m.quality()}</h4>
            <div class="zoom-controls" role="group" aria-label={m.quality()}>
                <Button
                    variant="action"
                    size="default"
                    square={true}
                    onclick={downQuality}
                    aria-label={m.quality_down()}
                    class="zoom-btn"
                >
                    <MinusIcon />
                </Button>
                <div class="scale-input-container">
                    <span>{settingsStore.quality}</span>
                </div>
                <Button
                    variant="action"
                    size="default"
                    square={true}
                    onclick={upQuality}
                    aria-label={m.quality_up()}
                    class="zoom-btn"
                >
                    <PlusIcon />
                </Button>
            </div>
            <div class="slider-container">
                <input
                    type="range"
                    min={CONSTANTS.minQuality}
                    max={CONSTANTS.maxQuality}
                    step="1"
                    value={settingsStore.quality}
                    oninput={(e) => {
                        const val = parseInt((e.target as HTMLInputElement).value, 10)
                        if (!isNaN(val)) {
                            settingsStore.quality = val
                        }
                    }}
                    class="sidebar-slider"
                    aria-label={m.quality_slider_aria()}
                />
            </div>
        </section>

        <section class="settings-section">
            <h4 class="section-title">{m.theme()}</h4>
            <div class="theme-options" role="group" aria-label={m.theme()}>
                {#each THEMES as { value, label, Icon } (value)}
                    <Button
                        class={"option-btn" + (settingsStore.theme === value ? " active" : "")}
                        variant="action"
                        size="default"
                        onclick={() => (settingsStore.theme = value)}
                    >
                        <Icon class="theme-icon" />
                        <span>{label()}</span>
                    </Button>
                {/each}
            </div>
        </section>

        <section class="settings-section">
            <h4 class="section-title">{m.animations()}</h4>
            <div class="animation-options">
                <Toggle
                    bind:checked={settingsStore.animations}
                    label={settingsStore.animations
                        ? m.animations_enabled()
                        : m.animations_disabled()}
                />
            </div>
        </section>

        <section class="settings-section">
            <h4 class="section-title">{m.language_switcher()}</h4>
            <div class="language-options" role="group" aria-label={m.language_switcher()}>
                {#each locales as locale (locale)}
                    <Button
                        data-sveltekit-reload
                        href={resolve(
                            getLocalizedCurrentHref(page.url, locale as AppLocale) as any,
                        )}
                        class={"option-btn" + (getLocale() === locale ? " active" : "")}
                        variant="action"
                        size="default"
                        onclick={(event: MouseEvent) => {
                            event.preventDefault()
                            switchLanguage(locale as AppLocale, page.url)
                        }}
                    >
                        <GlobeIcon />
                        <span>{getLanguageName(locale)}</span>
                    </Button>
                {/each}
            </div>
        </section>
    </div>
</div>

<style>
    .settings-sidebar {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 280px;
        background: color-mix(in srgb, var(--surface-color) 85%, transparent);
        backdrop-filter: blur(16px);
        border-left: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: visible;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: -10px 0 0 rgba(0, 0, 0, 0.08);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: color-mix(in srgb, var(--accent-active-color) 85%, transparent);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top));
        padding-right: calc(16px + env(safe-area-inset-right));
        flex-shrink: 0;
        position: relative;
        z-index: 10;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        background: transparent;
        overscroll-behavior: contain;
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .section-title {
        margin: 0;
        font-size: 11px;
        font-weight: 900;
        color: var(--faded-text-color);
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .layout-options,
    .theme-options,
    .language-options,
    .animation-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    :global(.option-btn) {
        justify-content: flex-start !important;
    }

    :global(.option-btn.active) {
        background: var(--accent-active-color, var(--accent-active-color)) !important;
        transform: translate(2px, 2px) !important;
        box-shadow: 1px 1px 0 var(--shadow-color, var(--shadow-color)) !important;
        border-color: var(--border-color, var(--border-color)) !important;
    }

    .zoom-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        padding: 8px;
    }

    .scale-input-container {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        padding: 0 8px;
        height: 40px;
        box-sizing: border-box;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .scale-input-container:focus-within {
        border-color: var(--accent-active-color, var(--border-color));
        background: var(--accent-color, var(--surface-color));
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
    }

    .scale-input {
        width: 36px;
        border: none;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        font-weight: 900;
        color: var(--text-color);
        text-align: right;
        padding: 0;
        margin: 0;
        outline: none;
        appearance: textfield;
        -moz-appearance: textfield;
    }

    .scale-input::-webkit-outer-spin-button,
    .scale-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .percent-sign {
        font-size: 14px;
        font-weight: 900;
        color: var(--text-color);
        margin-left: 2px;
    }

    :global(.zoom-btn) {
        width: 40px !important;
        height: 40px !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    @media (--tiny-mobile) {
        .settings-sidebar {
            width: 100%;
            border-left: none;
        }
    }

    .slider-container {
        display: flex;
        align-items: center;
        width: 100%;
        margin-top: 4px;
    }

    .sidebar-slider {
        width: 100%;
        height: 8px;
        appearance: none;
        -webkit-appearance: none;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        outline: none;
        box-sizing: border-box;
    }

    .sidebar-slider::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 12px;
        height: 18px;
        background: var(--accent-active-color);
        border: 2px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        cursor: pointer;
        transition: transform 0.1s ease;
    }

    .sidebar-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
    }

    .sidebar-slider::-moz-range-thumb {
        width: 12px;
        height: 18px;
        background: var(--accent-active-color);
        border: 2px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        cursor: pointer;
        border-radius: 0;
        transition: transform 0.1s ease;
    }

    .sidebar-slider::-moz-range-thumb:hover {
        transform: scale(1.1);
    }
</style>
