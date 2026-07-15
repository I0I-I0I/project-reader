import { beforeEach, describe, expect, it, vi } from "vitest"

const { goto, restoreFileAccess, setCurrentBook, onLibraryBookOpen, nodes, vfsStore } = vi.hoisted(
    () => {
        const restoreFileAccess = vi.fn()
        const nodes: Record<string, any> = {}
        return {
            goto: vi.fn(),
            restoreFileAccess,
            setCurrentBook: vi.fn(),
            onLibraryBookOpen: vi.fn(),
            nodes,
            vfsStore: {
                nodes,
                restoreFileAccess,
                clearForwardHistory: vi.fn(),
            },
        }
    },
)

vi.mock("$app/navigation", () => ({ goto }))
vi.mock("$app/paths", () => ({ resolve: (path: string) => path }))
vi.mock("$lib/modules/documents", () => ({ vfsStore }))
vi.mock("$lib/modules/settings", () => ({ localizedPath: (path: string) => path }))
vi.mock("../stores/viewerStore.svelte", () => ({
    viewerStore: { setCurrentBook },
}))
vi.mock("../stores/viewerStore.types", () => ({
    fileNodeToBook: (node: any) => ({ id: node.id, name: node.name, url: node.url }),
}))
vi.mock("$lib/modules/commands", async (importOriginal) => {
    const actual = await importOriginal<typeof import("$lib/modules/commands")>()
    return {
        ...actual,
        commandsStore: { execute: onLibraryBookOpen },
    }
})

import { createViewerOpenCommand } from "./viewerOpenCommand"

describe("viewer.open integration", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        for (const id of Object.keys(nodes)) delete nodes[id]
    })

    it("opens an accessible file and navigates only after the viewer accepts it", async () => {
        nodes.book = { id: "book", type: "file", name: "Book", url: "blob:book", isLocked: false }
        const onFileAccessFailure = vi.fn()

        await createViewerOpenCommand({ onFileAccessFailure }).run({ bookId: "book" })

        expect(setCurrentBook).toHaveBeenCalledWith({ id: "book", name: "Book", url: "blob:book" })
        expect(vfsStore.clearForwardHistory).toHaveBeenCalledOnce()
        expect(goto).toHaveBeenCalledWith("/viewer")
        expect(onFileAccessFailure).not.toHaveBeenCalled()
    })

    it("restores a locked file before opening the refreshed node", async () => {
        nodes.book = { id: "book", type: "file", name: "Book", url: "old", isLocked: true }
        restoreFileAccess.mockImplementation(async () => {
            nodes.book = { ...nodes.book, url: "restored", isLocked: false }
        })

        await createViewerOpenCommand({ onFileAccessFailure: vi.fn() }).run({ bookId: "book" })

        expect(restoreFileAccess).toHaveBeenCalledWith("book")
        expect(setCurrentBook).toHaveBeenCalledWith(expect.objectContaining({ url: "restored" }))
        expect(goto).toHaveBeenCalledWith("/viewer")
    })

    it("requests relink recovery and does not navigate when file access fails", async () => {
        const error = new Error("permission lost")
        nodes.book = { id: "book", type: "file", name: "Book", url: "old", isLocked: true }
        restoreFileAccess.mockRejectedValue(error)
        const onFileAccessFailure = vi.fn()

        await expect(
            createViewerOpenCommand({ onFileAccessFailure }).run({ bookId: "book" }),
        ).rejects.toBe(error)

        expect(onFileAccessFailure).toHaveBeenCalledWith({ bookId: "book", error })
        expect(setCurrentBook).not.toHaveBeenCalled()
        expect(vfsStore.clearForwardHistory).not.toHaveBeenCalled()
        expect(goto).not.toHaveBeenCalled()
    })

    it("delegates missing book selection to the Library command", async () => {
        await createViewerOpenCommand({ onFileAccessFailure: vi.fn() }).run(undefined)

        expect(onLibraryBookOpen).toHaveBeenCalledWith("library.book.open")
        expect(goto).not.toHaveBeenCalled()
    })
})
