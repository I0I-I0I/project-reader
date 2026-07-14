import { page } from "$app/state"
import { switchLanguage } from "$lib/core/language/language"
import { getLanguageName } from "$lib/core/language/locale"
import {
    CONSTANTS,
    settingsStore,
    type Layout,
    type Theme,
} from "$lib/core/stores/settingsStore.svelte"
import { stepAndClampScale } from "$lib/core/utils/zoom"
import { commandsStore } from "$lib/features/commands/commandsStore.svelte"
import { defineCommands } from "$lib/features/commands/commands.types"
import { promptStore, type PromptOption } from "$lib/features/prompt/stores/promptStore.svelte"
import * as m from "$lib/paraglide/messages"
import { getLocale } from "$lib/paraglide/runtime"
import type { Locale } from "$lib/features/commands/appCommandPayloads"

const themeOptions = (): PromptOption<Theme>[] => [
    {
        id: "theme-light",
        label: m.light(),
        englishLabel: m.light({}, { locale: "en" }),
        description: settingsStore.theme === "light" ? "✓" : undefined,
        category: "settings",
        value: "light",
    },
    {
        id: "theme-dark",
        label: m.dark(),
        englishLabel: m.dark({}, { locale: "en" }),
        description: settingsStore.theme === "dark" ? "✓" : undefined,
        category: "settings",
        value: "dark",
    },
    {
        id: "theme-system",
        label: m.system(),
        englishLabel: m.system({}, { locale: "en" }),
        description: settingsStore.theme === "system" ? "✓" : undefined,
        category: "settings",
        value: "system",
    },
]

const layoutOptions = (): PromptOption<Layout>[] => [
    {
        id: "layout-single",
        label: m.single_page(),
        englishLabel: m.single_page({}, { locale: "en" }),
        description: settingsStore.layout === "single" ? "✓" : undefined,
        category: "settings",
        value: "single",
    },
    {
        id: "layout-split",
        label: m.split_pages(),
        englishLabel: m.split_pages({}, { locale: "en" }),
        description: settingsStore.layout === "split" ? "✓" : undefined,
        category: "settings",
        value: "split",
    },
    {
        id: "layout-scroll",
        label: m.scroll_pages(),
        englishLabel: m.scroll_pages({}, { locale: "en" }),
        description: settingsStore.layout === "scroll" ? "✓" : undefined,
        category: "settings",
        value: "scroll",
    },
]

const languageOptions = (): PromptOption<Locale>[] =>
    (["ru", "en"] as const).map((locale) => ({
        id: `language-${locale}`,
        label: getLanguageName(locale),
        description: getLocale() === locale ? "✓" : undefined,
        category: "settings",
        value: locale,
    }))

export const settingsCommands = defineCommands({
    "settings.theme": {
        id: "settings.theme",
        keymap: "shift+t",
        label: () => m.keymap_change_theme(),
        englishLabel: () => m.keymap_change_theme({}, { locale: "en" }),
        category: "settings",
        subtitle: () => `${m.theme()}: ${settingsStore.theme}`,
        run: async ({ value } = {}) => {
            if (value !== undefined) {
                settingsStore.theme = value
                return
            }
            const selected = await promptStore.choose({
                id: "settings.theme",
                placeholder: m.select_theme(),
                options: themeOptions(),
            })
            if (selected !== undefined) {
                await commandsStore.execute("settings.theme", { value: selected })
            }
        },
    },
    "settings.layout": {
        id: "settings.layout",
        label: () => m.keymap_toggle_layouts(),
        englishLabel: () => m.keymap_toggle_layouts({}, { locale: "en" }),
        category: "settings",
        subtitle: () => `${m.layout()}: ${settingsStore.layout}`,
        run: async ({ value } = {}) => {
            if (value !== undefined) {
                settingsStore.layout = value
                return
            }
            const selected = await promptStore.choose({
                id: "settings.layout",
                placeholder: m.select_layout(),
                options: layoutOptions(),
            })
            if (selected !== undefined) {
                await commandsStore.execute("settings.layout", { value: selected })
            }
        },
    },
    "settings.language": {
        id: "settings.language",
        label: () => m.keymap_change_language(),
        englishLabel: () => m.keymap_change_language({}, { locale: "en" }),
        category: "settings",
        subtitle: () => getLanguageName(getLocale()),
        run: async ({ value } = {}) => {
            if (value !== undefined) {
                switchLanguage(value, page.url)
                return
            }
            const selected = await promptStore.choose({
                id: "settings.language",
                placeholder: m.select_language(),
                options: languageOptions(),
            })
            if (selected !== undefined) {
                await commandsStore.execute("settings.language", { value: selected })
            }
        },
    },
    "settings.zoom.in": {
        id: "settings.zoom.in",
        keymap: "+",
        label: () => m.keymap_zoom_in(),
        englishLabel: () => m.keymap_zoom_in({}, { locale: "en" }),
        category: "settings",
        subtitle: () => m.scale_subtitle({ scale: Math.round(settingsStore.scale * 100) }),
        run: (payload) => {
            settingsStore.scale =
                payload?.value === undefined
                    ? stepAndClampScale(
                          settingsStore.scale,
                          1,
                          CONSTANTS.minScale,
                          CONSTANTS.maxScale,
                      )
                    : Math.min(Math.max(payload.value, CONSTANTS.minScale), CONSTANTS.maxScale)
        },
    },
    "settings.zoom.out": {
        id: "settings.zoom.out",
        keymap: "-",
        label: () => m.keymap_zoom_out(),
        englishLabel: () => m.keymap_zoom_out({}, { locale: "en" }),
        category: "settings",
        subtitle: () => m.scale_subtitle({ scale: Math.round(settingsStore.scale * 100) }),
        run: (payload) => {
            settingsStore.scale =
                payload?.value === undefined
                    ? stepAndClampScale(
                          settingsStore.scale,
                          -1,
                          CONSTANTS.minScale,
                          CONSTANTS.maxScale,
                      )
                    : Math.min(Math.max(payload.value, CONSTANTS.minScale), CONSTANTS.maxScale)
        },
    },
    "settings.animations.toggle": {
        id: "settings.animations.toggle",
        label: () => m.keymap_toggle_animations(),
        englishLabel: () => m.keymap_toggle_animations({}, { locale: "en" }),
        category: "settings",
        subtitle: () =>
            `${m.animations()}: ${settingsStore.animations ? m.animations_enabled() : m.animations_disabled()}`,
        run: () => {
            settingsStore.animations = !settingsStore.animations
        },
    },
})
