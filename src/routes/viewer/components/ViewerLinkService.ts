import type PDFDocument from "$lib/pdf"
import type { IPDFLinkService } from "pdfjs-dist/types/web/interfaces"

export class ViewerLinkService implements IPDFLinkService {
    private pdfDoc: PDFDocument
    private onNavigate: (pageNumber: number) => void
    private _page: number = 1
    private _rotation: number = 0
    private _externalLinkEnabled: boolean = true

    constructor(pdfDoc: PDFDocument, onNavigate: (pageNumber: number) => void) {
        this.pdfDoc = pdfDoc
        this.onNavigate = onNavigate
    }

    get pagesCount(): number {
        return this.pdfDoc.pagesCount
    }

    get page(): number {
        return this._page
    }

    set page(value: number) {
        this._page = value
    }

    get rotation(): number {
        return this._rotation
    }

    set rotation(value: number) {
        this._rotation = value
    }

    get isInPresentationMode(): boolean {
        return false
    }

    get externalLinkEnabled(): boolean {
        return this._externalLinkEnabled
    }

    set externalLinkEnabled(value: boolean) {
        this._externalLinkEnabled = value
    }

    async goToDestination(dest: string | any[]): Promise<void> {
        const pageNumber = await this.pdfDoc.resolveDestinationToPage(dest)
        if (pageNumber !== undefined && pageNumber >= 1 && pageNumber <= this.pagesCount) {
            this.onNavigate(pageNumber)
        }
    }

    goToPage(val: number | string): void {
        const pageNumber = typeof val === "string" ? parseInt(val, 10) : val
        if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= this.pagesCount) {
            this.onNavigate(pageNumber)
        }
    }

    addLinkAttributes(link: HTMLAnchorElement, url: string, _newWindow?: boolean): void {
        const isSafeProtocol = /^(https?:|mailto:|tel:)/i.test(url)
        link.href = isSafeProtocol ? url : "#"
        link.target = "_blank"
        link.rel = "noopener noreferrer"
    }

    getDestinationHash(_dest: any): string {
        return "#"
    }

    getAnchorUrl(_hash: any): string {
        return "#"
    }

    setHash(_hash: string): void {}

    executeNamedAction(action: string): void {
        if (action === "NextPage") {
            this.goToPage(this.page + 1)
        } else if (action === "PrevPage") {
            this.goToPage(this.page - 1)
        } else {
            console.log("[ViewerLinkService] Named action:", action)
        }
    }

    executeSetOCGState(_action: object): void {}
}
