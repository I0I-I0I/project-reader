import { browser } from "$app/environment"
import { BREAKPOINTS } from "./breakpoints"

export function isCompactViewport(
    width: number,
    isTouch: boolean,
    userAgent = "",
    userAgentMobile = false,
): boolean {
    const isPhone = /iPhone|iPod|Android|Mobi|BlackBerry|IEMobile|Opera Mini|webOS/.test(userAgent)
    return userAgentMobile || isPhone || (isTouch && width <= BREAKPOINTS.TABLET)
}

class Viewport {
    #innerWidth = $state(browser ? window.innerWidth : 1024)
    #isTouch = $state(false)
    #isShortHeight = $state(false)
    #shortHeightMql: MediaQueryList | null = null
    #listening = false

    #updateMetrics = () => {
        this.#innerWidth = window.innerWidth
        this.#isTouch =
            window.matchMedia("(pointer: coarse)").matches ||
            navigator.maxTouchPoints > 0 ||
            "ontouchstart" in window
    }

    #updateShortHeight = () => {
        this.#isShortHeight = this.#shortHeightMql?.matches ?? false
    }

    constructor() {
        this.setup()
    }

    setup(): void {
        if (!browser || this.#listening) return
        this.#listening = true
        this.#shortHeightMql = window.matchMedia("(max-height: 500px)")
        this.#updateMetrics()
        this.#updateShortHeight()
        window.addEventListener("resize", this.#updateMetrics)
        this.#shortHeightMql.addEventListener("change", this.#updateShortHeight)
    }

    dispose(): void {
        if (!browser || !this.#listening) return
        window.removeEventListener("resize", this.#updateMetrics)
        this.#shortHeightMql?.removeEventListener("change", this.#updateShortHeight)
        this.#shortHeightMql = null
        this.#listening = false
    }

    get innerWidth(): number {
        return this.#innerWidth
    }

    get isCompact(): boolean {
        return isCompactViewport(
            this.#innerWidth,
            this.#isTouch,
            browser ? navigator.userAgent : "",
            browser
                ? (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
                      ?.mobile
                : false,
        )
    }

    get isShortHeight(): boolean {
        return this.#isShortHeight
    }
}

export const viewport = new Viewport()

if (import.meta.hot) import.meta.hot.dispose(() => viewport.dispose())
