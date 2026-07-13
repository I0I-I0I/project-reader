import * as pdfjs from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { TextContent } from "pdfjs-dist/types/src/display/api"
import { BREAKPOINTS } from "$lib/core/stores/breakpoints"
import { settingsStore } from "$lib/core/stores/settingsStore.svelte"

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
    getPageDimension(
        pageNumber: number,
        bypassCache?: boolean,
    ): Promise<{ width: number; height: number }>
    getCanvasPage(page: Page, scale?: number, signal?: AbortSignal): Promise<string>
    getAllPageDimensions(): Promise<{ width: number; height: number }[]>
    getTextContent(pageNumber: number, bypassCache?: boolean): Promise<TextContent>
    getViewport(pageNumber: number, scale: number): Promise<pdfjs.PageViewport>
    getTextAndViewport(
        pageNumber: number,
        scale: number,
    ): Promise<{ textContent: TextContent; viewport: pdfjs.PageViewport }>
    getPageDataForRendering(
        pageNumber: number,
        scale: number,
    ): Promise<{
        pageProxy: pdfjs.PDFPageProxy
        textContent: TextContent
        annotations: any[]
        viewport: pdfjs.PageViewport
    }>
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
    private pageDimensionsCache = new Map<number, { width: number; height: number }>()
    private pageCache = new Map<number, string>()
    private isMobile = false
    private get maxPageCacheSize(): number {
        return this.isMobile ? 8 : 16
    }
    private renderedQuality: number | null = null
    private pageProxyCache = new Map<number, pdfjs.PDFPageProxy>()
    private pageProxyPromises = new Map<number, Promise<pdfjs.PDFPageProxy>>()
    private get maxPageProxyCacheSize(): number {
        return this.isMobile ? 8 : 16
    }
    private outlineCache: FlatHeading[] | null = null

    constructor(public url: string) {
        if (typeof window !== "undefined") {
            const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.MOBILE}px)`)
            this.isMobile = mql.matches
            mql.addEventListener("change", (e) => {
                this.isMobile = e.matches
            })
        }
    }

    async load(_quality: number = settingsStore.quality): Promise<PDFDocument> {
        try {
            // Allow PDF.js to stream the document using range requests
            const loadingTask = pdfjs.getDocument({ url: this.url })
            this.pdfDoc = await loadingTask.promise
            this.pageCount = this.pdfDoc.numPages

            if (this.pageCount > 0) {
                try {
                    const firstPage = await this.pdfDoc.getPage(1)
                    const viewport = firstPage.getViewport({ scale: 1 })
                    this.defaultWidth = viewport.width
                    this.defaultHeight = viewport.height
                    this.pageDimensionsCache.set(1, {
                        width: viewport.width,
                        height: viewport.height,
                    })
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

    async getPageDimension(
        pageNumber: number,
        bypassCache = false,
    ): Promise<{ width: number; height: number }> {
        if (this.pageDimensionsCache.has(pageNumber)) {
            return this.pageDimensionsCache.get(pageNumber)!
        }
        if (bypassCache) {
            const pdfDoc = this.getRequiredPdfDoc()
            const page = await pdfDoc.getPage(pageNumber)
            try {
                const viewport = page.getViewport({ scale: 1 })
                const dims = { width: viewport.width, height: viewport.height }
                this.pageDimensionsCache.set(pageNumber, dims)
                return dims
            } finally {
                page.cleanup()
            }
        }
        const page = await this.getPageProxy(pageNumber)
        const viewport = page.getViewport({ scale: 1 })
        const dims = { width: viewport.width, height: viewport.height }
        this.pageDimensionsCache.set(pageNumber, dims)
        return dims
    }

    async getAllPageDimensions(): Promise<{ width: number; height: number }[]> {
        const dimensions: { width: number; height: number }[] = []
        const totalPages = this.pageCount
        const chunkSize = 10 // Reduced chunk size for better responsiveness

        for (let i = 1; i <= totalPages; i += chunkSize) {
            const end = Math.min(i + chunkSize - 1, totalPages)
            const tasks = []
            for (let j = i; j <= end; j++) {
                tasks.push(this.getPageDimension(j, true))
            }
            const chunkDims = await Promise.all(tasks)
            dimensions.push(...chunkDims)

            // Yield to main thread after each chunk (approx one frame)
            await new Promise((resolve) => setTimeout(resolve, 4))
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
        if (this.outlineCache) {
            return this.outlineCache
        }
        const pdfDoc = this.getRequiredPdfDoc()

        const outline = await pdfDoc.getOutline()
        if (!outline) {
            return null
        }

        const flatHeadings = this.parseOutline(outline)

        const resolvedHeadings: FlatHeading[] = []
        const CHUNK = 20
        for (let i = 0; i < flatHeadings.length; i += CHUNK) {
            const batch = flatHeadings.slice(i, i + CHUNK)
            const resolved = await Promise.all(
                batch.map(async (heading) => {
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
            resolvedHeadings.push(...resolved)
            if (i + CHUNK < flatHeadings.length) {
                // Yield to main thread
                await new Promise((resolve) => setTimeout(resolve, 4))
            }
        }

        this.outlineCache = resolvedHeadings
        return resolvedHeadings
    }

    async getCanvasPage(
        page: Page,
        quality: number = settingsStore.quality,
        signal?: AbortSignal,
    ): Promise<string> {
        const pdfDoc = this.getRequiredPdfDoc()

        if (this.renderedQuality !== null && this.renderedQuality !== quality) {
            this.clearPageCache("quality change")
        }
        this.renderedQuality = quality

        const cacheKey = page.pageNumber
        if (this.pageCache.has(cacheKey)) {
            const url = this.pageCache.get(cacheKey)!
            this.pageCache.delete(cacheKey)
            this.pageCache.set(cacheKey, url)
            return url
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

            const blob = await new Promise<Blob | null>((resolve) => {
                if (typeof requestIdleCallback !== "undefined") {
                    requestIdleCallback(() => canvas.toBlob(resolve, "image/webp", 0.9), {
                        timeout: 1000,
                    })
                } else {
                    canvas.toBlob(resolve, "image/webp", 0.9)
                }
            })
            if (!blob) throw new Error("Failed to create blob from canvas")

            pdfPage.cleanup()

            const blobUrl = URL.createObjectURL(blob)
            this.pageCache.set(cacheKey, blobUrl)
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
            const page = this.pageProxyCache.get(pageNumber)!
            this.pageProxyCache.delete(pageNumber)
            this.pageProxyCache.set(pageNumber, page)
            return page
        }

        if (this.pageProxyPromises.has(pageNumber)) {
            return this.pageProxyPromises.get(pageNumber)!
        }

        const promise = (async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber)

                this.pageProxyCache.set(pageNumber, page)
                this.enforcePageProxyCacheLimit()
                return page
            } finally {
                this.pageProxyPromises.delete(pageNumber)
            }
        })()

        this.pageProxyPromises.set(pageNumber, promise)
        return promise
    }

    private enforcePageProxyCacheLimit(): void {
        while (this.pageProxyCache.size > this.maxPageProxyCacheSize) {
            const evictedPageNum = this.pageProxyCache.keys().next().value
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
                }
                this.pageProxyCache.delete(evictedPageNum)
            }
        }
    }

    async getTextContent(pageNumber: number, bypassCache = false): Promise<TextContent> {
        if (bypassCache) {
            const pdfDoc = this.getRequiredPdfDoc()
            const page = await pdfDoc.getPage(pageNumber)
            try {
                return await page.getTextContent()
            } finally {
                page.cleanup()
            }
        }
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

    async getPageDataForRendering(
        pageNumber: number,
        scale: number,
    ): Promise<{
        pageProxy: pdfjs.PDFPageProxy
        textContent: TextContent
        annotations: any[]
        viewport: pdfjs.PageViewport
    }> {
        const pageProxy = await this.getPageProxy(pageNumber)
        const [textContent, annotations] = await Promise.all([
            pageProxy.getTextContent(),
            pageProxy.getAnnotations(),
        ])
        const viewport = pageProxy.getViewport({ scale })
        return { pageProxy, textContent, annotations, viewport }
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
    }

    private enforcePageCacheLimit(): void {
        while (this.pageCache.size > this.maxPageCacheSize) {
            const evictedKey = this.pageCache.keys().next().value
            if (evictedKey !== undefined) {
                const url = this.pageCache.get(evictedKey)
                if (url) {
                    try {
                        URL.revokeObjectURL(url)
                    } catch (err) {
                        console.warn(`[PDFDocument] Error revoking evicted page cache URL:`, err)
                    }
                }
                this.pageCache.delete(evictedKey)
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
        this.outlineCache = null
        this.title = null
        this.author = null
        this.pageCount = 0
    }
}
