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
    import { CONSTANTS, settingsStore, type Theme } from "$lib/settingsStore.svelte"
    import { cubicOut } from "svelte/easing"
    import { useKeymap } from "$lib/keymaps"
    import { getContext, onMount } from "svelte"
    import { locales, localizeHref, getLocale } from "$lib/paraglide/runtime"
    import { resolve } from "$app/paths"
    import { page } from "$app/state"
    import type { Pathname } from "$app/types"
    import GlobeIcon from "$lib/components/icons/GlobeIcon.svelte"
    import { getLanguageName } from "$lib/locale"
    import { MEDIA_QUERIES } from "$lib/breakpoints"
    import { browser } from "$app/environment"

    let { onClose } = $props<{
        onClose: () => void
    }>()

    let isMobilePhone = $state(browser ? window.matchMedia(MEDIA_QUERIES.MOBILE).matches : false)
    let isShortHeight = $state(browser ? window.matchMedia("(max-height: 500px)").matches : false)

    onMount(() => {
        const mediaQuery = window.matchMedia(MEDIA_QUERIES.MOBILE)
        isMobilePhone = mediaQuery.matches

        const handler = (e: MediaQueryListEvent) => {
            isMobilePhone = e.matches
        }
        mediaQuery.addEventListener("change", handler)

        const heightQuery = window.matchMedia("(max-height: 500px)")
        isShortHeight = heightQuery.matches

        const heightHandler = (e: MediaQueryListEvent) => {
            isShortHeight = e.matches
        }
        heightQuery.addEventListener("change", heightHandler)

        return () => {
            mediaQuery.removeEventListener("change", handler)
            heightQuery.removeEventListener("change", heightHandler)
        }
    })

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

    const getActiveNode = getContext<() => any>("get_active_keymap_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useKeymap(
        [
            {
                keys: "escape",
                action: () => {
                    onClose()
                },
                description: m.keymap_close_settings(),
                allowInInputs: true,
            },
            {
                keys: "q",
                action: () => {
                    onClose()
                },
                description: m.keymap_close_settings(),
                allowInInputs: true,
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
        <button class="close-sidebar-btn" onclick={onClose} aria-label={m.close()}> × </button>
    </div>

    <div class="sidebar-content">
        <section class="settings-section">
            <h4 class="section-title">{m.layout()}</h4>
            <div class="layout-options">
                <button
                    class="option-btn"
                    class:active={settingsStore.layout === "single"}
                    onclick={() => (settingsStore.layout = "single")}
                >
                    <SinglePageIcon />
                    <span>{m.single_page()}</span>
                </button>
                <button
                    class="option-btn"
                    class:active={settingsStore.layout === "split"}
                    onclick={() => (settingsStore.layout = "split")}
                >
                    <SplitPagesIcon />
                    <span>{m.split_pages()}</span>
                </button>
                <button
                    class="option-btn"
                    class:active={settingsStore.layout === "scroll"}
                    onclick={() => (settingsStore.layout = "scroll")}
                >
                    <ScrollPagesIcon />
                    <span>{m.scroll_pages()}</span>
                </button>
            </div>
        </section>

        {#if !isMobilePhone || isShortHeight}
            <section class="settings-section">
                <h4 class="section-title">{m.page()}</h4>
                <div class="zoom-controls">
                    <Button onclick={downScale} aria-label={m.zoom_out()} class="zoom-btn">
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
                    <Button onclick={upScale} aria-label={m.zoom_in()} class="zoom-btn">
                        <PlusIcon />
                    </Button>
                </div>
            </section>
        {/if}

        <section class="settings-section">
            <h4 class="section-title">{m.quality()}</h4>
            <div class="zoom-controls">
                <Button onclick={downQuality} aria-label={m.quality_down()} class="zoom-btn">
                    <MinusIcon />
                </Button>
                <div class="scale-input-container">
                    <span>{settingsStore.quality}</span>
                </div>
                <Button onclick={upQuality} aria-label={m.quality_up()} class="zoom-btn">
                    <PlusIcon />
                </Button>
            </div>
        </section>

        <section class="settings-section">
            <h4 class="section-title">{m.theme()}</h4>
            <div class="theme-options">
                {#each THEMES as { value, label, Icon }}
                    <button
                        class="option-btn"
                        class:active={settingsStore.theme === value}
                        onclick={() => (settingsStore.theme = value)}
                    >
                        <Icon class="theme-icon" />
                        <span>{label()}</span>
                    </button>
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
            <div class="language-options">
                {#each locales as locale (locale)}
                    <a
                        data-sveltekit-reload
                        href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
                        class="option-btn"
                        class:active={getLocale() === locale}
                    >
                        <GlobeIcon />
                        <span>{getLanguageName(locale)}</span>
                    </a>
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
        background: var(--sidebar-content-bg);
        border-left: 3px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 200;
        box-sizing: border-box;
        box-shadow: -10px 0 0 rgba(0, 0, 0, 0.1);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--sidebar-header-bg);
        border-bottom: 3px solid var(--border-color);
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top));
        padding-right: calc(16px + env(safe-area-inset-right));
        flex-shrink: 0;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        color: var(--doc-text-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .close-sidebar-btn {
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        font-family: inherit;
        font-size: 14px;
        font-weight: 800;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
    }

    @media (hover: hover) {
        .close-sidebar-btn:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--close-sidebar-hover-bg);
            color: var(--close-sidebar-hover-text);
        }
    }

    .close-sidebar-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 24px;
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
        color: var(--no-outline-text);
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

    .option-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        padding: 10px 14px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        color: var(--text-color);
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        box-sizing: border-box;
    }

    @media (hover: hover) {
        .option-btn:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0 var(--shadow-color);
            background: var(--viewer-accent);
        }
    }

    .option-btn.active {
        background: var(--viewer-accent-active);
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .option-btn :global(svg) {
        width: 18px;
        height: 18px;
    }

    .zoom-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--canvas-frame-bg);
        border: 2px solid var(--border-color);
        padding: 8px;
    }

    .scale-input-container {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--button-bg);
        border: 2px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        padding: 0 8px;
        height: 40px;
        box-sizing: border-box;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .scale-input-container:focus-within {
        border-color: var(--viewer-accent-active, var(--border-color));
        background: var(--viewer-accent, var(--button-bg));
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

    @media (max-width: 480px) {
        .settings-sidebar {
            width: 100%;
            border-left: none;
        }
    }
</style>
