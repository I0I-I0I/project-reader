import { browser } from "$app/environment"
import { MEDIA_QUERIES } from "./breakpoints"

class UIStore {
    #isToolbarsVisible = $state(true)
    #isPromptOpen = $state(false)
    #isCompact = $state(false)

    constructor() {
        if (browser) {
            const checkCompact = () => {
                const isTouch = window.matchMedia("(pointer: coarse)").matches
                const isSmallScreen = window.matchMedia(MEDIA_QUERIES.TABLET).matches
                const ua = navigator.userAgent || navigator.vendor || (window as any).opera
                const isUAPhone =
                    /iPhone|iPod/.test(ua) ||
                    (/Android/.test(ua) && /Mobile/.test(ua)) ||
                    /BlackBerry|IEMobile|Opera Mini|webOS/.test(ua)
                this.#isCompact = isUAPhone || (isTouch && isSmallScreen)
            }

            checkCompact()
            const mediaQueryList = window.matchMedia(MEDIA_QUERIES.TABLET)
            mediaQueryList.addEventListener("change", checkCompact)
        }
    }

    get isToolbarsVisible(): boolean {
        return this.#isToolbarsVisible
    }

    set isToolbarsVisible(value: boolean) {
        this.#isToolbarsVisible = value
    }

    get isPromptOpen(): boolean {
        return this.#isPromptOpen
    }

    set isPromptOpen(value: boolean) {
        this.#isPromptOpen = value
    }

    get isCompact(): boolean {
        return this.#isCompact
    }
}

export const uiStore = new UIStore()
