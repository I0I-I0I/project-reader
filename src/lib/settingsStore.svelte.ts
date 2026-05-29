import { browser } from "$app/environment"
import * as m from "$lib/paraglide/messages"
import type { ShortcutAction } from "./keymaps"

export type Theme = "light" | "dark" | "system"
export type Layout = "single" | "split" | "scroll"

export interface Settings {
    layout: Layout
    scale: number
    theme: Theme
    language: "en" | "ru"
    animations: boolean
}

class SettingsStore {
    private settings = $state<Settings>({
        layout: "single",
        scale: 1.5,
        theme: "system",
        language: "en",
        animations: true,
    })

    constructor() {
        if (browser) {
            const savedSettings = localStorage.getItem("settings")
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings)
                    const sanitized = this.sanitize(parsed)
                    this.settings = { ...this.settings, ...sanitized }
                } catch (e) {
                    console.error("Failed to parse settings from localStorage", e)
                }
            } else {
                this.theme = (localStorage.getItem("theme") as Theme) || "system"

                const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
                mediaQuery.addEventListener("change", () => {
                    if (this.theme === "system") {
                        this.updateDOM()
                    }
                })
            }
        }
    }

    private sanitize(parsed: any): Partial<Settings> {
        const sanitized: Partial<Settings> = {}

        if (parsed && typeof parsed === "object") {
            if (["single", "split", "scroll"].includes(parsed.layout)) {
                sanitized.layout = parsed.layout
            }
            if (typeof parsed.scale === "number" && parsed.scale >= 0.5 && parsed.scale <= 3) {
                sanitized.scale = parsed.scale
            }
            if (["light", "dark", "system"].includes(parsed.theme)) {
                sanitized.theme = parsed.theme
            }
            if (["en", "ru"].includes(parsed.language)) {
                sanitized.language = parsed.language
            }
            if (typeof parsed.animations === "boolean") {
                sanitized.animations = parsed.animations
            }
        }

        return sanitized
    }

    getSettings(): Settings {
        return this.settings
    }

    updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
        const settings = { ...this.settings }
        settings[key] = value
        this.settings = settings
        if (browser) {
            localStorage.setItem("settings", JSON.stringify(settings))
        }
    }

    layout_next() {
        const layouts: Settings["layout"][] = ["single", "split", "scroll"]
        const index = layouts.indexOf(this.layout)
        this.layout = layouts[(index + 1) % layouts.length]
        return this.layout
    }

    get layout(): Settings["layout"] {
        return this.settings.layout
    }

    set layout(value: Settings["layout"]) {
        this.updateSetting("layout", value)
    }

    get scale(): Settings["scale"] {
        return this.settings.scale
    }

    set scale(value: Settings["scale"]) {
        this.updateSetting("scale", value)
    }

    get theme(): Settings["theme"] {
        return this.settings.theme
    }

    set theme(value: Settings["theme"]) {
        this.updateSetting("theme", value)
        this.updateDOM()
    }

    get language(): Settings["language"] {
        return this.settings.language
    }

    set language(value: Settings["language"]) {
        this.updateSetting("language", value)
    }

    get animations(): Settings["animations"] {
        return this.settings.animations
    }

    set animations(value: Settings["animations"]) {
        this.updateSetting("animations", value)
    }

    updateDOM() {
        if (!browser) return
        const isDark =
            this.theme === "dark" ||
            (this.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

        document.documentElement.classList.toggle("dark", isDark)
        document.documentElement.style.colorScheme = isDark ? "dark" : "light"
    }

    getKeymaps(): ShortcutAction[] {
        return [
            {
                keys: "shift+t",
                description: m.keymap_change_theme(),
                category: "settings",
                subtitle: () =>
                    `${m.theme()}: ${this.theme === "dark" ? m.dark() : this.theme === "light" ? m.light() : m.system()}`,
                action: () => {
                    this.theme = this.theme === "light" ? "dark" : "light"
                },
            },
            {
                keys: "shift+a",
                description: m.keymap_toggle_animations(),
                category: "settings",
                subtitle: () =>
                    `${m.animations()}: ${this.animations ? m.animations_enabled() : m.animations_disabled()}`,
                action: () => {
                    this.animations = !this.animations
                },
            },
            {
                keys: "shift+l",
                description: m.keymap_toggle_layouts(),
                category: "settings",
                subtitle: () => {
                    const layoutNames = {
                        single: m.single_page(),
                        split: m.split_pages(),
                        scroll: m.scroll_pages(),
                    }
                    return `${m.layout()}: ${layoutNames[this.layout]}`
                },
                action: () => {
                    this.layout_next()
                },
            },
            {
                keys: "shift++",
                description: m.keymap_zoom_in(),
                category: "settings",
                subtitle: () => m.scale_subtitle({ scale: Math.round(this.scale * 100) }),
                action: () => {
                    this.scale = Math.min(this.scale + 0.1, 3)
                },
            },
            {
                keys: "-",
                description: m.keymap_zoom_out(),
                category: "settings",
                subtitle: () => m.scale_subtitle({ scale: Math.round(this.scale * 100) }),
                action: () => {
                    this.scale = Math.max(this.scale - 0.1, 0.5)
                },
            },
            {
                keys: "=",
                description: m.keymap_zoom_to_fit(),
                category: "settings",
                subtitle: () => m.set_scale_150_subtitle(),
                action: () => {
                    this.scale = 1.5
                },
            },
        ]
    }
}

export const settingsStore = new SettingsStore()
