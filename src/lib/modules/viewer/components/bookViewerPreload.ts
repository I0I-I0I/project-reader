import { Page, type PDFDocument } from "$lib/modules/pdf"
import {
    executePageRenderPlan,
    type PageRenderPlanEntry,
    type PageRenderRole,
} from "./pageSliderPolicy"

export interface BookViewerBitmapResult {
    pageNumber: number
    image: string
    dimension: { width: number; height: number } | null
}

type BitmapPdf = Pick<PDFDocument, "getCanvasPage" | "getPageDimension">

export async function renderBookViewerBitmaps({
    pdf,
    quality,
    plan,
    signal,
    skipCurrent = false,
    publish,
    onBackgroundError,
}: {
    pdf: BitmapPdf
    quality: number
    plan: readonly PageRenderPlanEntry[]
    signal: AbortSignal
    skipCurrent?: boolean
    publish: (
        role: Exclude<PageRenderRole, "lookahead">,
        results: readonly BookViewerBitmapResult[],
    ) => void
    onBackgroundError?: (error: unknown, role: Exclude<PageRenderRole, "current">) => void
}): Promise<void> {
    await executePageRenderPlan({
        plan,
        signal,
        skipCurrent,
        render: async (pageNumber, renderSignal, role) => {
            const image = await pdf.getCanvasPage(new Page(pageNumber), quality, renderSignal)
            const dimension = role === "lookahead" ? null : await pdf.getPageDimension(pageNumber)
            return { pageNumber, image, dimension }
        },
        publish,
        onBackgroundError,
    })
}
