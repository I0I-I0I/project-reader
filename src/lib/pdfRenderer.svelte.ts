import PDFDocument, { Page, type FlatHeading } from "./pdf"
import { settingsStore } from "./stores/settingsStore.svelte"
import { searchStore } from "./stores/searchStore.svelte"
import { uiStore } from "./stores/uiStore.svelte"
import { browser } from "$app/environment"

export class PDFRenderer {
    pdf = $state.raw<PDFDocument | null>(null)
    isLoaded = $state(false)
    isPageLoading = $state(false)
    totalPages = $state(0)

    currentPageImage = $state<string | null>(null)
    currentPageImage2 = $state<string | null>(null)
    prevPageImage = $state<string | null>(null)
    prevPageImage2 = $state<string | null>(null)
    nextPageImage = $state<string | null>(null)
    nextPageImage2 = $state<string | null>(null)

    currentPageDim1 = $state<{ width: number; height: number } | null>(null)
    currentPageDim2 = $state<{ width: number; height: number } | null>(null)
    prevPageDim1 = $state<{ width: number; height: number } | null>(null)
    prevPageDim2 = $state<{ width: number; height: number } | null>(null)
    nextPageDim1 = $state<{ width: number; height: number } | null>(null)
    nextPageDim2 = $state<{ width: number; height: number } | null>(null)

    outlineList = $state<FlatHeading[] | null>(null)
    isOutlineLoading = $state(false)

    private lastPageNo = 1
    private renderController: AbortController | null = null
    private outlineController: AbortController | null = null

    async load(url: string) {
        if (!url) {
            this.close()
            return
        }

        try {
            const doc = new PDFDocument(url)
            await doc.load(settingsStore.scale)

            this.pdf = doc
            this.totalPages = await doc.getPageNumber()
            this.isLoaded = true
            searchStore.initPdf(doc)
            return doc
        } catch (err) {
            this.isLoaded = false
            throw err
        }
    }

    async render(pageNo: number, mode: "single" | "split" | "scroll", quality: number) {
        if (!this.pdf || !this.isLoaded || mode === "scroll") {
            this.clearImages()
            return
        }

        this.renderController?.abort()
        this.renderController = new AbortController()
        const signal = this.renderController.signal

        const step = mode === "split" ? 2 : 1

        let matched = false
        if (pageNo === this.lastPageNo + step && this.nextPageImage) {
            this.currentPageImage = this.nextPageImage
            this.currentPageImage2 = this.nextPageImage2
            this.currentPageDim1 = this.nextPageDim1
            this.currentPageDim2 = this.nextPageDim2
            this.isPageLoading = false
            matched = true
        } else if (pageNo === this.lastPageNo - step && this.prevPageImage) {
            this.currentPageImage = this.prevPageImage
            this.currentPageImage2 = this.prevPageImage2
            this.currentPageDim1 = this.prevPageDim1
            this.currentPageDim2 = this.prevPageDim2
            this.isPageLoading = false
            matched = true
        }

        if (!matched) {
            this.currentPageImage = null
            this.currentPageImage2 = null
            this.currentPageDim1 = null
            this.currentPageDim2 = null
            this.isPageLoading = true
        }

        this.clearBackgroundImages()
        this.lastPageNo = pageNo

        try {
            if (!matched) {
                const page1 = await this.pdf.getPage(pageNo)
                const img1 = await this.pdf.getCanvasPage(page1, quality, signal)
                const dim1 = await this.pdf.getPageDimension(pageNo)
                let img2: string | null = null
                let dim2: { width: number; height: number } | null = null

                if (mode === "split" && pageNo + 1 <= this.totalPages) {
                    const page2 = await this.pdf.getPage(pageNo + 1)
                    img2 = await this.pdf.getCanvasPage(page2, quality, signal)
                    dim2 = await this.pdf.getPageDimension(pageNo + 1)
                }

                if (!signal.aborted) {
                    this.currentPageImage = img1
                    this.currentPageImage2 = img2
                    this.currentPageDim1 = dim1
                    this.currentPageDim2 = dim2
                    this.isPageLoading = false
                }
            }

            this.renderBackgroundPages(pageNo, mode, quality, signal)
        } catch (err: any) {
            if (!signal.aborted) {
                this.isPageLoading = false
            }
        }
    }

