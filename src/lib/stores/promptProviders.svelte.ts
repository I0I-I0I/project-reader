import * as m from "$lib/paraglide/messages"
import { vfsStore } from "$lib/stores/vfsStore.svelte"
import { uiStore } from "$lib/stores/uiStore.svelte"
import { settingsStore } from "$lib/stores/settingsStore.svelte"
import { viewerStore } from "$lib/stores/viewerStore.svelte"
import { fileNodeToBook } from "$lib/stores/viewerStore.types"
import { goto } from "$app/navigation"
import { locales, getLocale } from "$lib/paraglide/runtime"
import { getLanguageName } from "$lib/locale"
import { page } from "$app/state"
import { localizedPath, switchLanguage, type AppLocale } from "$lib/language"
import type { SearchItem } from "$lib/stores/promptStore.svelte"
import { CommandRegistry, getPrimaryKeysString } from "$lib/stores/commandsStore.svelte"
import type { FolderNode, FileNode } from "$lib/stores/vfsStore.types"
import { bookmarksStore } from "$lib/stores/bookmarksStore.svelte"

const reverseTranslationMap = new Map<string, string>()
let isMapInitialized = false

function initReverseTranslationMap() {
    if (isMapInitialized) return
    for (const key of Object.keys(m)) {
        const fn = (m as any)[key]
        if (typeof fn === "function" && fn.length === 0) {
            try {
                const val = fn()
                if (typeof val === "string" && val) {
                    const engText = fn({}, { locale: "en" })
                    if (typeof engText === "string") {
                        reverseTranslationMap.set(val, engText)
                    }
                }
            } catch {}
        }
    }
    isMapInitialized = true
}

export const getEnglishTranslation = (localizedText: string): string | undefined => {
    if (typeof localizedText !== "string" || !localizedText) return undefined
    initReverseTranslationMap()
    return reverseTranslationMap.get(localizedText)
}

export function getFoldersPromptItems(): SearchItem[] {
    const list: SearchItem[] = []
    if (vfsStore.currentFolderId !== null) {
        list.push({
            id: "folder-root",
            title: m.root(),
            englishTitle: m.root ? m.root({}, { locale: "en" }) : "ROOT",
            category: "navigation",
            action: () => {
                goto(localizedPath("/"))
                uiStore.prompt.mode = "global"
                uiStore.prompt.isOpen = false
            },
        })
    }

    const allFolders = Object.values(vfsStore.nodes).filter(
        (n) => n.type === "folder" && n.id !== vfsStore.currentFolderId,
    ) as FolderNode[]

    for (const folder of allFolders) {
        const nodePath = vfsStore.getNodePath(folder.id)
        // Convert "Folder / Subfolder" to "Folder/Subfolder" for the URL parameter
        const folderPath = nodePath.split(" / ").join("/")

        list.push({
            id: `folder-${folder.id}`,
            title: nodePath,
            category: "navigation",
            action: () => {
                goto(localizedPath("/") + `?folder=${encodeURIComponent(folderPath)}`)
                uiStore.prompt.mode = "global"
                uiStore.prompt.isOpen = false
            },
        })
    }
    return list
}

export function getMovePromptItems(): SearchItem[] {
    const list: SearchItem[] = []
    const nodeIdsToMove = uiStore.nodeToMoveId ? [uiStore.nodeToMoveId] : [...vfsStore.selectedIds]

    if (nodeIdsToMove.length > 0) {
        const anyNotAtRoot = nodeIdsToMove.some((id) => vfsStore.nodes[id]?.parentId !== null)
        if (anyNotAtRoot) {
            list.push({
                id: "folder-root",
                title: m.root ? m.root() : "ROOT",
                category: "navigation",
                action: async () => {
                    for (const id of nodeIdsToMove) {
                        try {
                            await vfsStore.moveNode(id, null)
                        } catch (e) {
                            console.error(`Failed to move node ${id} to root:`, e)
                            alert(e instanceof Error ? e.message : String(e))
                        }
                    }
                    uiStore.prompt.mode = "global"
                    uiStore.prompt.isOpen = false

                    uiStore.nodeToMoveId = null
                    uiStore.isSelectionMode = false
                    vfsStore.clearSelection()
                },
            })
        }

        const allFolders = Object.values(vfsStore.nodes).filter(
            (n) => n.type === "folder",
        ) as FolderNode[]
        const invalidParents = new Set<string>()

        for (const id of nodeIdsToMove) {
            const node = vfsStore.nodes[id]
            if (node) {
                invalidParents.add(node.id)
                if (node.type === "folder") {
                    const collectDescendants = (folderId: string) => {
                        const n = vfsStore.nodes[folderId]
                        if (n && n.type === "folder") {
                            for (const cid of n.childrenIds) {
                                invalidParents.add(cid)
                                collectDescendants(cid)
                            }
                        }
                    }
                    collectDescendants(node.id)
                }
            }
        }

        for (const folder of allFolders) {
            const allAlreadyThere = nodeIdsToMove.every(
                (id) => vfsStore.nodes[id]?.parentId === folder.id,
            )
            if (!allAlreadyThere && !invalidParents.has(folder.id)) {
                list.push({
                    id: `folder-${folder.id}`,
                    title: vfsStore.getNodePath(folder.id),
                    category: "navigation",
                    action: async () => {
                        for (const id of nodeIdsToMove) {
                            try {
                                await vfsStore.moveNode(id, folder.id)
                            } catch (e) {
                                console.error(`Failed to move node ${id} to ${folder.id}:`, e)
                                alert(e instanceof Error ? e.message : String(e))
                            }
                        }
                        uiStore.prompt.mode = "global"
                        uiStore.prompt.isOpen = false

                        uiStore.nodeToMoveId = null
                        uiStore.isSelectionMode = false
                        vfsStore.clearSelection()
                    },
                })
            }
        }
    }
    return list
}

