import { browser } from "$app/environment"
import { MEDIA_QUERIES } from "$lib/breakpoints"

class UIStore {
    #isToolbarsVisible = $state(true)
    #isSelectionMode = $state(false)
    #isPromptOpen = $state(false)
    #isNewFolderModalOpen = $state(false)
    #isCompact = $state(false)
    #promptMode = $state<"global" | "files" | "page" | "move">("global")
    #nodeToMoveId = $state<string | null>(null)

    constructor() {
        if (browser) {
            const checkCompact = () => {
                const isTouch =
                    window.matchMedia("(pointer: coarse)").matches ||
                    navigator.maxTouchPoints > 0 ||
                    "ontouchstart" in window
                const isSmallScreen = window.matchMedia(MEDIA_QUERIES.TABLET).matches
                const ua = navigator.userAgent || ""
                const isUAPhone =
                    /iPhone|iPod/.test(ua) ||
                    (/Android/.test(ua) && /Mobile/.test(ua)) ||
                    /BlackBerry|IEMobile|Opera Mini|webOS/.test(ua)
                this.#isCompact = isUAPhone || (isTouch && isSmallScreen)
            }

            setTimeout(checkCompact, 0)

            const mediaQueryList = window.matchMedia(MEDIA_QUERIES.TABLET)
            if (mediaQueryList.addEventListener) {
                mediaQueryList.addEventListener("change", checkCompact)
            } else if ((mediaQueryList as any).addListener) {
                ;(mediaQueryList as any).addListener(checkCompact)
            }
        }
    }

    get isSelectionMode(): boolean {
        return this.#isSelectionMode
    }

    set isSelectionMode(value: boolean) {
        this.#isSelectionMode = value
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

    get isNewFolderModalOpen(): boolean {
        return this.#isNewFolderModalOpen
    }

    set isNewFolderModalOpen(value: boolean) {
        this.#isNewFolderModalOpen = value
    }

    get promptMode(): "global" | "files" | "page" | "move" {
        return this.#promptMode
    }

    set promptMode(value: "global" | "files" | "page" | "move") {
        this.#promptMode = value
    }

    get nodeToMoveId(): string | null {
        return this.#nodeToMoveId
    }

    set nodeToMoveId(value: string | null) {
        this.#nodeToMoveId = value
    }

    get isCompact(): boolean {
        return this.#isCompact
    }
}

export const uiStore = new UIStore()
