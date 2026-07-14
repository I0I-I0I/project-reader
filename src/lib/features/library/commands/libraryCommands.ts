import { goto } from "$app/navigation"
import { resolve } from "$app/paths"
import { localizedPath } from "$lib/core/language/language"
import PDFDocument from "$lib/core/pdf/pdf"
import { settingsStore } from "$lib/core/stores/settingsStore.svelte"
import { uiStore } from "$lib/core/stores/uiStore.svelte"
import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
import type { FileNode, FolderNode } from "$lib/core/vfs/vfsStore.types"
import { defineCommands } from "$lib/features/commands/commands.types"
import { commandsStore } from "$lib/features/commands/commandsStore.svelte"
import type { PromptOption } from "$lib/features/prompt/prompt.types"
import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"
import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
import { fileNodeToBook } from "$lib/features/viewer/stores/viewerStore.types"
import PromptBookPreview from "$lib/features/library/components/PromptBookPreview.svelte"
import * as m from "$lib/paraglide/messages"

function folderUrl(folderId: string | null): string {
    if (folderId === null) return localizedPath("/")
    const path = vfsStore.getNodePath(folderId).split(" / ").join("/")
    return `${localizedPath("/")}?folder=${encodeURIComponent(path)}`
}

async function openBook(bookId: string): Promise<void> {
    let fileNode = vfsStore.nodes[bookId] as FileNode | undefined
    if (!fileNode || fileNode.type !== "file") return

    try {
        if (fileNode.isLocked) {
            await vfsStore.restoreFileAccess(fileNode.id)
            fileNode = vfsStore.nodes[fileNode.id] as FileNode
        }
        await viewerStore.setCurrentBook(fileNodeToBook(fileNode))
    } catch (error) {
        console.error("[Library] Failed to open book:", error)
        uiStore.relinkNodeId = bookId
        uiStore.isRelinkModalOpen = true
        throw error
    }

    vfsStore.clearForwardHistory()
    await goto(resolve(localizedPath("/viewer") as any))
}

function bookOptions(recursive: boolean): PromptOption<string>[] {
    let files = [...vfsStore.allFiles].sort((a, b) => b.updatedAt - a.updatedAt)
    if (recursive && vfsStore.currentFolderId !== null) {
        const descendantIds = vfsStore.currentFolderDescendantIds
        files = files.filter((file) => descendantIds.has(file.id))
    }
    return files.map((fileNode) => {
        const book = fileNodeToBook(fileNode)
        const parentPath = fileNode.parentId ? vfsStore.getNodePath(fileNode.parentId) : m.root()
        const pageInfo = book.pageNumber ? `${m.page()} ${book.pageNumber}` : m.not_read_yet()
        return {
            id: `book-${book.id}`,
            label: book.name,
            description: `${parentPath} / ${pageInfo}`,
            category: "books",
            value: book.id,
            presentation: {
                kind: "book",
                leading: PromptBookPreview,
                leadingProps: { bookId: book.id },
            },
        }
    })
}

function folderOptions(): PromptOption<string | null>[] {
    const options: PromptOption<string | null>[] = []
    if (vfsStore.currentFolderId !== null) {
        options.push({
            id: "folder-root",
            label: m.root(),
            englishLabel: m.root({}, { locale: "en" }),
            category: "navigation",
            value: null,
        })
    }
    for (const folder of Object.values(vfsStore.nodes).filter(
        (node): node is FolderNode =>
            node.type === "folder" && node.id !== vfsStore.currentFolderId,
    )) {
        options.push({
            id: `folder-${folder.id}`,
            label: vfsStore.getNodePath(folder.id),
            category: "navigation",
            value: folder.id,
        })
    }
    return options
}

function collectInvalidMoveTargets(nodeIds: string[]): Set<string> {
    const invalid = new Set<string>()
    const collect = (folderId: string) => {
        const folder = vfsStore.nodes[folderId]
        if (!folder || folder.type !== "folder") return
        for (const childId of folder.childrenIds) {
            invalid.add(childId)
            collect(childId)
        }
    }
    for (const id of nodeIds) {
        const node = vfsStore.nodes[id]
        if (!node) continue
        invalid.add(id)
        if (node.type === "folder") collect(id)
    }
    return invalid
}

