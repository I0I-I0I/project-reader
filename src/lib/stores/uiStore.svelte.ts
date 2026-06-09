import { browser } from "$app/environment"
import { MEDIA_QUERIES } from "$lib/breakpoints"
import type { CommandNode } from "./commandsStore.svelte"

type PromptMode =
    | "global"
    | "files"
    | "page"
    | "move"
    | "theme"
    | "layout"
    | "language"
    | "files-recursive"
    | "folders"
    | "search"

class PromptState {
    #mode = $state<PromptMode>("global")
    #value = $state("")
    #initialValue = $state("")
    #isOpen = $state(false)
    #values = $state<Record<string, string>>({})

    get mode(): PromptMode {
        return this.#mode
    }

    set mode(val: PromptMode) {
        if (this.#mode !== val) {
            this.#values[this.#mode] = this.#value
            this.#mode = val
            this.#value = this.#values[val] || ""
        }
    }

    get value(): string {
        return this.#value
    }

    set value(val: string) {
        this.#value = val
        this.#values[this.#mode] = val
    }

    get initialValue(): string {
        return this.#initialValue
    }

    set initialValue(val: string) {
        this.#initialValue = val
        if (val) {
            this.#value = val
            this.#values[this.#mode] = val
        }
    }

    get isOpen(): boolean {
        return this.#isOpen
    }

    set isOpen(val: boolean) {
        this.#isOpen = val
    }

    clearValues() {
        this.#values = {}
        this.#value = ""
        this.#initialValue = ""
    }

    clearValue(mode: string) {
        this.#values[mode] = ""
        if (this.#mode === mode) {
            this.#value = ""
        }
    }
}

class UIStore {
    pickerCommandsNode = $state<CommandNode | null>(null)
    #isToolbarsVisible = $state(true)
    #isSearchModeActive = $state(false)
    #isSelectionMode = $state(false)
    #isPickingMode = $state(false)
    prompt = new PromptState()
    #isNewFolderModalOpen = $state(false)
    #isDeleteModalOpen = $state(false)
    #nodesToDeleteIds = $state<string[]>([])
    #isCompact = $state(false)
    #nodeToMoveId = $state<string | null>(null)
    #isEditMetadataModalOpen = $state(false)
    #nodeToEditMetadataId = $state<string | null>(null)

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
        this.#isEditMetadataModalOpen = false
        this.#nodeToEditMetadataId = null
        this.#isSearchModeActive = false
    }

    get isSelectionMode(): boolean {
        return this.#isSelectionMode
    }

    set isSelectionMode(value: boolean) {
        this.#isSelectionMode = value
        if (!value && this.prompt.mode === "move") {
            this.prompt.isOpen = false
            this.prompt.mode = "global"
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

    get isEditMetadataModalOpen(): boolean {
        return this.#isEditMetadataModalOpen
    }

    set isEditMetadataModalOpen(value: boolean) {
        this.#isEditMetadataModalOpen = value
    }

    get nodeToEditMetadataId(): string | null {
        return this.#nodeToEditMetadataId
    }

    set nodeToEditMetadataId(value: string | null) {
        this.#nodeToEditMetadataId = value
    }

    get isCompact(): boolean {
        return this.#isCompact
    }

    get isSearchModeActive(): boolean {
        return this.#isSearchModeActive
    }

    set isSearchModeActive(value: boolean) {
        this.#isSearchModeActive = value
    }
}

export const uiStore = new UIStore()
