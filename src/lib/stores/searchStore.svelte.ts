import { SvelteMap } from "svelte/reactivity";
import { viewerStore } from "./viewerStore.svelte";
import { uiStore } from "./uiStore.svelte";
import type PDFDocument from "$lib/pdf";
import { browser } from "$app/environment";
import { untrack } from "svelte";

export interface SearchMatch {
  pageNumber: number;
  start: number;
  end: number;
}

class SearchStore {
  query = $state("");
  matches = $state<SearchMatch[]>([]);
  private _currentMatchIndex = $state(-1);
  get currentMatchIndex() {
    return this._currentMatchIndex;
  }
  set currentMatchIndex(value: number) {
    this._currentMatchIndex = value;
    this.updateCSSHighlights();
  }

  isIndexing = $state(false);
  isSearching = $state(false);
  pageTexts = new SvelteMap<number, { original: string; lower: string }>();

  searchHistory = $state<string[]>([]);

  constructor() {
    if (browser) {
      try {
        const stored = localStorage.getItem("search_history");
        if (stored) {
          this.searchHistory = JSON.parse(stored);
        }
      } catch (e) {
        console.error("[SearchStore] Failed to load search history:", e);
      }
    }
  }

  addToHistory(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;

    const filtered = this.searchHistory.filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase(),
    );
    this.searchHistory = [trimmed, ...filtered].slice(0, 10);

