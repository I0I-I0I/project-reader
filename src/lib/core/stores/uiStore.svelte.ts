import { browser } from "$app/environment"
import { BREAKPOINTS } from "$lib/core/stores/breakpoints"

class UIStore {
    #isToolbarsVisible = $state(true)
    #isSelectionMode = $state(false)
    #isPickingMode = $state(false)
    #isNewFolderModalOpen = $state(false)
    #isDeleteModalOpen = $state(false)
    #nodesToDeleteIds = $state<string[]>([])
    #isRelinkModalOpen = $state(false)
    #relinkNodeId = $state<string | null>(null)
    #innerWidth = $state(browser ? window.innerWidth : 1024)
    #isTouch = $state(false)
    #isShortHeight = $state(false)
    #nodeToMoveId = $state<string | null>(null)
    #isEditMetadataModalOpen = $state(false)
    #nodeToEditMetadataId = $state<string | null>(null)
    #shortHeightMql: MediaQueryList | null = null
    #listening = false

    #updateMetrics = () => {
        this.#innerWidth = window.innerWidth
        this.#isTouch =
            window.matchMedia("(pointer: coarse)").matches ||
            navigator.maxTouchPoints > 0 ||
            "ontouchstart" in window
    }

    #checkShortHeight = () => {
        this.#isShortHeight = this.#shortHeightMql?.matches ?? false
    }

    constructor() {
        this.setup()
    }

    setup() {
        if (!browser || this.#listening) return
        this.#listening = true
        this.#shortHeightMql = window.matchMedia("(max-height: 500px)")
        this.#updateMetrics()
        this.#checkShortHeight()
        window.addEventListener("resize", this.#updateMetrics)
        this.#shortHeightMql.addEventListener("change", this.#checkShortHeight)
    }

    dispose() {
        if (!browser || !this.#listening) return
        window.removeEventListener("resize", this.#updateMetrics)
        this.#shortHeightMql?.removeEventListener("change", this.#checkShortHeight)
        this.#shortHeightMql = null
        this.#listening = false
    }

    get innerWidth(): number {
        return this.#innerWidth
    }

    get isCompact(): boolean {
        const isSmallScreen = this.#innerWidth <= BREAKPOINTS.TABLET
        const ua = browser ? navigator.userAgent : ""
        const isUAPhone = /iPhone|iPod|Android|Mobi|BlackBerry|IEMobile|Opera Mini|webOS/.test(ua)
        const isUAMobile = browser ? (navigator as any).userAgentData?.mobile : false
        return isUAMobile || isUAPhone || (this.#isTouch && isSmallScreen)
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
        this.#isRelinkModalOpen = false
        this.#relinkNodeId = null
    }

    get isSelectionMode(): boolean {
        return this.#isSelectionMode
    }

    set isSelectionMode(value: boolean) {
        this.#isSelectionMode = value
        if (!value) this.#isPickingMode = false
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

    get isRelinkModalOpen(): boolean {
        return this.#isRelinkModalOpen
    }

    set isRelinkModalOpen(value: boolean) {
        this.#isRelinkModalOpen = value
    }

    get relinkNodeId(): string | null {
        return this.#relinkNodeId
    }

    set relinkNodeId(value: string | null) {
        this.#relinkNodeId = value
    }

    get isShortHeight(): boolean {
        return this.#isShortHeight
    }
}

export const uiStore = new UIStore()

if (import.meta.hot) {
    import.meta.hot.dispose(() => uiStore.dispose())
}