function moveTargetOptions(nodeIds: string[]): PromptOption<string | null>[] {
    const options: PromptOption<string | null>[] = []
    if (nodeIds.some((id) => vfsStore.nodes[id]?.parentId !== null)) {
        options.push({
            id: "folder-root",
            label: m.root(),
            englishLabel: m.root({}, { locale: "en" }),
            value: null,
            category: "navigation",
        })
    }
    const invalid = collectInvalidMoveTargets(nodeIds)
    for (const folder of Object.values(vfsStore.nodes).filter(
        (node): node is FolderNode => node.type === "folder",
    )) {
        const alreadyThere = nodeIds.every((id) => vfsStore.nodes[id]?.parentId === folder.id)
        if (!alreadyThere && !invalid.has(folder.id)) {
            options.push({
                id: `folder-${folder.id}`,
                label: vfsStore.getNodePath(folder.id),
                value: folder.id,
                category: "navigation",
            })
        }
    }
    return options
}

async function moveNodes(nodeIds: string[], targetFolderId: string | null): Promise<void> {
    for (const id of nodeIds) {
        try {
            await vfsStore.moveNode(id, targetFolderId)
        } catch (error) {
            console.error(`Failed to move node ${id}:`, error)
            alert(error instanceof Error ? error.message : String(error))
        }
    }
    uiStore.nodeToMoveId = null
    uiStore.isSelectionMode = false
    vfsStore.clearSelection()
}

