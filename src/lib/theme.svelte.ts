import { browser } from "$app/environment"

export type Theme = "light" | "dark" | "system"

class ThemeState {
    current = $state<Theme>("system")

    constructor() {
        if (browser) {
            this.current = (localStorage.getItem("theme") as Theme) || "system"

            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
            mediaQuery.addEventListener("change", () => {
                if (this.current === "system") {
                    this.updateDOM()
                }
            })
        }
    }

    set(newTheme: Theme) {
        this.current = newTheme
        if (browser) {
            localStorage.setItem("theme", newTheme)
            this.updateDOM()
        }
    }

    updateDOM() {
        if (!browser) return
        const isDark =
            this.current === "dark" ||
            (this.current === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

        document.documentElement.classList.toggle("dark", isDark)
        document.documentElement.style.colorScheme = isDark ? "dark" : "light"
    }
}

export const themeState = new ThemeState()
