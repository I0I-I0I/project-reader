import { viewerStore } from "./viewerStore.svelte"
import type PDFDocument from "$lib/pdf"

export interface SearchMatch {
    pageNumber: number
    start: number
    end: number
}

class SearchStore {
    query = $state("")
    currentMatchIndex = $state(-1)
    isIndexing = $state(false)
    pageTexts = $state<Map<number, string>>(new Map())

    private currentPdf: PDFDocument | null = null
    private pageRanges = new Map<number, { matchRanges: Range[]; activeRanges: Range[] }>()

    matches = $derived.by(() => {
        const matchesList: SearchMatch[] = []
        const q = this.query.trim().toLowerCase()
        if (!q) return matchesList

        for (const [pageNumber, text] of this.pageTexts.entries()) {
            const lowerText = text.toLowerCase()
            let idx = lowerText.indexOf(q)
            while (idx !== -1) {
                matchesList.push({
                    pageNumber,
                    start: idx,
                    end: idx + q.length,
                })
                idx = lowerText.indexOf(q, idx + 1)
            }
        }
        return matchesList
    })

    async indexPdf(pdf: PDFDocument) {
        if (this.currentPdf === pdf) return
        this.currentPdf = pdf

        this.query = ""
        this.currentMatchIndex = -1
        this.pageTexts.clear()
        this.pageRanges.clear()
        this.updateCSSHighlights()

        this.isIndexing = true
        const totalPages = pdf.pagesCount

        try {
            for (let i = 1; i <= totalPages; i++) {
                if (this.currentPdf !== pdf) return

                const textContent = await pdf.getTextContent(i)
                const text = textContent.items.map((item: any) => item.str).join("")
                this.pageTexts.set(i, text)

                if (i % 5 === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 0))
                }
            }
        } catch (e) {
            console.error("[SearchStore] Failed to index PDF:", e)
        } finally {
            if (this.currentPdf === pdf) {
                this.isIndexing = false
            }
        }
    }

    setQuery(newQuery: string) {
        this.query = newQuery
        this.currentMatchIndex = this.matches.length > 0 ? 0 : -1
        this.goToCurrentMatch()
    }

    next() {
        if (this.matches.length === 0) return
        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length
        this.goToCurrentMatch()
    }

    prev() {
        if (this.matches.length === 0) return
        this.currentMatchIndex =
            (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length
        this.goToCurrentMatch()
    }

    private goToCurrentMatch() {
        if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.matches.length) {
            const match = this.matches[this.currentMatchIndex]
            if (viewerStore.goToPage) {
                viewerStore.goToPage(match.pageNumber)
            }
        }
    }

    registerPageRanges(pageNumber: number, matchRanges: Range[], activeRanges: Range[]) {
        this.pageRanges.set(pageNumber, { matchRanges, activeRanges })
        this.updateCSSHighlights()
    }

    unregisterPageRanges(pageNumber: number) {
        if (this.pageRanges.has(pageNumber)) {
            this.pageRanges.delete(pageNumber)
            this.updateCSSHighlights()
        }
    }

    private updateCSSHighlights() {
        if (typeof CSS === "undefined" || !CSS.highlights) return

        const allMatchRanges: Range[] = []
        const allActiveRanges: Range[] = []

        for (const { matchRanges, activeRanges } of this.pageRanges.values()) {
            allMatchRanges.push(...matchRanges)
            allActiveRanges.push(...activeRanges)
        }

        try {
            CSS.highlights.set("search-match", new Highlight(...allMatchRanges))
            CSS.highlights.set("search-match-active", new Highlight(...allActiveRanges))
        } catch (e) {
            console.error("[SearchStore] Failed to update CSS Highlights:", e)
        }
    }
}

export const searchStore = new SearchStore()