    private async renderBackgroundPages(
        pageNo: number,
        mode: "single" | "split" | "scroll",
        quality: number,
        signal: AbortSignal,
    ) {
        if (!this.pdf) return
        const step = mode === "split" ? 2 : 1

        // Render prev and next pages in background
        const renderBackground = async () => {
            let pImg1: string | null = null,
                pImg2: string | null = null
            let pDim1: any = null,
                pDim2: any = null

            if (uiStore.isCompact && pageNo > step) {
                try {
                    const prevPageNo = pageNo - step
                    const prevPage1 = await this.pdf!.getPage(prevPageNo)
                    pImg1 = await this.pdf!.getCanvasPage(prevPage1, quality, signal)
                    pDim1 = await this.pdf!.getPageDimension(prevPageNo)
                    if (mode === "split" && prevPageNo + 1 <= this.totalPages) {
                        const prevPage2 = await this.pdf!.getPage(prevPageNo + 1)
                        pImg2 = await this.pdf!.getCanvasPage(prevPage2, quality, signal)
                        pDim2 = await this.pdf!.getPageDimension(prevPageNo + 1)
                    }
                } catch {}
            }

            let nImg1: string | null = null,
                nImg2: string | null = null
            let nDim1: any = null,
                nDim2: any = null

            if (uiStore.isCompact && pageNo < this.totalPages) {
                try {
                    const nextPageNo = pageNo + step
                    if (nextPageNo <= this.totalPages) {
                        const nextPage1 = await this.pdf!.getPage(nextPageNo)
                        nImg1 = await this.pdf!.getCanvasPage(nextPage1, quality, signal)
                        nDim1 = await this.pdf!.getPageDimension(nextPageNo)
                        if (mode === "split" && nextPageNo + 1 <= this.totalPages) {
                            const nextPage2 = await this.pdf!.getPage(nextPageNo + 1)
                            nImg2 = await this.pdf!.getCanvasPage(nextPage2, quality, signal)
                            nDim2 = await this.pdf!.getPageDimension(nextPageNo + 1)
                        }
                    }
                } catch {}
            }

            if (!signal.aborted) {
                this.prevPageImage = pImg1
                this.prevPageImage2 = pImg2
                this.prevPageDim1 = pDim1
                this.prevPageDim2 = pDim2
                this.nextPageImage = nImg1
                this.nextPageImage2 = nImg2
                this.nextPageDim1 = nDim1
                this.nextPageDim2 = nDim2
            }
        }

        renderBackground()

        // Prerender next few pages
        const nextPages = mode === "split" ? [pageNo + 2, pageNo + 3] : [pageNo + 1, pageNo + 2]
        for (const nextPageNo of nextPages) {
            if (nextPageNo <= this.totalPages && !signal.aborted) {
                try {
                    const page = new Page(nextPageNo)
                    await this.pdf.getCanvasPage(page, quality, signal)
                } catch {}
            }
        }
    }

    async loadOutline() {
        if (!this.pdf || !this.isLoaded) return
        if (this.outlineList) return

        this.outlineController?.abort()
        this.outlineController = new AbortController()
        const signal = this.outlineController.signal

        this.isOutlineLoading = true
        try {
            const list = await this.pdf.getOutline()
            if (!signal.aborted) {
                this.outlineList = list
                this.isOutlineLoading = false
            }
        } catch (err) {
            if (!signal.aborted) {
                this.outlineList = null
                this.isOutlineLoading = false
            }
        }
    }

    clearImages() {
        this.currentPageImage = null
        this.currentPageImage2 = null
        this.currentPageDim1 = null
        this.currentPageDim2 = null
        this.isPageLoading = false
        this.clearBackgroundImages()
    }

    private clearBackgroundImages() {
        this.prevPageImage = null
        this.prevPageImage2 = null
        this.nextPageImage = null
        this.nextPageImage2 = null
        this.prevPageDim1 = null
        this.prevPageDim2 = null
        this.nextPageDim1 = null
        this.nextPageDim2 = null
    }

    close() {
        this.renderController?.abort()
        this.outlineController?.abort()
        if (this.pdf) {
            this.pdf.close()
            this.pdf = null
        }
        this.isLoaded = false
        this.outlineList = null
        this.clearImages()
    }
}
