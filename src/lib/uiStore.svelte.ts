class UIStore {
    #isToolbarsVisible = $state(true)
    #isPromptOpen = $state(false)

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
}

export const uiStore = new UIStore()
