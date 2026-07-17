import { createContext } from "svelte"

export class LibraryUIController {
    #isSelectionMode = $state(false)
    isPickingMode = $state(false)
    isNewFolderModalOpen = $state(false)
    isDeleteModalOpen = $state(false)
    nodesToDeleteIds = $state<string[]>([])
    nodeToMoveId = $state<string | null>(null)
    isEditMetadataModalOpen = $state(false)
    nodeToEditMetadataId = $state<string | null>(null)
    isRenameFolderModalOpen = $state(false)
    folderToRenameId = $state<string | null>(null)

    get isSelectionMode(): boolean {
        return this.#isSelectionMode
    }

    set isSelectionMode(value: boolean) {
        this.#isSelectionMode = value
        if (!value) this.isPickingMode = false
    }

    clear(): void {
        this.isSelectionMode = false
        this.isPickingMode = false
        this.isNewFolderModalOpen = false
        this.isDeleteModalOpen = false
        this.nodesToDeleteIds = []
        this.nodeToMoveId = null
        this.isEditMetadataModalOpen = false
        this.nodeToEditMetadataId = null
        this.isRenameFolderModalOpen = false
        this.folderToRenameId = null
    }
}

const [getLibraryUIContext, setLibraryUIContext] = createContext<LibraryUIController>()

export function mountLibraryUI(): LibraryUIController {
    const controller = new LibraryUIController()
    setLibraryUIContext(controller)
    return controller
}

export function useLibraryUI(): LibraryUIController {
    return getLibraryUIContext()
}
