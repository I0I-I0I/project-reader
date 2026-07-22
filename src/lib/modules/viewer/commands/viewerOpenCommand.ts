import { goto } from "$app/navigation"
import { resolve } from "$app/paths"
import { commandsStore, defineCommands, type AppCommandPayloads } from "$lib/modules/commands"
import { vfsStore, type FileNode } from "$lib/modules/documents"
import { localizedPath } from "$lib/modules/settings"
import { viewerStore } from "../stores/viewerStore.svelte"
import { fileNodeToBook } from "../stores/viewerStore.types"
import * as m from "$lib/paraglide/messages"

export interface ViewerOpenFailure {
    bookId: string
    error: unknown
}

export function createViewerOpenCommand(options: {
    onFileAccessFailure: (failure: ViewerOpenFailure) => void | Promise<void>
}) {
    return defineCommands({
        "viewer.open": {
            id: "viewer.open",
            label: () => m.keymap_open_book(),
            englishLabel: () => m.keymap_open_book({}, { locale: "en" }),
            category: "navigation",
            run: async (payload: AppCommandPayloads["viewer.open"]) => {
                if (!payload?.bookId) {
                    await commandsStore.execute("library.book.open")
                    return
                }

                let fileNode = vfsStore.nodes[payload.bookId] as FileNode | undefined
                if (!fileNode || fileNode.type !== "file") return

                if (fileNode.isLocked) {
                    try {
                        await vfsStore.restoreFileAccess(fileNode.id)
                        fileNode = vfsStore.nodes[fileNode.id] as FileNode
                    } catch (error) {
                        console.error("[Viewer] Failed to restore file access:", error)
                        await options.onFileAccessFailure({ bookId: payload.bookId, error })
                        return
                    }
                }

                try {
                    await viewerStore.setCurrentBook(fileNodeToBook(fileNode))
                } catch (error) {
                    console.error("[Viewer] Unexpected book open failure:", error)
                    try {
                        await viewerStore.setCurrentBook(null)
                    } catch (cleanupError) {
                        console.error("[Viewer] Failed to clear the rejected book:", cleanupError)
                    }
                    throw error
                }

                vfsStore.clearForwardHistory()
                await goto(resolve(localizedPath("/viewer") as any))
            },
        },
    })["viewer.open"]
}
