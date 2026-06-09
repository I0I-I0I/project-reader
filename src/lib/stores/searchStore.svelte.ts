import { SvelteMap } from "svelte/reactivity"
import { viewerStore } from "./viewerStore.svelte"
import { uiStore } from "./uiStore.svelte"
import type PDFDocument from "$lib/pdf"

export interface SearchMatch {
    pageNumber: number
    start: number
    end: number
}

class SearchStore {
    query = $state("")
    matches = $state<SearchMatch[]>([])
    currentMatchIndex = $state(-1)
    isIndexing = $state(false)
    isSearching = $state(false)
    pageTexts = new SvelteMap<number, { original: string; lower: string }>()

    private currentPdf: PDFDocument | null = null
    private pageRanges = new Map<number, { matchRanges: Range[]; activeRanges: Range[] }>()
    private searchTimeoutId: any = null
    private currentSearchAbortController: AbortController | null = null

    async indexPdf(pdf: PDFDocument) {
        if (this.currentPdf === pdf) return
        this.currentPdf = pdf

        this.query = ""
        uiStore.prompt.clearValue("search")
        this.matches = []
        this.currentMatchIndex = -1
        this.isSearching = false
        this.pageTexts.clear()
        this.pageRanges.clear()
        this.updateCSSHighlights()

        if (this.searchTimeoutId) {
            clearTimeout(this.searchTimeoutId)
            this.searchTimeoutId = null
        }
        if (this.currentSearchAbortController) {
            this.currentSearchAbortController.abort()
            this.currentSearchAbortController = null
        }

        this.isIndexing = true
        const totalPages = pdf.pagesCount

        try {
            for (let i = 1; i <= totalPages; i++) {
                if (this.currentPdf !== pdf) return

                const textContent = await pdf.getTextContent(i)
                const text = textContent.items.map((item: any) => item.str).join("")
                this.pageTexts.set(i, {
                    original: text,
                    lower: text.toLowerCase(),
                })

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

        if (this.searchTimeoutId) {
            clearTimeout(this.searchTimeoutId)
            this.searchTimeoutId = null
        }

        if (this.currentSearchAbortController) {
            this.currentSearchAbortController.abort()
            this.currentSearchAbortController = null
        }

        const trimmed = newQuery.trim()
        if (!trimmed) {
            this.matches = []
            this.currentMatchIndex = -1
            this.isSearching = false
            this.updateCSSHighlights()
            return
        }

        this.isSearching = true
        this.searchTimeoutId = setTimeout(() => {
            this.runAsyncSearch(trimmed)
        }, 150)
    }

    private async runAsyncSearch(q: string) {
        const controller = new AbortController()
        this.currentSearchAbortController = controller
        const signal = controller.signal

        const matchesList: SearchMatch[] = []
        this.matches = []
        this.currentMatchIndex = -1
        this.isSearching = true

        const qLower = q.toLowerCase()
        let lastYieldTime = performance.now()
        let lastUpdateTime = performance.now()

        try {
            for (const [pageNumber, page] of this.pageTexts.entries()) {
                if (signal.aborted) return

                const lowerText = page.lower
                let idx = lowerText.indexOf(qLower)
                let pageMatchesFound = false

                while (idx !== -1) {
                    matchesList.push({
                        pageNumber,
                        start: idx,
                        end: idx + qLower.length,
                    })
                    pageMatchesFound = true

                    if (matchesList.length >= 10000) {
                        break
                    }
                    idx = lowerText.indexOf(qLower, idx + 1)
                }

                const now = performance.now()
                if (pageMatchesFound && now - lastUpdateTime > 100) {
                    this.matches = [...matchesList]
                    if (this.currentMatchIndex === -1 && this.matches.length > 0) {
                        this.currentMatchIndex = 0
                        this.goToCurrentMatch()
                    }
                    this.updateCSSHighlights()
                    lastUpdateTime = now
                }

                if (matchesList.length >= 10000) {
                    break
                }

                if (performance.now() - lastYieldTime > 16) {
                    await new Promise((resolve) => setTimeout(resolve, 0))
                    lastYieldTime = performance.now()
                    if (signal.aborted) return
                }
            }

            if (!signal.aborted) {
                this.matches = matchesList
                if (this.currentMatchIndex === -1 && this.matches.length > 0) {
                    this.currentMatchIndex = 0
                    this.goToCurrentMatch()
                }
                this.updateCSSHighlights()
            }
        } catch (e) {
            console.error("[SearchStore] Error during async search:", e)
        } finally {
            if (this.currentSearchAbortController === controller) {
                this.isSearching = false
                this.currentSearchAbortController = null
            }
        }
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
