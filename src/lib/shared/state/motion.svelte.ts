import { browser } from "$app/environment"

class MotionPreferences {
    private requested = $state(true)
    private reduced = $state(false)
    private query: MediaQueryList | null = null

    constructor() {
        if (!browser) return
        this.query = window.matchMedia("(prefers-reduced-motion: reduce)")
        this.reduced = this.query.matches
        this.query.addEventListener("change", this.handleChange)
    }

    private readonly handleChange = (event: MediaQueryListEvent) => {
        this.reduced = event.matches
    }

    get enabled() {
        return this.requested && !this.reduced
    }

    set enabled(value: boolean) {
        this.requested = value
    }

    dispose() {
        this.query?.removeEventListener("change", this.handleChange)
    }
}

export const motionPreferences = new MotionPreferences()

if (import.meta.hot) {
    import.meta.hot.dispose(() => motionPreferences.dispose())
}
