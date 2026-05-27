import { browser } from "$app/environment"

export interface Settings {
    layout: "single" | "split" | "scroll"
    scale: number
    theme: "light" | "dark" | "system"
    language: "en" | "ru"
}

class SettingsStore {
    private settings = $state<Settings>({
        layout: "single",
        scale: 1.5,
        theme: "system",
        language: "en",
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
    }

    get language(): Settings["language"] {
        return this.settings.language
    }

    set language(value: Settings["language"]) {
        this.updateSetting("language", value)
    }
}

export const settingsStore = new SettingsStore()
