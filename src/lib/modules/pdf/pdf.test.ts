import { describe, expect, it, vi } from "vitest"
import PDFDocument from "./pdf"

describe("PDFDocument dimension scanning", () => {
    it("does not request later chunks after abort", async () => {
        const controller = new AbortController()
        const pdf = Object.create(PDFDocument.prototype) as PDFDocument
        Object.defineProperty(pdf, "pageCount", { value: 20, writable: true })
        const getPageDimension = vi
            .spyOn(pdf, "getPageDimension")
            .mockImplementation(async (pageNumber) => {
                if (pageNumber === 1) controller.abort()
                return { width: 600, height: 800 }
            })

        await expect(pdf.getAllPageDimensions(controller.signal)).rejects.toMatchObject({
            name: "AbortError",
        })
        expect(getPageDimension).toHaveBeenCalledTimes(1)
    })
})