export function getThemePromptItems(): SearchItem[] {
    const list: SearchItem[] = []
    list.push({
        id: "theme-light",
        title: m.light(),
        englishTitle: m.light({}, { locale: "en" }),
        category: "settings",
        subtitle: settingsStore.theme === "light" ? "✓" : undefined,
        action: () => {
            settingsStore.theme = "light"
            uiStore.prompt.isOpen = false
            uiStore.prompt.mode = "global"
        },
    })
    list.push({
        id: "theme-dark",
        title: m.dark(),
        englishTitle: m.dark({}, { locale: "en" }),
        category: "settings",
        subtitle: settingsStore.theme === "dark" ? "✓" : undefined,
        action: () => {
            settingsStore.theme = "dark"
            uiStore.prompt.isOpen = false
            uiStore.prompt.mode = "global"
        },
    })
    list.push({
        id: "theme-system",
        title: m.system(),
        englishTitle: m.system({}, { locale: "en" }),
        category: "settings",
        subtitle: settingsStore.theme === "system" ? "✓" : undefined,
        action: () => {
            settingsStore.theme = "system"
            uiStore.prompt.isOpen = false
            uiStore.prompt.mode = "global"
        },
    })
    return list
}

export function getLayoutPromptItems(): SearchItem[] {
    const list: SearchItem[] = []
    list.push({
        id: "layout-single",
        title: m.single_page(),
        englishTitle: m.single_page({}, { locale: "en" }),
        category: "settings",
        subtitle: settingsStore.layout === "single" ? "✓" : undefined,
        action: () => {
            settingsStore.layout = "single"
            uiStore.prompt.isOpen = false
            uiStore.prompt.mode = "global"
        },
    })
    list.push({
        id: "layout-split",
        title: m.split_pages(),
        englishTitle: m.split_pages({}, { locale: "en" }),
        category: "settings",
        subtitle: settingsStore.layout === "split" ? "✓" : undefined,
        action: () => {
            settingsStore.layout = "split"
            uiStore.prompt.isOpen = false
            uiStore.prompt.mode = "global"
        },
    })
    list.push({
        id: "layout-scroll",
        title: m.scroll_pages(),
        englishTitle: m.scroll_pages({}, { locale: "en" }),
        category: "settings",
        subtitle: settingsStore.layout === "scroll" ? "✓" : undefined,
        action: () => {
            settingsStore.layout = "scroll"
            uiStore.prompt.isOpen = false
            uiStore.prompt.mode = "global"
        },
    })
    return list
}

export function getLanguagePromptItems(): SearchItem[] {
    const list: SearchItem[] = []
    for (const locale of locales) {
        list.push({
            id: `language-${locale}`,
            title: getLanguageName(locale),
            category: "settings",
            subtitle: getLocale() === locale ? "✓" : undefined,
            action: () => {
                uiStore.prompt.isOpen = false
                uiStore.prompt.mode = "global"
                switchLanguage(locale as AppLocale, page.url)
            },
        })
    }
    return list
}

