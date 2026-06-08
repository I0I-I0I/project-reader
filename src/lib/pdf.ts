import * as pdfjs from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { TextContent } from "pdfjs-dist/types/src/display/api"

export class Page {
    constructor(public pageNumber: number) {}
}

interface PDFJsOutlineItem {
    title: string
    bold: boolean
    italic: boolean
    color: Uint8ClampedArray
    dest: string | any[] | null
    url: string | null
    items: PDFJsOutlineItem[]
}

export interface FlatHeading {
    title: string
    depth: number
    dest: string | any[] | null
    pageNumber?: number
}

interface DocumentInterface {
    load(): Promise<DocumentInterface>
    getAuthor(): Promise<string | null>
    getTitle(): Promise<string | null>
    getPageNumber(): Promise<number>
    getPage(pageNumber: number): Promise<Page>
    getCanvasPage(page: Page, scale?: number, signal?: AbortSignal): Promise<string>
    getAllPageDimensions(): Promise<{ width: number; height: number }[]>
    getTextContent(pageNumber: number): Promise<TextContent>
    getViewport(pageNumber: number, scale: number): Promise<pdfjs.PageViewport>
    getTextAndViewport(
        pageNumber: number,
        scale: number,
    ): Promise<{ textContent: TextContent; viewport: pdfjs.PageViewport }>
    close(): Promise<void>
}

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker
}

export default class PDFDocument implements DocumentInterface {
    private pdfDoc: pdfjs.PDFDocumentProxy | null = null
    private title: string | null = null
    private author: string | null = null
    private pageCount = 0
    public defaultWidth: number | null = null
    public defaultHeight: number | null = null
    private pageCache = new Map<number, string>()
    private pageCacheOrder: number[] = []
    private readonly MAX_PAGE_CACHE_SIZE = 30
    private renderedQuality: number | null = null
    private pageProxyCache = new Map<number, pdfjs.PDFPageProxy>()
    private pageProxyCacheOrder: number[] = []
    private readonly MAX_PAGE_PROXY_CACHE_SIZE = 10

    constructor(public url: string) {}

