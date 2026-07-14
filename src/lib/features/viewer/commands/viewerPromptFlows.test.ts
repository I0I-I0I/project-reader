import { afterEach, describe, expect, it, vi } from "vitest"
import { CommandScope } from "$lib/features/commands/commandsStore.svelte"
import { promptStore } from "$lib/features/prompt/stores/promptStore.svelte"
import { openViewerSearchPrompt } from "$lib/features/viewer/commands/viewerPromptFlows"
import { searchStore } from "$lib/features/viewer/stores/searchStore.svelte"
import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
import type PDFDocument from "$lib/core/pdf/pdf"

afterEach(() => promptStore.close())

describe("viewer prompt flows", () => {
    it("reruns an active query after uncached indexing completes", async () => {
        const getCurrentBook = vi.spyOn(viewerStore, "getCurrentBook").mockReturnValue({
            id: "search-book",
            name: "Search Book",
            updatedAt: Date.now(),
            pageNumber: 1,
        })
        const getByBookId = vi.spyOn(vfsStore.db.indexedTexts, "getByBookId").mockResolvedValue([])
        const bulkPut = vi
            .spyOn(vfsStore.db.indexedTexts, "bulkPut")
            .mockResolvedValue("search-book_1")
        const pdf = {
            pagesCount: 1,
            getTextContent: vi.fn().mockResolvedValue({ items: [{ str: "needle" }] }),
        } as unknown as PDFDocument
        searchStore.initPdf(pdf)
        searchStore.setQuery("needle")
        const setQuery = vi.spyOn(searchStore, "setQuery")

        await searchStore.startIndexing()

        expect(pdf.getTextContent).toHaveBeenCalledWith(1, true)
        expect(setQuery).toHaveBeenCalledWith("needle")
        setQuery.mockRestore()
        getByBookId.mockRestore()
        bulkPut.mockRestore()
        getCurrentBook.mockRestore()
        searchStore.reset()
    })

    it("reruns an active query after cached indexing completes", async () => {
        const getCurrentBook = vi.spyOn(viewerStore, "getCurrentBook").mockReturnValue({
            id: "cached-book",
            name: "Cached Book",
            updatedAt: Date.now(),
            pageNumber: 1,
        })
        const getByBookId = vi
            .spyOn(vfsStore.db.indexedTexts, "getByBookId")
            .mockResolvedValue([
                { id: "cached-book_1", bookId: "cached-book", pageNumber: 1, text: "cached" },
            ])
        const pdf = {
            pagesCount: 1,
            getTextContent: vi.fn(),
        } as unknown as PDFDocument
        searchStore.initPdf(pdf)
        searchStore.setQuery("cached")
        const setQuery = vi.spyOn(searchStore, "setQuery")

        await searchStore.startIndexing()

        expect(pdf.getTextContent).not.toHaveBeenCalled()
        expect(searchStore.pageTexts.get(1)?.original).toBe("cached")
        expect(searchStore.isIndexing).toBe(false)
        expect(setQuery).toHaveBeenCalledWith("cached")
        setQuery.mockRestore()
        getByBookId.mockRestore()
        getCurrentBook.mockRestore()
        searchStore.reset()
    })

    it("initializes search and closes the prompt when its viewer scope is destroyed", async () => {
        const startIndexing = vi.spyOn(searchStore, "startIndexing").mockResolvedValue()
        const scope = new CommandScope()

        const opened = openViewerSearchPrompt(scope)
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(startIndexing).toHaveBeenCalledOnce()
        expect(searchStore.searchStartPage).toBeGreaterThanOrEqual(1)
        expect(promptStore.snapshot?.request.id).toBe("viewer-search")

        scope.destroy()
        await opened
        expect(promptStore.isOpen).toBe(false)
        startIndexing.mockRestore()
    })
})
