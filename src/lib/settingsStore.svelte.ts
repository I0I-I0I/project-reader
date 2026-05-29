import { browser } from "$app/environment"

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
}

export const settingsStore = new SettingsStore()