    if (browser) {
      try {
        localStorage.setItem(
          "search_history",
          JSON.stringify(this.searchHistory),
        );
      } catch (e) {
        console.error("[SearchStore] Failed to save search history:", e);
      }
    }
  }

  private currentPdf: PDFDocument | null = null;
  private pageRanges = new SvelteMap<number, Range[]>();
  private searchTimeoutId: any = null;
  private currentSearchAbortController: AbortController | null = null;

  initPdf(pdf: PDFDocument) {
    if (this.currentPdf === pdf) return;
    this.currentPdf = pdf;

    this.query = "";
    uiStore.prompt.clearValue("search");
    this.matches = [];
    this._currentMatchIndex = -1;
    this.isSearching = false;
    this.pageTexts.clear();
    this.pageRanges.clear();
    this.updateCSSHighlights();

    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
      this.searchTimeoutId = null;
    }
    if (this.currentSearchAbortController) {
      this.currentSearchAbortController.abort();
      this.currentSearchAbortController = null;
    }

    this.isIndexing = false;
  }

  async startIndexing() {
    if (!this.currentPdf || this.isIndexing || this.pageTexts.size > 0) return;

    const pdf = this.currentPdf;
    this.isIndexing = true;
    const totalPages = pdf.pagesCount;

    try {
      for (let i = 1; i <= totalPages; i++) {
        if (this.currentPdf !== pdf) return;

        const textContent = await pdf.getTextContent(i);
        const text = textContent.items.map((item: any) => item.str).join("");
        this.pageTexts.set(i, {
          original: text,
          lower: text.toLowerCase(),
        });

        // Yield more frequently to keep UI responsive
        if (i % 2 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    } catch (e) {
      console.error("[SearchStore] Failed to index PDF:", e);
    } finally {
      if (this.currentPdf === pdf) {
        this.isIndexing = false;
      }
    }
  }

  setQuery(newQuery: string) {
    this.query = newQuery;

    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
      this.searchTimeoutId = null;
    }

    if (this.currentSearchAbortController) {
      this.currentSearchAbortController.abort();
      this.currentSearchAbortController = null;
    }

    const trimmed = newQuery.trim();
    if (!trimmed) {
      this.matches = [];
      this._currentMatchIndex = -1;
      this.isSearching = false;
      this.pageRanges.clear();
      this.updateCSSHighlights();
      return;
    }

    this.isSearching = true;
    this.searchTimeoutId = setTimeout(() => {
      this.runAsyncSearch(trimmed);
    }, 150);
  }

  private async runAsyncSearch(q: string) {
    const controller = new AbortController();
    this.currentSearchAbortController = controller;
    const signal = controller.signal;

    const matchesList: SearchMatch[] = [];
    this.matches = [];
    this._currentMatchIndex = -1;
    this.isSearching = true;

    const qLower = q.toLowerCase();
    let lastYieldTime = performance.now();
    let lastUpdateTime = performance.now();

    try {
      for (const [pageNumber, page] of this.pageTexts.entries()) {
        if (signal.aborted) return;

        const lowerText = page.lower;
        let idx = lowerText.indexOf(qLower);
        let pageMatchesFound = false;

        while (idx !== -1) {
          matchesList.push({
            pageNumber,
            start: idx,
            end: idx + qLower.length,
          });
          pageMatchesFound = true;

          if (matchesList.length >= 10000) {
            break;
          }
          idx = lowerText.indexOf(qLower, idx + 1);
        }

        const now = performance.now();
        if (pageMatchesFound && now - lastUpdateTime > 100) {
          this.matches = [...matchesList];
          if (this._currentMatchIndex === -1 && this.matches.length > 0) {
            this._currentMatchIndex = 0;
            this.goToCurrentMatch();
          }
          this.updateCSSHighlights();
          lastUpdateTime = now;
        }

        if (matchesList.length >= 10000) {
          break;
        }

        if (performance.now() - lastYieldTime > 16) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          lastYieldTime = performance.now();
          if (signal.aborted) return;
        }
      }

      if (!signal.aborted) {
        this.matches = matchesList;
        if (this._currentMatchIndex === -1 && this.matches.length > 0) {
          this._currentMatchIndex = 0;
        }
        this.updateCSSHighlights();
      }
    } catch (e) {
      console.error("[SearchStore] Error during async search:", e);
    } finally {
      if (this.currentSearchAbortController === controller) {
        this.isSearching = false;
        this.currentSearchAbortController = null;
      }
    }
  }

  next() {
    if (this.matches.length === 0) return;
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    this.goToCurrentMatch();
  }

  prev() {
    if (this.matches.length === 0) return;
    this.currentMatchIndex =
      (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    this.goToCurrentMatch();
  }

  private goToCurrentMatch() {
    if (
      this.currentMatchIndex >= 0 &&
      this.currentMatchIndex < this.matches.length
    ) {
      const match = this.matches[this.currentMatchIndex];
      const currentBook = viewerStore.getCurrentBook();

      // Only trigger a page jump if the match is on a different page.
      // This prevents resetting scrollPosition to 0 for matches on the same page.
      if (currentBook && currentBook.pageNumber !== match.pageNumber) {
        if (viewerStore.goToPage) {
          viewerStore.goToPage(match.pageNumber);
        }
      }
    }
  }

  get activeRange(): Range | null {
    if (
      this._currentMatchIndex < 0 ||
      this._currentMatchIndex >= this.matches.length
    ) {
      return null;
    }
    const activeMatch = this.matches[this._currentMatchIndex];
    const ranges = this.pageRanges.get(activeMatch.pageNumber);
    if (!ranges) return null;

    // Scan backward to count how many matches on the same page precede activeMatch
    let indexOnPage = 0;
    for (let i = this._currentMatchIndex - 1; i >= 0; i--) {
      if (this.matches[i].pageNumber === activeMatch.pageNumber) {
        indexOnPage++;
      } else {
        break;
      }
    }

    if (indexOnPage < ranges.length) {
      return ranges[indexOnPage];
    }
    return null;
  }

  registerPageRanges(pageNumber: number, ranges: Range[]) {
    this.pageRanges.set(pageNumber, ranges);
    this.updateCSSHighlights();
  }

  unregisterPageRanges(pageNumber: number) {
    if (this.pageRanges.has(pageNumber)) {
      this.pageRanges.delete(pageNumber);
      this.updateCSSHighlights();
    }
  }

  private updateCSSHighlights() {
    if (typeof CSS === "undefined" || !CSS.highlights) return;

    untrack(() => {
      const allMatchRanges: Range[] = [];
      const allActiveRanges: Range[] = [];
      const activeRange = this.activeRange;

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
              allActiveRanges.push(r);
            } else {
              allMatchRanges.push(r);
            }
          }
        }
      }

      try {
        CSS.highlights.set("search-match", new Highlight(...allMatchRanges));
        CSS.highlights.set(
          "search-match-active",
          new Highlight(...allActiveRanges),
        );
      } catch (e) {
        console.error("[SearchStore] Failed to update CSS Highlights:", e);
      }
    });
  }
}

export const searchStore = new SearchStore();