export function getFilesPromptItems(mode: string): SearchItem[] {
    const list: SearchItem[] = []
    let files = [...vfsStore.allFiles]
    files.sort((a, b) => b.updatedAt - a.updatedAt)

    if (mode === "files-recursive") {
        const targetFolderId = vfsStore.currentFolderId
        if (targetFolderId !== null) {
            const descendantIds = vfsStore.currentFolderDescendantIds
            files = files.filter((file) => descendantIds.has(file.id))
        }
    }

    for (const fileNode of files) {
        const book = fileNodeToBook(fileNode)
        const parentPath = fileNode.parentId
            ? vfsStore.getNodePath(fileNode.parentId)
            : m.root
              ? m.root()
              : "ROOT"
        const pageInfo = book.pageNumber ? `${m.page()} ${book.pageNumber}` : m.not_read_yet()

        list.push({
            id: `book-${book.id}`,
            title: book.name,
            subtitle: `${parentPath} / ${pageInfo}`,
            category: "books",
            action: async () => {
                let activeNode = fileNode
                if (activeNode.isLocked) {
                    try {
                        await vfsStore.restoreFileAccess(activeNode.id)
                        activeNode = vfsStore.nodes[activeNode.id] as FileNode
                    } catch (e) {
                        alert(e instanceof Error ? e.message : String(e))
                        return
                    }
                }
                await viewerStore.setCurrentBook(fileNodeToBook(activeNode))
                vfsStore.clearForwardHistory()
                goto(localizedPath("/viewer"))
                uiStore.prompt.mode = "global"
                uiStore.prompt.isOpen = false
            },
        })
    }
    return list
}

export function getCommandsPromptItems(activeNode: CommandRegistry | null): SearchItem[] {
    const list: SearchItem[] = []
    if (activeNode) {
        const commands = activeNode.getAllCommands()
        const commandGroups = new Map<string, typeof commands>()
        for (const cmd of commands) {
            const uniqueId = cmd.id || cmd.description
            if (cmd.description) {
                if (!commandGroups.has(uniqueId)) {
                    commandGroups.set(uniqueId, [])
                }
                commandGroups.get(uniqueId)!.push(cmd)
            }
        }

        for (const [uniqueId, group] of commandGroups) {
            const primaryCmd = group.reduce((best, current) => {
                if (!current.keys) return best
                if (!best.keys) return current
                const bestKeysStr = getPrimaryKeysString(best.keys)
                const currentKeysStr = getPrimaryKeysString(current.keys)
                if (currentKeysStr.includes("arrow")) return current
                return bestKeysStr.length <= currentKeysStr.length ? best : current
            }, group[0])

            const mergedKeys: string[] = []
            const seenKeys = new Set<string>()
            for (const cmd of group) {
                if (cmd.keys) {
                    const cmdKeys = Array.isArray(cmd.keys) ? cmd.keys : [cmd.keys]
                    for (let k of cmdKeys) {
                        // Keys are now pre-normalized in CommandRegistry
                        if (k && !seenKeys.has(k)) {
                            seenKeys.add(k)
                            mergedKeys.push(k)
                        }
                    }
                }
            }

            const engTitle =
                primaryCmd.englishDescription || getEnglishTranslation(primaryCmd.description)
            list.push({
                id: primaryCmd.id ? `command-${primaryCmd.id}` : `command-${uniqueId}`,
                title: primaryCmd.description,
                englishTitle: engTitle,
                subtitle: primaryCmd.subtitle ? primaryCmd.subtitle() : undefined,
                category: primaryCmd.category || "commands",
                keys: mergedKeys.length > 0 ? mergedKeys : undefined,
                action: () => {
                    const event = new KeyboardEvent("keydown", {
                        bubbles: true,
                        cancelable: true,
                    })
                    uiStore.prompt.isOpen = false
                    uiStore.prompt.mode = "global"
                    primaryCmd.action(event)
                },
            })
        }
    }
    return list
}

export function getBookmarksPromptItems(): SearchItem[] {
    const list: SearchItem[] = []
    for (const bookmark of bookmarksStore.bookmarks) {
        const bookNode = vfsStore.nodes[bookmark.bookId]
        const bookName = bookNode ? bookNode.name : "Unknown Book"
        list.push({
            id: `bookmark-${bookmark.id}`,
            title: bookmark.name,
            subtitle: `${bookName} / ${m.page()} ${bookmark.pageNumber}`,
            category: "bookmarks",
            bookId: bookmark.bookId,
            action: async () => {
                uiStore.prompt.isOpen = false
                uiStore.prompt.mode = "global"
                if (bookNode && bookNode.type === "file") {
                    await viewerStore.setCurrentBook(fileNodeToBook(bookNode))
                    viewerStore.goToPage(bookmark.pageNumber, { isJump: true })
                    goto(localizedPath("/viewer"))
                }
            },
        })
    }
    return list
}
