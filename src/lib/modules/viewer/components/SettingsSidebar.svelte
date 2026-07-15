<script lang="ts">
    import { viewport } from "$lib/shared/state/viewport.svelte"
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/shared/ui/Button.svelte"
    import Input from "$lib/shared/ui/Input.svelte"
    import PlusIcon from "$lib/shared/icons/PlusIcon.svelte"
    import MinusIcon from "$lib/shared/icons/MinusIcon.svelte"
    import SinglePageIcon from "$lib/shared/icons/SinglePageIcon.svelte"
    import SplitPagesIcon from "$lib/shared/icons/SplitPagesIcon.svelte"
    import ScrollPagesIcon from "$lib/shared/icons/ScrollPagesIcon.svelte"
    import SunIcon from "$lib/shared/icons/SunIcon.svelte"
    import MoonIcon from "$lib/shared/icons/MoonIcon.svelte"
    import SystemIcon from "$lib/shared/icons/SystemIcon.svelte"
    import Toggle from "$lib/shared/ui/Toggle.svelte"
    import { CONSTANTS, settingsStore, type Theme } from "$lib/modules/settings"
    import { locales, getLocale } from "$lib/paraglide/runtime"
    import { resolve } from "$app/paths"
    import { page } from "$app/state"
    import GlobeIcon from "$lib/shared/icons/GlobeIcon.svelte"
    import { getLanguageName } from "$lib/modules/settings"
    import { getLocalizedCurrentHref, type AppLocale } from "$lib/modules/settings"
    import { commandsStore } from "$lib/modules/commands"

    let isShortHeight = $derived(viewport.isShortHeight)

    function handleScaleChange(e: Event) {
        const input = e.target as HTMLInputElement
        const value = parseInt(input.value, 10)
        if (!isNaN(value)) {
            const clamped = Math.max(50, Math.min(300, value))
            commandsStore.execute("settings.zoom.in", { value: clamped / 100 })
            input.value = clamped.toString()
        } else {
            input.value = Math.round(settingsStore.scale * 100).toString()
        }
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
</script>

<div class="sidebar-content">
    <section class="settings-section">
        <h4 class="section-title">{m.layout()}</h4>
        <div class="layout-options" role="group" aria-label={m.layout()}>
            <Button
                class={"option-btn" + (settingsStore.layout === "single" ? " active" : "")}
                variant="action"
                size="default"
                onclick={() => commandsStore.execute("settings.layout", { value: "single" })}
            >
                <SinglePageIcon />
                <span>{m.single_page()}</span>
            </Button>
            <Button
                class={"option-btn" + (settingsStore.layout === "split" ? " active" : "")}
                variant="action"
                size="default"
                onclick={() => commandsStore.execute("settings.layout", { value: "split" })}
            >
                <SplitPagesIcon />
                <span>{m.split_pages()}</span>
            </Button>
            <Button
                class={"option-btn" + (settingsStore.layout === "scroll" ? " active" : "")}
                variant="action"
                size="default"
                onclick={() => commandsStore.execute("settings.layout", { value: "scroll" })}
            >
                <ScrollPagesIcon />
                <span>{m.scroll_pages()}</span>
            </Button>
        </div>
    </section>

    {#if !viewport.isCompact || isShortHeight}
        <section class="settings-section">
            <h4 class="section-title">{m.page()}</h4>
            <div class="zoom-controls" role="group" aria-label={m.page()}>
                <Button
                    variant="action"
                    size="default"
                    square={true}
                    onclick={() => commandsStore.execute("settings.zoom.out")}
                    aria-label={m.zoom_out()}
                    class="zoom-btn"
                >
                    <MinusIcon />
                </Button>
                <div class="scale-input-container">
                    <Input
                        unstyled
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
                    onclick={() => commandsStore.execute("settings.zoom.in")}
                    aria-label={m.zoom_in()}
                    class="zoom-btn"
                >
                    <PlusIcon />
                </Button>
            </div>
            <div class="slider-container">
                <Input
                    unstyled
                    type="range"
                    min={Math.round(CONSTANTS.minScale * 100)}
                    max={Math.round(CONSTANTS.maxScale * 100)}
                    step="5"
                    value={Math.round(settingsStore.scale * 100)}
                    oninput={(e) => {
                        const val = parseInt((e.target as HTMLInputElement).value, 10)
                        if (!isNaN(val)) {
                            commandsStore.execute("settings.zoom.in", { value: val / 100 })
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
                onclick={() => commandsStore.execute("settings.quality.out")}
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
                onclick={() => commandsStore.execute("settings.quality.in")}
                aria-label={m.quality_up()}
                class="zoom-btn"
            >
                <PlusIcon />
            </Button>
        </div>
        <div class="slider-container">
            <Input
                unstyled
                type="range"
                min={CONSTANTS.minQuality}
                max={CONSTANTS.maxQuality}
                step="1"
                value={settingsStore.quality}
                oninput={(e) => {
                    const val = parseInt((e.target as HTMLInputElement).value, 10)
                    if (!isNaN(val)) {
                        commandsStore.execute("settings.quality.in", { value: val })
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
                    onclick={() => commandsStore.execute("settings.theme", { value })}
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
                checked={settingsStore.animations}
                onchange={() => commandsStore.execute("settings.animations.toggle")}
                label={settingsStore.animations ? m.animations_enabled() : m.animations_disabled()}
            />
        </div>
    </section>

    <section class="settings-section">
        <h4 class="section-title">{m.prefer_pdf_title()}</h4>
        <div class="animation-options">
            <Toggle
                checked={settingsStore.preferPdfTitle}
                onchange={() => commandsStore.execute("settings.pdf-title.toggle")}
                label={settingsStore.preferPdfTitle
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
                    href={resolve(getLocalizedCurrentHref(page.url, locale as AppLocale) as any)}
                    class={"option-btn" + (getLocale() === locale ? " active" : "")}
                    variant="action"
                    size="default"
                    onclick={(event: MouseEvent) => {
                        event.preventDefault()
                        void commandsStore.execute("settings.language", {
                            value: locale as AppLocale,
                        })
                    }}
                >
                    <GlobeIcon />
                    <span>{getLanguageName(locale)}</span>
                </Button>
            {/each}
        </div>
    </section>
</div>

<style>
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
        font-size: var(--font-size-sm);
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

    .scale-input-container :global(.scale-input) {
        width: 36px;
        border: none;
        background: transparent;
        font-family: inherit;
        font-weight: 900;
        color: var(--text-color);
        text-align: right;
        padding: 0;
        margin: 0;
        outline: none;
        appearance: textfield;
        -moz-appearance: textfield;
    }

    .scale-input-container :global(.scale-input::-webkit-outer-spin-button),
    .scale-input-container :global(.scale-input::-webkit-inner-spin-button) {
        -webkit-appearance: none;
        margin: 0;
    }

    .percent-sign {
        font-size: var(--font-size-lg);
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

    .slider-container {
        display: flex;
        align-items: center;
        width: 100%;
        margin-top: 4px;
    }

    .slider-container :global(.sidebar-slider) {
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

    .slider-container :global(.sidebar-slider::-webkit-slider-thumb) {
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

    .slider-container :global(.sidebar-slider::-webkit-slider-thumb:hover) {
        transform: scale(1.1);
    }

    .slider-container :global(.sidebar-slider::-moz-range-thumb) {
        width: 12px;
        height: 18px;
        background: var(--accent-active-color);
        border: 2px solid var(--border-color);
        box-shadow: 1px 1px 0 var(--shadow-color);
        cursor: pointer;
        border-radius: 0;
        transition: transform 0.1s ease;
    }

    .slider-container :global(.sidebar-slider::-moz-range-thumb:hover) {
        transform: scale(1.1);
    }
</style>
