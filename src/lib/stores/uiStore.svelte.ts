import { browser } from "$app/environment"
import { MEDIA_QUERIES } from "$lib/breakpoints"

type PromptMode =
    | "global"
    | "files"
    | "page"
    | "move"
    | "theme"
    | "layout"
    | "language"
    | "files-recursive"

class UIStore {
    #isToolbarsVisible = $state(true)
    #isSelectionMode = $state(false)
    #isPickingMode = $state(false)
    #_prompt = $state<{
        initialValue?: string
        isOpen: boolean
        mode: PromptMode
    }>({
        initialValue: "",
        isOpen: false,
        mode: "global",
    })
    #isNewFolderModalOpen = $state(false)
    #isDeleteModalOpen = $state(false)
    #nodesToDeleteIds = $state<string[]>([])
    #isCompact = $state(false)
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

    clearStates() {
        this.#isToolbarsVisible = false
        this.#isSelectionMode = false
        this.#isPickingMode = false
        this.#isNewFolderModalOpen = false
        this.#isDeleteModalOpen = false
        this.#nodesToDeleteIds = []
        this.#nodeToMoveId = null
    }

    get isSelectionMode(): boolean {
        return this.#isSelectionMode
    }

    set isSelectionMode(value: boolean) {
        this.#isSelectionMode = value
        if (!value && this.#_prompt.mode === "move") {
            this.#_prompt = { isOpen: false, mode: "global" }
        }
    }

    get isToolbarsVisible(): boolean {
        return this.#isToolbarsVisible
    }

    set isToolbarsVisible(value: boolean) {
        this.#isToolbarsVisible = value
    }

    get isPickingMode(): boolean {
        return this.#isPickingMode
    }

    set isPickingMode(value: boolean) {
        this.#isPickingMode = value
    }

    set prompt(value: { initialValue?: string; isOpen: boolean; mode: PromptMode }) {
        this.#_prompt = value
    }

    get prompt(): {
        initialValue: (value?: string) => string
        isOpen: (value?: boolean) => boolean
        mode: (value?: PromptMode) => PromptMode
    } {
        return {
            initialValue: (value?: string): string => {
                if (value !== undefined) {
                    this.#_prompt.initialValue = value
                }
                return this.#_prompt.initialValue || ""
            },
            isOpen: (value?: boolean): boolean => {
                if (value !== undefined) {
                    this.#_prompt.isOpen = value
                }
                return this.#_prompt.isOpen
            },
            mode: (value?: PromptMode): PromptMode => {
                if (value !== undefined && value !== this.#_prompt.mode) {
                    this.#_prompt.mode = value
                }
                return this.#_prompt.mode
            },
        }
    }

    get isNewFolderModalOpen(): boolean {
        return this.#isNewFolderModalOpen
    }

    set isNewFolderModalOpen(value: boolean) {
        this.#isNewFolderModalOpen = value
    }

    get isDeleteModalOpen(): boolean {
        return this.#isDeleteModalOpen
    }

    set isDeleteModalOpen(value: boolean) {
        this.#isDeleteModalOpen = value
    }

    get nodesToDeleteIds(): string[] {
        return this.#nodesToDeleteIds
    }

    set nodesToDeleteIds(value: string[]) {
        this.#nodesToDeleteIds = value
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
