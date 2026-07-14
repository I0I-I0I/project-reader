import * as m from "$lib/paraglide/messages"
import { type CommandScope, commandsStore } from "$lib/features/commands/commandsStore.svelte"
import {
    promptStore,
    type PromptOption,
    type PromptSelectionBehavior,
} from "$lib/features/prompt/stores/promptStore.svelte"
import { searchStore } from "$lib/features/viewer/stores/searchStore.svelte"
import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
import { uiStore } from "$lib/core/stores/uiStore.svelte"
import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
import PromptBookPreview from "$lib/features/library/components/PromptBookPreview.svelte"

type SearchChoice =
    | { kind: "history"; query: string }
    | { kind: "match"; query: string; matchIndex: number }

function matchContext(text: string, start: number, end: number, contextLength = 40) {
    const contextStart = Math.max(0, start - contextLength)
    const contextEnd = Math.min(text.length, end + contextLength)
    const prefix = contextStart > 0 ? "..." : ""
    const suffix = contextEnd < text.length ? "..." : ""
    return `${prefix}${text.slice(contextStart, contextEnd)}${suffix}`
}

function searchOptions(query: string): PromptOption<SearchChoice>[] {
    const cleanQuery = query.replace(/\u200B/g, "").trim()
    if (!cleanQuery) {
        if (searchStore.searchHistory.length === 0) return []
        return searchStore.searchHistory.map((historyQuery, index) => ({
            id: `search-history-${index}`,
            label: historyQuery,
            category: "navigation",
            value: { kind: "history", query: historyQuery },
        }))
    }

    return searchStore.matches.slice(0, 200).map((match, index) => {
        const pageText = searchStore.pageTexts.get(match.pageNumber)?.original ?? ""
        return {
            id: `search-match-${index}`,
            label: `${m.page()} ${match.pageNumber}`,
            description: matchContext(pageText, match.start, match.end),
            category: "navigation",
            value: { kind: "match", query: cleanQuery, matchIndex: index },
        }
    })
}

export async function openViewerPagePrompt(
    scope: CommandScope = commandsStore.activeScope ?? commandsStore.root,
): Promise<void> {
    const totalPages = viewerStore.activeTotalPages
    if (totalPages < 1) return
    const currentPage = viewerStore.getCurrentBook()?.pageNumber ?? 1
    const requestId = "viewer-page"
    const stopWatchingScope = scope.onDestroy(() => {
        if (promptStore.snapshot?.request.id === requestId) promptStore.close()
    })
    const selectedPage = await promptStore.choose({
        id: requestId,
        placeholder: `${m.keymap_goto_page()} (1-${totalPages})`,
        options: [],
        filter: "none",
        parseQuery: (query) => {
            const cleanQuery = query.replace(/\u200B/g, "").trim()
            if (!cleanQuery) return currentPage
            const page = Number.parseInt(cleanQuery, 10)
            if (!Number.isFinite(page) || page < 1) return undefined
            return Math.min(page, totalPages)
        },
    })
    stopWatchingScope()
    if (selectedPage !== undefined && !scope.isDestroyed) {
        await scope.execute("viewer.page.go-to", { page: selectedPage, isJump: true })
    }
}

export async function openViewerSearchPrompt(
    scope: CommandScope = commandsStore.activeScope ?? commandsStore.root,
): Promise<void> {
    searchStore.startIndexing()
    searchStore.searchStartPage = viewerStore.getCurrentBook()?.pageNumber ?? 1
    const stopRefreshing = searchStore.onMatchesChanged(() => {
        if (promptStore.snapshot?.request.id === "viewer-search") promptStore.refresh()
    })
    const requestId = "viewer-search"
    const stopWatchingScope = scope.onDestroy(() => {
        if (promptStore.snapshot?.request.id === requestId) promptStore.close()
    })
    try {
        await promptStore.open<SearchChoice>({
            id: "viewer-search",
            placeholder: m.keymap_search?.() ?? "Search PDF",
            initialQuery: searchStore.query,
            options: searchOptions,
            filter: "none",
            closeOnSelect: false,
            emptyLabel: m.search_history_empty?.() ?? "No search history or results",
            onQueryChange: (query) => {
                searchStore.setQuery(query.replace(/\u200B/g, ""))
                uiStore.isSearchModeActive = query.trim().length > 0
            },
            onSelect: async (choice, controls): Promise<PromptSelectionBehavior> => {
                if (choice.kind === "history") {
                    controls.setQuery(choice.query)
                    return "keep-open"
                }
                await scope.execute("viewer.search", {
                    query: choice.query,
                    matchIndex: choice.matchIndex,
                })
                controls.close()
                return "close"
            },
        })
    } finally {
        stopRefreshing()
        stopWatchingScope()
    }
}

export function selectViewerSearchResult(query: string, matchIndex: number): void {
    const match = searchStore.matches[matchIndex]
    if (!match) return
    searchStore.addToHistory(query)
    searchStore.currentMatchIndex = matchIndex
    const startPage = searchStore.searchStartPage
    viewerStore.goToPage?.(match.pageNumber, {
        isJump: startPage !== null && match.pageNumber !== startPage,
    })
    uiStore.isSearchModeActive = true
}

export function closeViewerSearch(): void {
    uiStore.isSearchModeActive = false
    searchStore.setQuery("")
}

export async function openViewerBookmarkPrompt(
    scope: CommandScope = commandsStore.activeScope ?? commandsStore.root,
): Promise<void> {
    const requestId = "viewer-bookmarks"
    const stopWatchingScope = scope.onDestroy(() => {
        if (promptStore.snapshot?.request.id === requestId) promptStore.close()
    })
    const bookmarkId = await promptStore.choose({
        id: requestId,
        options: bookmarksStore.bookmarks.map((bookmark) => {
            const bookName = vfsStore.nodes[bookmark.bookId]?.name ?? "Unknown Book"
            return {
                id: bookmark.id,
                label: bookmark.name,
                description: `${bookName} / ${m.page()} ${bookmark.pageNumber}`,
                category: "bookmarks",
                value: bookmark.id,
                presentation: {
                    kind: "book",
                    leading: PromptBookPreview,
                    leadingProps: { bookId: bookmark.bookId },
                },
            }
        }),
        filter: "fuzzy",
        emptyLabel: "No bookmarks yet",
    })
    stopWatchingScope()
    if (bookmarkId && !scope.isDestroyed) {
        await scope.execute("viewer.bookmark.open", { bookmarkId })
    }
}

export async function openViewerBookmark(bookmarkId: string): Promise<void> {
    const bookmark = bookmarksStore.bookmarks.find(({ id }) => id === bookmarkId)
    if (!bookmark) return
    const result = await commandsStore.execute("viewer.open", { bookId: bookmark.bookId })
    if (result.status !== "executed") return
    viewerStore.goToPage?.(bookmark.pageNumber, { isJump: true })
}