export const libraryCommands = defineCommands({
    "viewer.open": {
        id: "viewer.open",
        label: () => m.keymap_open_book(),
        englishLabel: () => m.keymap_open_book({}, { locale: "en" }),
        category: "navigation",
        run: async (payload) => {
            if (payload?.bookId) {
                await openBook(payload.bookId)
                return
            }
            const bookId = await promptStore.choose({
                id: "library-books",
                options: bookOptions(false),
                filter: "fuzzy",
            })
            if (bookId) await commandsStore.execute("viewer.open", { bookId })
        },
    },
    "library.book.open": {
        id: "library.book.open",
        keymap: "o",
        label: () => m.keymap_open_book(),
        englishLabel: () => m.keymap_open_book({}, { locale: "en" }),
        category: "menu",
        run: async (payload) => {
            await commandsStore.execute("viewer.open", payload)
        },
    },
    "library.book.open-recursive": {
        id: "library.book.open-recursive",
        keymap: "o",
        label: () => m.keymap_open_books_recursive(),
        englishLabel: () => m.keymap_open_books_recursive({}, { locale: "en" }),
        category: "menu",
        run: async (payload) => {
            if (payload?.bookId) {
                await openBook(payload.bookId)
                return
            }
            const bookId = await promptStore.choose({
                id: "library-books-recursive",
                options: bookOptions(true),
                filter: "fuzzy",
            })
            if (bookId) {
                await commandsStore.execute("library.book.open-recursive", { bookId })
            }
        },
    },
    "library.book.read-state.toggle": {
        id: "library.book.read-state.toggle",
        label: () => m.mark_as_read(),
        englishLabel: () => m.mark_as_read({}, { locale: "en" }),
        category: "commands",
        palette: false,
        run: async (payload) => {
            const node = payload?.nodeId ? vfsStore.nodes[payload.nodeId] : undefined
            if (!node || node.type !== "file") return
            let total = node.metadata.totalPages
            if (!total) {
                const url = await vfsStore.getFileUrl(node.id)
                if (url) {
                    const doc = new PDFDocument(url)
                    try {
                        await doc.load(settingsStore.scale)
                        total = await doc.getPageNumber()
                    } catch (error) {
                        console.error("Failed to read the PDF page count:", error)
                    } finally {
                        await doc.close()
                        if (vfsStore.isLockedMap[node.id]) vfsStore.revokeFileUrl(node.id)
                    }
                }
            }
            total ||= 1
            const isRead = (node.metadata.pageNumber || 1) === total
            const targetPage = (payload?.markAsRead ?? !isRead) ? total : 1
            const currentBook = viewerStore.getCurrentBook()
            if (currentBook?.id === node.id) {
                await viewerStore.updateBook({
                    ...currentBook,
                    pageNumber: targetPage,
                    totalPages: total,
                })
            } else {
                await vfsStore.updateFile(node.id, {
                    metadata: {
                        ...node.metadata,
                        pageNumber: targetPage,
                        totalPages: total,
                    },
                })
            }
        },
    },
    "library.folder.open": {
        id: "library.folder.open",
        keymap: "g",
        label: () => m.keymap_go_to_folder(),
        englishLabel: () => m.keymap_go_to_folder({}, { locale: "en" }),
        category: "menu",
        run: async (payload) => {
            if (payload && "folderId" in payload && payload.folderId !== undefined) {
                await goto(resolve(folderUrl(payload.folderId) as any))
                return
            }
            const folderId = await promptStore.choose({
                id: "library-folders",
                options: folderOptions(),
                filter: "fuzzy",
            })
            if (folderId !== undefined) {
                await commandsStore.execute("library.folder.open", { folderId })
            }
        },
    },
    "library.folder.create": {
        id: "library.folder.create",
        label: () => m.new_folder(),
        englishLabel: () => m.new_folder({}, { locale: "en" }),
        category: "commands",
        disabled: () => uiStore.isSelectionMode,
        run: async (payload) => {
            if (!payload?.name) {
                uiStore.isNewFolderModalOpen = true
                return
            }
            await vfsStore.createFolder(payload.name, vfsStore.currentFolderId)
            uiStore.isNewFolderModalOpen = false
        },
    },
    "library.continue-reading": {
        id: "library.continue-reading",
        keymap: "shift+c",
        label: () => m.keymap_continue_reading(),
        englishLabel: () => m.keymap_continue_reading({}, { locale: "en" }),
        category: "navigation",
        disabled: () => !viewerStore.getCurrentBook() || uiStore.isPickingMode,
        run: async () => {
            if (viewerStore.getCurrentBook()) {
                await goto(resolve(localizedPath("/viewer") as any))
            }
        },
    },
    "library.primary-action": {
        id: "library.primary-action",
        keymap: "shift+a",
        label: () => {
            if (!uiStore.isSelectionMode) return m.new_folder()
            const nodeIds = vfsStore.sortedCurrentNodes.map((node) => node.id)
            const allSelected =
                nodeIds.length > 0 && nodeIds.every((id) => vfsStore.selectedIds.has(id))
            return allSelected ? m.keymap_exit_selection_mode() : m.select_all()
        },
        englishLabel: () => {
            if (!uiStore.isSelectionMode) return m.new_folder({}, { locale: "en" })
            const nodeIds = vfsStore.sortedCurrentNodes.map((node) => node.id)
            const allSelected =
                nodeIds.length > 0 && nodeIds.every((id) => vfsStore.selectedIds.has(id))
            return allSelected
                ? m.keymap_exit_selection_mode({}, { locale: "en" })
                : m.select_all({}, { locale: "en" })
        },
        category: "commands",
        run: async () => {
            if (!uiStore.isSelectionMode) {
                await commandsStore.execute("library.folder.create")
                return
            }
            const nodeIds = vfsStore.sortedCurrentNodes.map((node) => node.id)
            const allSelected =
                nodeIds.length > 0 && nodeIds.every((id) => vfsStore.selectedIds.has(id))
            await commandsStore.execute(
                allSelected ? "library.selection.clear" : "library.selection.all",
            )
        },
    },
    "library.selection.toggle": {
        id: "library.selection.toggle",
        label: () => m.select(),
        category: "commands",
        palette: false,
        run: (payload) => {
            if (!payload?.nodeId) return
            uiStore.isSelectionMode = true
            vfsStore.toggleSelection(payload.nodeId)
        },
    },
    "library.selection.all": {
        id: "library.selection.all",
        label: () => m.select_all(),
        englishLabel: () => m.select_all({}, { locale: "en" }),
        category: "commands",
        disabled: () => !uiStore.isSelectionMode,
        run: () => {
            vfsStore.selectAll(vfsStore.sortedCurrentNodes.map((node) => node.id))
        },
    },
    "library.selection.clear": {
        id: "library.selection.clear",
        keymap: ["escape", "ctrl+c", "ctrl+[", "q"],
        label: () => m.keymap_exit_selection_mode(),
        englishLabel: () => m.keymap_exit_selection_mode({}, { locale: "en" }),
        category: "commands",
        allowInInputs: true,
        disabled: () => !uiStore.isSelectionMode,
        run: () => {
            uiStore.isPickingMode = false
            uiStore.isSelectionMode = false
            vfsStore.clearSelection()
        },
    },
    "library.selection.move": {
        id: "library.selection.move",
        keymap: "shift+m",
        label: () => m.move(),
        englishLabel: () => m.move({}, { locale: "en" }),
        category: "commands",
        disabled: () => !uiStore.isSelectionMode || vfsStore.selectedIds.size === 0,
        run: async (payload) => {
            const nodeIds = payload?.nodeIds ?? [...vfsStore.selectedIds]
            if (nodeIds.length === 0) return
            let targetFolderId = payload?.targetFolderId
            if (!payload || !("targetFolderId" in payload)) {
                targetFolderId = await promptStore.choose({
                    id: "library-move-target",
                    options: moveTargetOptions(nodeIds),
                    filter: "fuzzy",
                })
                if (targetFolderId === undefined) return
            }
            if (!payload || !("targetFolderId" in payload)) {
                await commandsStore.execute("library.selection.move", {
                    nodeIds,
                    targetFolderId: targetFolderId ?? null,
                })
                return
            }
            await moveNodes(nodeIds, targetFolderId ?? null)
        },
    },
    "library.selection.delete": {
        id: "library.selection.delete",
        keymap: "shift+d",
        label: () => m.delete_selected(),
        englishLabel: () => m.delete_selected({}, { locale: "en" }),
        category: "commands",
        disabled: () => !uiStore.isSelectionMode || vfsStore.selectedIds.size === 0,
        run: async (payload) => {
            const nodeIds = payload?.nodeIds ?? [...vfsStore.selectedIds]
            if (nodeIds.length === 0) return
            if (!payload?.confirmed) {
                uiStore.nodesToDeleteIds = nodeIds
                uiStore.isDeleteModalOpen = true
                return
            }
            uiStore.isDeleteModalOpen = false
            for (const id of nodeIds) await vfsStore.deleteNode(id)
            uiStore.nodesToDeleteIds = []
            if (uiStore.isSelectionMode && vfsStore.selectedIds.size === 0) {
                uiStore.isSelectionMode = false
            }
        },
    },
    "library.node.move": {
        id: "library.node.move",
        label: () => m.move(),
        category: "commands",
        palette: false,
        run: async (payload) => {
            if (!payload?.nodeId) return
            if (!("targetFolderId" in payload)) {
                const targetFolderId = await promptStore.choose({
                    id: "library-move-target",
                    options: moveTargetOptions([payload.nodeId]),
                    filter: "fuzzy",
                })
                if (targetFolderId !== undefined) {
                    await commandsStore.execute("library.node.move", {
                        nodeId: payload.nodeId,
                        targetFolderId,
                    })
                }
                return
            }
            await moveNodes([payload.nodeId], payload.targetFolderId ?? null)
        },
    },
    "library.node.delete": {
        id: "library.node.delete",
        label: () => m.delete_selected(),
        category: "commands",
        palette: false,
        run: async (payload) => {
            if (!payload?.nodeId) return
            if (!payload.confirmed) {
                uiStore.nodesToDeleteIds = [payload.nodeId]
                uiStore.isDeleteModalOpen = true
                return
            }
            uiStore.isDeleteModalOpen = false
            await vfsStore.deleteNode(payload.nodeId)
            uiStore.nodesToDeleteIds = []
        },
    },
    "library.node.edit-metadata": {
        id: "library.node.edit-metadata",
        label: () => m.edit_metadata(),
        category: "commands",
        palette: false,
        run: async (payload) => {
            if (!payload?.nodeId) return
            if (payload.name === undefined || payload.pageNumber === undefined) {
                uiStore.nodeToEditMetadataId = payload.nodeId
                uiStore.isEditMetadataModalOpen = true
                return
            }
            const node = vfsStore.nodes[payload.nodeId]
            if (!node || node.type !== "file") return
            const currentBook = viewerStore.getCurrentBook()
            if (currentBook?.id === node.id) {
                await viewerStore.updateBook({
                    ...currentBook,
                    name: payload.name,
                    pageNumber: payload.pageNumber,
                    author: payload.author ?? null,
                })
            } else {
                await vfsStore.updateFile(node.id, {
                    name: payload.name,
                    metadata: {
                        ...node.metadata,
                        author: payload.author ?? null,
                        pageNumber: payload.pageNumber,
                    },
                })
            }
            uiStore.isEditMetadataModalOpen = false
        },
    },
    "library.node.relink": {
        id: "library.node.relink",
        label: () => m.locate_file(),
        category: "commands",
        palette: false,
        run: async (payload) => {
            if (!payload?.nodeId) return
            if (!payload.fileSource) {
                uiStore.relinkNodeId = payload.nodeId
                uiStore.isRelinkModalOpen = true
                return
            }
            const node = vfsStore.nodes[payload.nodeId]
            if (!node || node.type !== "file") return
            const originalName = node.name
            const newName = payload.fileSource.name
            if (originalName && newName && originalName !== newName) {
                const confirmed = confirm(m.relink_warning({ newName, originalName }))
                if (!confirmed) return
            }
            try {
                await vfsStore.relinkFile(node.id, payload.fileSource)
                uiStore.isRelinkModalOpen = false
                uiStore.relinkNodeId = null
                await viewerStore.setCurrentBook(fileNodeToBook(node))
                await goto(resolve(localizedPath("/viewer") as any))
            } catch (error) {
                console.error("Failed to relink file:", error)
                alert(m.relink_failed())
            }
        },
    },
})
