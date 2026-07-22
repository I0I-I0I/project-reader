import { describe, expect, it, vi } from "vitest"
import { Page } from "$lib/modules/pdf"
import { renderBookViewerBitmaps } from "./bookViewerPreload"
import { createPageRenderPlan } from "./pageSliderPolicy"

function createPdf(controller?: AbortController, abortOnPage?: number) {
    return {
        getCanvasPage: vi.fn(async (page: Page, quality: number, _signal: AbortSignal) => {
            if (page.pageNumber === abortOnPage) controller?.abort()
            return `blob:${page.pageNumber}@${quality}`
        }),
        getPageDimension: vi.fn(async (pageNumber: number) => ({
            width: 600 + pageNumber,
            height: 900 + pageNumber,
        })),
    }
}

describe("BookViewer bitmap preload wiring", () => {
    it("passes exact PDF render arguments once and suppresses stale publication", async () => {
        const controller = new AbortController()
        const quality = 2
        const pdf = createPdf(controller, 7)
        const plan = createPageRenderPlan({
            currentPage: 5,
            totalPages: 12,
            layout: "split",
            includeAdjacent: true,
        })
        const publish = vi.fn()

        await renderBookViewerBitmaps({
            pdf,
            quality,
            plan,
            signal: controller.signal,
            publish,
        })

        const submittedPages = pdf.getCanvasPage.mock.calls.map(([page]) => page.pageNumber)
        expect(submittedPages).toEqual([5, 6, 3, 4, 7])
        expect(new Set(submittedPages).size).toBe(submittedPages.length)
        for (const [page, submittedQuality, signal] of pdf.getCanvasPage.mock.calls) {
            expect(page).toBeInstanceOf(Page)
            expect(submittedQuality).toBe(quality)
            expect(signal).toBe(controller.signal)
        }
        expect(publish).toHaveBeenCalledWith("current", [
            {
                pageNumber: 5,
                image: "blob:5@2",
                dimension: { width: 605, height: 905 },
            },
            {
                pageNumber: 6,
                image: "blob:6@2",
                dimension: { width: 606, height: 906 },
            },
        ])
        expect(publish).toHaveBeenCalledWith("previous", [
            {
                pageNumber: 3,
                image: "blob:3@2",
                dimension: { width: 603, height: 903 },
            },
            {
                pageNumber: 4,
                image: "blob:4@2",
                dimension: { width: 604, height: 904 },
            },
        ])
        expect(publish).not.toHaveBeenCalledWith("next", expect.anything())
    })

    it("publishes one overlapping split render into current and previous spreads", async () => {
        const controller = new AbortController()
        const pdf = createPdf()
        const publish = vi.fn()
        const plan = createPageRenderPlan({
            currentPage: 2,
            totalPages: 10,
            layout: "split",
            includeAdjacent: true,
        })

        await renderBookViewerBitmaps({
            pdf,
            quality: 1.5,
            plan,
            signal: controller.signal,
            publish,
        })

        const submittedPages = pdf.getCanvasPage.mock.calls.map(([page]) => page.pageNumber)
        expect(submittedPages.filter((pageNumber) => pageNumber === 2)).toHaveLength(1)
        expect(new Set(submittedPages).size).toBe(submittedPages.length)
        expect(publish).toHaveBeenCalledWith(
            "previous",
            expect.arrayContaining([
                expect.objectContaining({ pageNumber: 1, image: "blob:1@1.5" }),
                expect.objectContaining({ pageNumber: 2, image: "blob:2@1.5" }),
            ]),
        )
        const previous = publish.mock.calls.find(([role]) => role === "previous")?.[1]
        expect(previous?.map((result: { pageNumber: number }) => result.pageNumber)).toEqual([1, 2])
    })
})