    async load(_quality: number = 1): Promise<PDFDocument> {
        try {
            const response = await fetch(this.url)
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF data from URL: ${this.url}`)
            }
            const arrayBuffer = await response.arrayBuffer()

            const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
            this.pdfDoc = await loadingTask.promise
            this.pageCount = this.pdfDoc.numPages

            if (this.pageCount > 0) {
                try {
                    const firstPage = await this.pdfDoc.getPage(1)
                    const viewport = firstPage.getViewport({ scale: 1 })
                    this.defaultWidth = viewport.width
                    this.defaultHeight = viewport.height
                    firstPage.cleanup()
                } catch (pageErr) {
                    console.warn(
                        "[PDFDocument] Failed to retrieve default page dimensions:",
                        pageErr,
                    )
                }
            }

            try {
                const metadata = await this.pdfDoc.getMetadata()
                this.title = (metadata.info as any)?.Title || null
                this.author = (metadata.info as any)?.Author || null
            } catch (metaErr) {
                console.warn("[PDFDocument] Failed to retrieve PDF metadata:", metaErr)
            }

            return this
        } catch (err: any) {
            console.error("[PDFDocument] Failed to load PDF:", err)
            throw new Error(`Failed to parse PDF document: ${err.message || err}`)
        }
    }

    async getAuthor(): Promise<string | null> {
        return this.author
    }

    async getTitle(): Promise<string | null> {
        return this.title
    }

    async getPageNumber(): Promise<number> {
        return this.pageCount
    }

    async getPage(pageNumber: number): Promise<Page> {
        return new Page(pageNumber)
    }

    async getAllPageDimensions(): Promise<{ width: number; height: number }[]> {
        const pdfDoc = this.getRequiredPdfDoc()
        const dimensions: { width: number; height: number }[] = []

        const batchSize = 10
        for (let i = 1; i <= this.pageCount; i += batchSize) {
            const end = Math.min(i + batchSize - 1, this.pageCount)
            const batchPromises = []
            for (let j = i; j <= end; j++) {
                batchPromises.push(pdfDoc.getPage(j))
            }

            const pages = await Promise.all(
                batchPromises.map((p) =>
                    p.catch((err) => {
                        console.warn(
                            "[PDFDocument] Individual page fetch failed during dimension pass:",
                            err,
                        )
                        return null
                    }),
                ),
            )
            for (const page of pages) {
                if (page) {
                    const viewport = page.getViewport({ scale: 1 })
                    dimensions.push({ width: viewport.width, height: viewport.height })
                    page.cleanup()
                } else {
                    dimensions.push({
                        width: this.defaultWidth || 612,
                        height: this.defaultHeight || 792,
                    })
                }
            }
        }

        return dimensions
    }

    private parseOutline(items: PDFJsOutlineItem[], depth: number = 0): FlatHeading[] {
        let headingsList: FlatHeading[] = []

        for (const item of items) {
            headingsList.push({
                title: item.title,
                depth: depth,
                dest: item.dest,
            })

            if (item.items && item.items.length > 0) {
                headingsList = headingsList.concat(this.parseOutline(item.items, depth + 1))
            }
        }

        return headingsList
    }

    async resolveDestinationToPage(dest: string | any[]): Promise<number | undefined> {
        const pdfDoc = this.getRequiredPdfDoc()
        try {
            let explicitDest: any[] | null = null
            if (typeof dest === "string") {
                explicitDest = await pdfDoc.getDestination(dest)
            } else if (Array.isArray(dest)) {
                explicitDest = dest
            }

            if (explicitDest && explicitDest.length > 0) {
                const pageRef = explicitDest[0]
                if (pageRef && typeof pageRef === "object") {
                    const pageIndex = await pdfDoc.getPageIndex(pageRef)
                    return pageIndex + 1
                } else if (typeof pageRef === "number") {
                    return pageRef + 1
                }
            }
        } catch (err) {
            console.warn("[PDFDocument] Failed to resolve page index for destination:", dest, err)
        }
        return undefined
    }

    async getAnnotations(pageNumber: number): Promise<any[]> {
        const page = await this.getPageProxy(pageNumber)
        return await page.getAnnotations()
    }

    get pagesCount(): number {
        return this.pageCount
    }

    async getOutline(): Promise<FlatHeading[] | null> {
        const pdfDoc = this.getRequiredPdfDoc()

        const outline = await pdfDoc.getOutline()
        if (!outline) {
            return null
        }

        const flatHeadings = this.parseOutline(outline)

        const resolvedHeadings = await Promise.all(
            flatHeadings.map(async (heading) => {
                let pageNumber: number | undefined = undefined
                const dest = heading.dest

                if (dest) {
                    pageNumber = await this.resolveDestinationToPage(dest)
                }

                return {
                    ...heading,
                    pageNumber,
                }
            }),
        )

        return resolvedHeadings
    }

    async getCanvasPage(page: Page, quality: number = 1, signal?: AbortSignal): Promise<string> {
        const pdfDoc = this.getRequiredPdfDoc()

        if (this.renderedQuality !== null && this.renderedQuality !== quality) {
            this.clearPageCache("quality change")
        }
        this.renderedQuality = quality

        const cacheKey = page.pageNumber
        if (this.pageCache.has(cacheKey)) {
            this.pageCacheOrder = this.pageCacheOrder.filter((k) => k !== cacheKey)
            this.pageCacheOrder.push(cacheKey)
            return this.pageCache.get(cacheKey)!
        }

        let pdfPage: pdfjs.PDFPageProxy | null = null
        try {
            pdfPage = await pdfDoc.getPage(page.pageNumber)
            if (signal?.aborted) throw new Error("Rendering cancelled")

            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")
            if (!context) {
                throw new Error("Could not instantiate HTML5 canvas 2D rendering context")
            }

            const dpr = window.devicePixelRatio || 1
            const viewport = pdfPage.getViewport({ scale: quality })

            canvas.width = viewport.width
            canvas.height = viewport.height
            canvas.style.width = `${viewport.width / dpr}px`
            canvas.style.height = `${viewport.height / dpr}px`

            context.imageSmoothingEnabled = true
            context.imageSmoothingQuality = "high"

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            }

            const renderTask = pdfPage.render(renderContext)

            const onAbort = () => {
                renderTask.cancel()
            }
            signal?.addEventListener("abort", onAbort)

            try {
                await renderTask.promise
            } finally {
                signal?.removeEventListener("abort", onAbort)
            }

            if (signal?.aborted) throw new Error("Rendering cancelled")

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/png"),
            )
            if (!blob) throw new Error("Failed to create blob from canvas")

            pdfPage.cleanup()

            const blobUrl = URL.createObjectURL(blob)
            this.pageCache.set(cacheKey, blobUrl)
            this.pageCacheOrder.push(cacheKey)
            this.enforcePageCacheLimit()
            return blobUrl
        } catch (err: any) {
            if (pdfPage) pdfPage.cleanup()
            if (
                err.name === "RenderingCancelledException" ||
                err.message === "Rendering cancelled" ||
                signal?.aborted
            ) {
                throw err
            }
            console.error(`[PDFDocument] Failed to render page ${page.pageNumber}:`, err)
            throw new Error(`Failed to render page visual: ${err.message || err}`)
        }
    }

    async getPageProxy(pageNumber: number): Promise<pdfjs.PDFPageProxy> {
        const pdfDoc = this.getRequiredPdfDoc()
        if (this.pageProxyCache.has(pageNumber)) {
            this.pageProxyCacheOrder = this.pageProxyCacheOrder.filter((num) => num !== pageNumber)
            this.pageProxyCacheOrder.push(pageNumber)
            return this.pageProxyCache.get(pageNumber)!
        }

        const page = await pdfDoc.getPage(pageNumber)

        this.pageProxyCache.set(pageNumber, page)
        this.pageProxyCacheOrder.push(pageNumber)

        if (this.pageProxyCacheOrder.length > this.MAX_PAGE_PROXY_CACHE_SIZE) {
            const evictedPageNum = this.pageProxyCacheOrder.shift()
            if (evictedPageNum !== undefined) {
                const evictedPage = this.pageProxyCache.get(evictedPageNum)
                if (evictedPage) {
                    try {
                        evictedPage.cleanup()
                    } catch (err) {
                        console.warn(
                            `[PDFDocument] Error cleaning up evicted page proxy ${evictedPageNum}:`,
                            err,
                        )
                    }
                    this.pageProxyCache.delete(evictedPageNum)
                }
            }
        }

        return page
    }

    async getTextContent(pageNumber: number): Promise<TextContent> {
        const page = await this.getPageProxy(pageNumber)
        return await page.getTextContent()
    }

    async getViewport(pageNumber: number, scale: number): Promise<pdfjs.PageViewport> {
        const page = await this.getPageProxy(pageNumber)
        return page.getViewport({ scale })
    }

    async getTextAndViewport(
        pageNumber: number,
        scale: number,
    ): Promise<{ textContent: TextContent; viewport: pdfjs.PageViewport }> {
        const page = await this.getPageProxy(pageNumber)
        const textContent = await page.getTextContent()
        const viewport = page.getViewport({ scale })
        return { textContent, viewport }
    }

    private getRequiredPdfDoc(): pdfjs.PDFDocumentProxy {
        if (!this.pdfDoc) {
            throw new Error("PDF document has not been loaded")
        }
        return this.pdfDoc
    }

    private clearPageCache(context = ""): void {
        const suffix = context ? ` during ${context}` : ""
        for (const url of this.pageCache.values()) {
            try {
                URL.revokeObjectURL(url)
            } catch (err) {
                console.warn(`[PDFDocument] Error revoking page cache URL${suffix}:`, err)
            }
        }
        this.pageCache.clear()
        this.pageCacheOrder = []
    }

    private enforcePageCacheLimit(): void {
        while (this.pageCacheOrder.length > this.MAX_PAGE_CACHE_SIZE) {
            const evictedKey = this.pageCacheOrder.shift()
            if (evictedKey !== undefined) {
                const url = this.pageCache.get(evictedKey)
                if (url) {
                    try {
                        URL.revokeObjectURL(url)
                    } catch (err) {
                        console.warn(`[PDFDocument] Error revoking evicted page cache URL:`, err)
                    }
                    this.pageCache.delete(evictedKey)
                }
            }
        }
    }

    private clearPageProxyCache(): void {
        for (const page of this.pageProxyCache.values()) {
            try {
                page.cleanup()
            } catch (err) {
                console.warn("[PDFDocument] Error cleaning up page proxy during cache clear:", err)
            }
        }
        this.pageProxyCache.clear()
        this.pageProxyCacheOrder = []
    }

    async close(): Promise<void> {
        this.clearPageProxyCache()
        if (this.pdfDoc) {
            try {
                await this.pdfDoc.destroy()
            } catch (err) {
                console.warn("[PDFDocument] Error closing PDF.js instance:", err)
            }
            this.pdfDoc = null
        }
        this.clearPageCache()
        this.title = null
        this.author = null
        this.pageCount = 0
    }
}
