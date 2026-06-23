import { SvelteMap } from "svelte/reactivity"
import pLimit from "p-limit"
import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
import { uiStore } from "$lib/core/stores/uiStore.svelte"
import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
import type PDFDocument from "$lib/core/pdf/pdf"
import { browser } from "$app/environment"
import { untrack } from "svelte"

export interface SearchMatch {
    pageNumber: number
    start: number
    end: number
}

class SearchStore {
    query = $state("")
    matches = $state.raw<SearchMatch[]>([])
    private _currentMatchIndex = $state(-1)
    get currentMatchIndex() {
        return this._currentMatchIndex
    }
    set currentMatchIndex(value: number) {
        this._currentMatchIndex = value
        this.updateCSSHighlights()
    }

    isIndexing = $state(false)
    isSearching = $state(false)
    pageTexts = new SvelteMap<number, { original: string; lower: string }>()

    searchHistory = $state<string[]>([])
    searchStartPage = $state<number | null>(null)

    constructor() {
        if (browser) {
            try {
                const stored = localStorage.getItem("search_history")
                if (stored) {
                    this.searchHistory = JSON.parse(stored)
                }
            } catch (e) {
                console.error("[SearchStore] Failed to load search history:", e)
            }
        }
    }

    addToHistory(q: string) {
        const trimmed = q.trim()
        if (!trimmed) return

        const filtered = this.searchHistory.filter(
            (item) => item.toLowerCase() !== trimmed.toLowerCase(),
        )
        this.searchHistory = [trimmed, ...filtered].slice(0, 10)

        if (browser) {
            try {
                localStorage.setItem("search_history", JSON.stringify(this.searchHistory))
            } catch (e) {
                console.error("[SearchStore] Failed to save search history:", e)
            }
        }
    }

    private currentPdf: PDFDocument | null = null
    private pageRanges = new SvelteMap<number, Range[]>()
    private searchTimeoutId: any = null
    private currentSearchAbortController: AbortController | null = null
    private worker: Worker | null = null

    initPdf(pdf: PDFDocument) {
        if (this.currentPdf === pdf) return
        this.currentPdf = pdf

        this.query = ""
        uiStore.prompt.clearValue("search")
        this.matches = []
        this._currentMatchIndex = -1
        this.searchStartPage = null
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

        if (this.worker) {
            this.worker.terminate()
            this.worker = null
        }

        this.isIndexing = false
    }

    async startIndexing() {
        if (!this.currentPdf || this.isIndexing || this.pageTexts.size > 0) return

        const pdf = this.currentPdf
        const currentBook = viewerStore.getCurrentBook()
        if (!currentBook) return

        const bookId = currentBook.id
        this.isIndexing = true
        const totalPages = pdf.pagesCount

        try {
            // 1. Try to load from IndexedDB first
            const cachedTexts = await vfsStore.db.indexedTexts.getByBookId(bookId)
            if (cachedTexts && cachedTexts.length > 0 && this.currentPdf === pdf) {
                const tempMap = new Map<number, { original: string; lower: string }>()
                for (const record of cachedTexts) {
                    tempMap.set(record.pageNumber, {
                        original: record.text,
                        lower: record.text.toLowerCase(),
                    })
                }
                // Batch update to SvelteMap
                for (const [pageNum, text] of tempMap) {
                    this.pageTexts.set(pageNum, text)
                }
                return
            }

            // 2. If not cached, extract page text in parallel
            const limit = pLimit(2)
            const tasks: Promise<void>[] = []
            const recordsToSave: { pageNumber: number; text: string }[] = []
            const localTexts = new Map<number, { original: string; lower: string }>()

            for (let i = 1; i <= totalPages; i++) {
                const pageNum = i
                tasks.push(
                    limit(async () => {
                        if (this.currentPdf !== pdf) return
                        const textContent = await pdf.getTextContent(pageNum, true)
                        const text = textContent.items.map((item: any) => item.str).join("")
                        const lower = text.toLowerCase()
                        localTexts.set(pageNum, {
                            original: text,
                            lower,
                        })
                        recordsToSave.push({ pageNumber: pageNum, text })
                        // Yield to keep the browser responsive (approx one frame)
                        await new Promise((resolve) => setTimeout(resolve, 4))
                    }),
                )
            }

            await Promise.all(tasks)

            // Batch update the reactive map once all tasks are complete
            if (this.currentPdf === pdf) {
                for (const [pageNum, text] of localTexts) {
                    this.pageTexts.set(pageNum, text)
                }
            }

            // 3. Persist the extracted text in IndexedDB in batch
            if (this.currentPdf === pdf && recordsToSave.length > 0) {
                const dbRecords = recordsToSave.map((r) => ({
                    id: `${bookId}_${r.pageNumber}`,
                    bookId,
                    pageNumber: r.pageNumber,
                    text: r.text,
                }))
                await vfsStore.db.indexedTexts.bulkPut(dbRecords)
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
            this._currentMatchIndex = -1
            this.isSearching = false
            this.pageRanges.clear()
            this.updateCSSHighlights()
            return
        }

        this.isSearching = true
        this.searchTimeoutId = setTimeout(() => {
            this.runWorkerSearch(trimmed)
        }, 150)
    }

    private async runWorkerSearch(q: string) {
        if (!browser) return

        if (!this.worker) {
            const SearchWorker = (await import("$lib/searchWorker?worker")).default
            this.worker = new SearchWorker()
        }

        const controller = new AbortController()
        this.currentSearchAbortController = controller

        this.matches = []
        this._currentMatchIndex = -1
        this.isSearching = true

        // Convert SvelteMap to plain object for worker transfer
        const pageTextsObj: Record<number, { lower: string }> = {}
        for (const [pageNum, page] of this.pageTexts.entries()) {
            pageTextsObj[pageNum] = { lower: page.lower }
        }

        this.worker.onmessage = (e) => {
            if (controller.signal.aborted) return
            const { type, payload } = e.data
            if (type === "results") {
                const { matches, isPartial } = payload
                this.matches = matches

                const startPage = this.searchStartPage ?? 1
                const nearestIdx = this.findNearestMatchIndex(this.matches, startPage)
                if (nearestIdx !== -1 && nearestIdx !== this._currentMatchIndex) {
                    this._currentMatchIndex = nearestIdx
                    this.goToCurrentMatch()
                }
                this.updateCSSHighlights()

                if (!isPartial) {
                    this.isSearching = false
                    this.currentSearchAbortController = null
                }
            }
        }

        this.worker.postMessage({
            type: "search",
            payload: {
                query: q,
                pageTexts: pageTextsObj,
                searchStartPage: this.searchStartPage ?? 1,
            },
        })
    }

    private async runAsyncSearch(q: string) {
        await this.runWorkerSearch(q)
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
            const currentBook = viewerStore.getCurrentBook()

            // Only trigger a page jump if the match is on a different page.
            // This prevents resetting scrollPosition to 0 for matches on the same page.
            if (currentBook && currentBook.pageNumber !== match.pageNumber) {
                if (viewerStore.goToPage) {
                    viewerStore.goToPage(match.pageNumber)
                }
            }
        }
    }

