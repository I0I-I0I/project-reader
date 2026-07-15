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

                try {
                    if (fileNode.isLocked) {
                        await vfsStore.restoreFileAccess(fileNode.id)
                        fileNode = vfsStore.nodes[fileNode.id] as FileNode
                    }
                    await viewerStore.setCurrentBook(fileNodeToBook(fileNode))
                } catch (error) {
                    console.error("[Viewer] Failed to open book:", error)
                    await options.onFileAccessFailure({ bookId: payload.bookId, error })
                    throw error
                }

                vfsStore.clearForwardHistory()
                await goto(resolve(localizedPath("/viewer") as any))
            },
        },
    })["viewer.open"]
}
