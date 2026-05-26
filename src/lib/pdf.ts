import * as pdfjs from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"

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
    getCanvasPage(page: Page, scale?: number): Promise<string>
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

    constructor(public url: string) {}

    async load(): Promise<PDFDocument> {
        try {
            const response = await fetch(this.url)
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF data from URL: ${this.url}`)
            }
            const arrayBuffer = await response.arrayBuffer()

            const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
            this.pdfDoc = await loadingTask.promise
            this.pageCount = this.pdfDoc.numPages

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

    async getOutline(): Promise<FlatHeading[] | null> {
        if (!this.pdfDoc) {
            throw new Error("PDF document has not been loaded")
        }

        const outline = await this.pdfDoc.getOutline()
        if (!outline) {
            return null
        }

        const flatHeadings = this.parseOutline(outline)

        const resolvedHeadings = await Promise.all(
            flatHeadings.map(async (heading) => {
                let pageNumber: number | undefined = undefined
                const dest = heading.dest

                if (dest) {
                    try {
                        let explicitDest: any[] | null = null
                        if (typeof dest === "string") {
                            explicitDest = await this.pdfDoc!.getDestination(dest)
                        } else if (Array.isArray(dest)) {
                            explicitDest = dest
                        }

                        if (explicitDest && explicitDest.length > 0) {
                            const pageRef = explicitDest[0]
                            if (pageRef && typeof pageRef === "object") {
                                const pageIndex = await this.pdfDoc!.getPageIndex(pageRef)
                                pageNumber = pageIndex + 1
                            } else if (typeof pageRef === "number") {
                                pageNumber = pageRef + 1
                            }
                        }
                    } catch (err) {
                        console.warn(
                            "[PDFDocument] Failed to resolve page index for destination:",
                            heading.title,
                            err,
                        )
                    }
                }

                return {
                    ...heading,
                    pageNumber,
                }
            }),
        )

        return resolvedHeadings
    }

    async getCanvasPage(page: Page, scale: number = 1.5): Promise<string> {
        if (!this.pdfDoc) {
            throw new Error("PDF document has not been loaded")
        }

        try {
            const pdfPage = await this.pdfDoc.getPage(page.pageNumber)
            const viewport = pdfPage.getViewport({ scale })

            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")
            if (!context) {
                throw new Error("Could not instantiate HTML5 canvas 2D rendering context")
            }

            canvas.width = viewport.width
            canvas.height = viewport.height

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            }

            await pdfPage.render(renderContext).promise
            const dataUrl = canvas.toDataURL("image/png")

            pdfPage.cleanup()

            return dataUrl
        } catch (err: any) {
            console.error(`[PDFDocument] Failed to render page ${page.pageNumber}:`, err)
            throw new Error(`Failed to render page visual: ${err.message || err}`)
        }
    }

    async close(): Promise<void> {
        if (this.pdfDoc) {
            try {
                await this.pdfDoc.destroy()
            } catch (err) {
                console.warn("[PDFDocument] Error closing PDF.js instance:", err)
            }
            this.pdfDoc = null
        }
        this.title = null
        this.author = null
        this.pageCount = 0
    }
}