    private findNearestMatchIndex(matches: SearchMatch[], targetPage: number): number {
        if (matches.length === 0) return -1
        let nearestIdx = 0
        let minDistance = Infinity
        for (let i = 0; i < matches.length; i++) {
            const dist = Math.abs(matches[i].pageNumber - targetPage)
            if (dist < minDistance) {
                minDistance = dist
                nearestIdx = i
            }
        }
        return nearestIdx
    }

    get activeRange(): Range | null {
        if (this._currentMatchIndex < 0 || this._currentMatchIndex >= this.matches.length) {
            return null
        }
        const activeMatch = this.matches[this._currentMatchIndex]
        const ranges = this.pageRanges.get(activeMatch.pageNumber)
        if (!ranges) return null

        // Scan backward to count how many matches on the same page precede activeMatch
        let indexOnPage = 0
        for (let i = this._currentMatchIndex - 1; i >= 0; i--) {
            if (this.matches[i].pageNumber === activeMatch.pageNumber) {
                indexOnPage++
            } else {
                break
            }
        }

        if (indexOnPage < ranges.length) {
            return ranges[indexOnPage]
        }
        return null
    }

    private highlightUpdatePending = false

    registerPageRanges(pageNumber: number, ranges: Range[]) {
        this.pageRanges.set(pageNumber, ranges)
        this.queueHighlightUpdate()
    }

    unregisterPageRanges(pageNumber: number) {
        if (this.pageRanges.has(pageNumber)) {
            this.pageRanges.delete(pageNumber)
            this.queueHighlightUpdate()
        }
    }

    private queueHighlightUpdate() {
        if (this.highlightUpdatePending) return
        this.highlightUpdatePending = true
        if (typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(() => {
                this.highlightUpdatePending = false
                this.updateCSSHighlights()
            })
        } else {
            this.highlightUpdatePending = false
            this.updateCSSHighlights()
        }
    }

    private updateCSSHighlights() {
        if (typeof CSS === "undefined" || !CSS.highlights) return

        untrack(() => {
            const allMatchRanges: Range[] = []
            const allActiveRanges: Range[] = []
            const activeRange = this.activeRange

            for (const ranges of this.pageRanges.values()) {
                for (const r of ranges) {
                    if (
                        r &&
                        r.startContainer &&
                        r.startContainer.isConnected &&
                        r.endContainer &&
                        r.endContainer.isConnected
                    ) {
                        if (r === activeRange) {
                            allActiveRanges.push(r)
                        } else {
                            allMatchRanges.push(r)
                        }
                    }
                }
            }

            try {
                CSS.highlights.set("search-match", new Highlight(...allMatchRanges))
                CSS.highlights.set("search-match-active", new Highlight(...allActiveRanges))
            } catch (e) {
                console.error("[SearchStore] Failed to update CSS Highlights:", e)
            }
        })
    }

    reset() {
        this.currentPdf = null
        this.query = ""
        this.matches = []
        this._currentMatchIndex = -1
        this.searchStartPage = null
        this.isSearching = false
        this.pageTexts.clear()
        this.pageRanges.clear()
        this.isIndexing = false
        if (this.searchTimeoutId) {
            clearTimeout(this.searchTimeoutId)
            this.searchTimeoutId = null
        }
        if (this.currentSearchAbortController) {
            this.currentSearchAbortController.abort()
            this.currentSearchAbortController = null
        }
        if (this.worker) {
            this.worker.terminate()
            this.worker = null
        }
        this.updateCSSHighlights()
    }
}

export const searchStore = new SearchStore()
