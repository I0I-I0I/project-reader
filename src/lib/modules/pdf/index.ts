export { default as PDFDocument, Page, type FlatHeading } from "./pdf"

export async function createSearchWorker(): Promise<Worker> {
    const SearchWorker = (await import("./searchWorker?worker")).default
    return new SearchWorker()
}
