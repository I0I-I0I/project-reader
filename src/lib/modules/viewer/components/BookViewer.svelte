<script lang="ts">
    import { mountViewerUI } from "../state/viewerUI.svelte"

    const viewerUI = mountViewerUI()
    import { viewport } from "$lib/shared/state/viewport.svelte"
    import { PDFDocument, Page } from "$lib/modules/pdf"
    import type { FlatHeading } from "$lib/modules/pdf"
    import Spinner from "$lib/shared/ui/Spinner.svelte"
    import Button from "$lib/shared/ui/Button.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack, onMount, onDestroy } from "svelte"
    import { on } from "svelte/events"
    import { viewerStore } from "../stores/viewerStore.svelte"
    import { vfsStore } from "$lib/modules/documents"
    import { searchStore } from "../stores/searchStore.svelte"
    import { goto, replaceState } from "$app/navigation"
    import { page } from "$app/state"
    import { resolve } from "$app/paths"

    import ViewerHeader from "./ViewerHeader.svelte"
    import Sidebar from "./Sidebar.svelte"
    import CanvasPane from "./CanvasPane.svelte"
    import ViewerFooter from "./ViewerFooter.svelte"
    import { notesStore } from "../stores/notesStore.svelte"
    import NoteIcon from "$lib/shared/icons/NoteIcon.svelte"
    import type { UserNote } from "$lib/modules/documents"
    import { bookmarksStore } from "../stores/bookmarksStore.svelte"
    import ViewerModals from "./ViewerModals.svelte"
    import { mountViewerUIStore } from "../stores/viewerUIStore.svelte"

    const viewerUIStore = mountViewerUIStore()
    import { localizedPath } from "$lib/modules/settings"
    import { settingsStore } from "$lib/modules/settings"
    import { motionPreferences } from "$lib/shared/state/motion.svelte"
    import { modalManager } from "$lib/shared/ui/modal/modalManager.svelte"
    import { cubicInOut } from "svelte/easing"
    import {
        useCommands,
        getShortcutHint,
        commandsStore,
        type CommandScope,
    } from "$lib/modules/commands"
    import TerminalIcon from "$lib/shared/icons/TerminalIcon.svelte"
    import MinimizeIcon from "$lib/shared/icons/MinimizeIcon.svelte"
    import MaximizeIcon from "$lib/shared/icons/MaximizeIcon.svelte"
    import SearchIcon from "$lib/shared/icons/SearchIcon.svelte"
    import ChevronIcon from "$lib/shared/icons/ChevronIcon.svelte"
    import { createSwipeState } from "../stores/swipe.svelte"
    import { settingsCommands } from "$lib/modules/settings"
    import { createViewerNavigationCommands } from "../commands/viewerNavigationCommands"
    import { createViewerSearchCommands } from "../commands/viewerSearchCommands"
    import { createViewerDisplayCommands } from "../commands/viewerDisplayCommands"
    import { promptStore } from "$lib/modules/prompt"
    import { createViewerMutationCommands } from "../commands/viewerMutationCommands"
    import { viewerSettingsCommands } from "../commands/viewerSettingsCommands"
    import { createViewerBookmarkCommands } from "../commands/viewerBookmarkCommandFactory"
    import { getViewerTapAction } from "../commands/viewerTapNavigation"

    let commandsNode = $state.raw<CommandScope>(undefined as any)
    let scrollContainer = $state<HTMLElement | null>(null)

    onMount(() => {
        scrollContainer = document.querySelector(".canvas-frame")
    })

    function getScrollContainer() {
        return scrollContainer
    }

    const viewerNavigationCommands = createViewerNavigationCommands({
        prompt: promptStore,
        scope: {
            onDestroy: (callback) => commandsNode.onDestroy(callback),
            get isDestroyed() {
                return commandsNode.isDestroyed
            },
        },
        viewer: {
            getCurrentPage: () => viewerStore.currentPage,
            getTotalPages: () => viewerStore.activeTotalPages,
            goToPage: (pageNumber, options) => viewerStore.goToPage?.(pageNumber, options),
            nextPage: () => nextPage(),
            previousPage: () => prevPage(),
            close: () => {
                if (notesStore.editingNote || notesStore.activePopup) {
                    notesStore.editingNote = null
                    notesStore.editorCoords = null
                    notesStore.activePopup = null
                    return
                }
                const book = viewerStore.getCurrentBook()
                if (book) vfsStore.pushForwardHistory(book.id)
                handleClose()
            },
            scroll: (payload) => {
                if (!payload) return
                const pane = getScrollContainer()
                if (!pane) return
                const amount =
                    payload.amount === "page" ? window.innerHeight / 2 : window.innerHeight * 0.2
                pane.scrollBy({
                    top: payload.direction === "up" ? -amount : amount,
                    behavior: !payload.repeated && settingsStore.animations ? "smooth" : "auto",
                })
            },
        },
    })

    const viewerSearchCommands = createViewerSearchCommands({
        prompt: promptStore,
        scope: { onDestroy: (callback) => commandsNode.onDestroy(callback) },
        viewer: {
            getCurrentPage: () => viewerStore.currentPage,
            goToPage: (pageNumber, options) => viewerStore.goToPage?.(pageNumber, options),
        },
        search: {
            get query() {
                return searchStore.query
            },
            get matches() {
                return searchStore.matches
            },
            get currentMatchIndex() {
                return searchStore.currentMatchIndex
            },
            get searchHistory() {
                return searchStore.searchHistory
            },
            get isActive() {
                return searchStore.isActive
            },
            get isIndexing() {
                return searchStore.isIndexing
            },
            get isSearching() {
                return searchStore.isSearching
            },
            startIndexing: () => searchStore.startIndexing(),
            begin: (startPage) => searchStore.begin(startPage),
            setQuery: (query) => searchStore.setQuery(query),
            selectMatch: (query, matchIndex) => searchStore.selectMatch(query, matchIndex),
            next: () => searchStore.next(),
            previous: () => searchStore.previous(),
            close: () => searchStore.close(),
            clearHistory: () => searchStore.clearHistory(),
            onMatchesChanged: (listener) => searchStore.onMatchesChanged(listener),
            pageText: (pageNumber) => searchStore.pageTexts.get(pageNumber)?.original ?? "",
        },
    })

    const viewerDisplayCommands = createViewerDisplayCommands({
        toggleOutline: () => (sidebars.outline = !sidebars.outline),
        toggleSettings: () => (sidebars.settings = !sidebars.settings),
        toggleNotes: () => (sidebars.notes = !sidebars.notes),
        toggleBookmarks: () => (sidebars.bookmarks = !sidebars.bookmarks),
        toggleToolbar: () => (viewerUI.isToolbarsVisible = !viewerUI.isToolbarsVisible),
        toggleFullscreen: async () => {
            if (document.fullscreenElement) {
                await document.exitFullscreen()
                return
            }
            await document.documentElement.requestFullscreen()
        },
    })

    const viewerBookmarkCommands = createViewerBookmarkCommands({
        prompt: promptStore,
        scope: { onDestroy: (callback) => commandsNode.onDestroy(callback) },
        bookmarks: {
            list: () => bookmarksStore.bookmarks,
            resolveBookName: (bookId) => vfsStore.nodes[bookId]?.name ?? m.unknown_book(),
            open: async (bookmarkId) => {
                const bookmark = bookmarksStore.bookmarks.find(({ id }) => id === bookmarkId)
                if (!bookmark) return
                const result = await commandsStore.execute("viewer.open", {
                    bookId: bookmark.bookId,
                })
                if (result.status === "executed") {
                    viewerStore.goToPage?.(bookmark.pageNumber, { isJump: true })
                }
            },
            isToggleBlocked: () =>
                viewerUIStore.isBookmarkAddModalOpen || viewerUIStore.bookmarkToDeleteId !== null,
            isCurrentPageBookmarked: () => {
                const bookId = viewerStore.getCurrentBook()?.id
                return bookId
                    ? bookmarksStore.bookmarks.some(
                          (bookmark) =>
                              bookmark.bookId === bookId &&
                              bookmark.pageNumber === viewerStore.currentPage,
                      )
                    : false
            },
            toggleCurrentPage: () => handleBookmarkHeaderClick(),
        },
    })
    const viewerMutationCommands = createViewerMutationCommands({
        addBookmark: async (payload: { page?: number; name?: string } | undefined) => {
            if (payload?.name && currentBookId) {
                await bookmarksStore.addBookmark(
                    currentBookId,
                    payload.page ?? viewerStore.currentPage,
                    payload.name,
                )
                viewerUIStore.closeBookmarkAddModal()
                return
            }
            viewerUIStore.openBookmarkAddModal(
                `${m.page()} ${payload?.page ?? viewerStore.currentPage}`,
            )
        },
        editBookmark: async (payload: { bookmarkId?: string; name?: string } | undefined) => {
            if (payload?.bookmarkId && payload.name?.trim()) {
                await bookmarksStore.updateBookmark(payload.bookmarkId, payload.name.trim())
            }
        },
        deleteBookmark: async (
            payload: { bookmarkId?: string; confirmed?: boolean } | undefined,
        ) => {
            const bookmarkId = payload?.bookmarkId ?? currentPageBookmark?.id
            if (!bookmarkId) return
            if (!payload?.confirmed) {
                viewerUIStore.bookmarkToDeleteId = bookmarkId
                return
            }
            await bookmarksStore.deleteBookmark(bookmarkId)
            viewerUIStore.bookmarkToDeleteId = null
        },
        addNote: () => {
            const selection = notesStore.activeSelection
            if (!selection) return
            notesStore.editingNote = {
                isNew: true,
                bookId: selection.bookId,
                pageNumber: selection.pageNumber,
                start: selection.start,
                end: selection.end,
                text: selection.text,
                color: "yellow",
                noteContent: "",
            }
            notesStore.editorCoords = { x: selection.x, y: selection.y }
            notesStore.activeSelection = null
        },
        editNote: (payload: { noteId?: string; x?: number; y?: number } | undefined) => {
            const noteId = payload?.noteId ?? notesStore.activePopup?.note.id
            const note = notesStore.notes.find(({ id }) => id === noteId)
            if (!note) return
            notesStore.editingNote = note
            notesStore.editorCoords = {
                x: payload?.x ?? window.innerWidth / 2,
                y: payload?.y ?? window.innerHeight / 2,
            }
            notesStore.activePopup = null
        },
        saveNote: () => saveCurrentNote(),
        deleteNote: async (payload: { noteId?: string; confirmed?: boolean } | undefined) => {
            const noteId =
                payload?.noteId ??
                notesStore.activePopup?.note.id ??
                (notesStore.editingNote && "id" in notesStore.editingNote
                    ? notesStore.editingNote.id
                    : undefined)
            if (!noteId) return
            if (!payload?.confirmed) {
                viewerUIStore.noteToDeleteId = noteId
                notesStore.activePopup = null
                return
            }
            await notesStore.deleteNote(noteId)
            viewerUIStore.noteToDeleteId = null
        },
    })

    commandsNode = useCommands([
        viewerBookmarkCommands["viewer.bookmark.toggle-page"],
        viewerMutationCommands["viewer.bookmark.add"]!,
        {
            ...viewerMutationCommands["viewer.bookmark.delete"]!,
            disabled: () => !currentPageBookmark && !viewerUIStore.bookmarkToDeleteId,
        },
        {
            ...viewerMutationCommands["viewer.note.add"]!,
            disabled: () => !notesStore.activeSelection,
        },
        {
            ...viewerMutationCommands["viewer.note.edit"]!,
            disabled: () => !notesStore.activePopup,
        },
        {
            ...viewerMutationCommands["viewer.note.save"]!,
            disabled: () => !notesStore.editingNote,
        },
        {
            ...viewerMutationCommands["viewer.note.delete"]!,
            disabled: () =>
                !notesStore.activePopup &&
                !viewerUIStore.noteToDeleteId &&
                !(notesStore.editingNote && "id" in notesStore.editingNote),
        },

        { ...settingsCommands["settings.layout"], keymap: "shift+l" },
        viewerSettingsCommands.zoomIn,
        viewerSettingsCommands.zoomOut,
        viewerSettingsCommands.qualityIn,
        viewerSettingsCommands.qualityOut,
        viewerNavigationCommands["viewer.scroll"],
        viewerNavigationCommands["viewer.page.next"],
        viewerNavigationCommands["viewer.page.previous"],
        viewerDisplayCommands["viewer.sidebar.outline.toggle"],
        viewerDisplayCommands["viewer.sidebar.settings.toggle"],
        viewerDisplayCommands["viewer.sidebar.notes.toggle"],
        viewerDisplayCommands["viewer.sidebar.bookmarks.toggle"],
        viewerNavigationCommands["viewer.close"],
        viewerDisplayCommands["viewer.toolbar.toggle"],
        viewerDisplayCommands["viewer.fullscreen.toggle"],
        viewerNavigationCommands["viewer.page.go-to"],
        viewerSearchCommands["viewer.search"],
        {
            ...viewerSearchCommands["viewer.search.close"],
            keymap: ["escape", "ctrl+c", "ctrl+["],
            allowInInputs: true,
            disabled: () => !searchStore.isActive,
        },
        viewerSearchCommands["viewer.search.next"],
        viewerSearchCommands["viewer.search.previous"],
        viewerSearchCommands["viewer.search.history.clear"],
    ])

    const currentBook = $derived(viewerStore.getCurrentBook())
    const url = $derived(currentBook?.url ?? "")
    const name = $derived(currentBook?.name ?? "")

    let pdf = $state.raw<PDFDocument | null>(null)
    let isLoaded = $state(false)
    let gestureHintDismissed = $state(true)

    let lastPageNo = 1
    let lastBitmapPdf: PDFDocument | null = null
    let lastBitmapLayout: "single" | "split" | "scroll" | null = null
    let lastBitmapQuality: number | null = null
    let currentPageImage = $state<string | null>(null)
    let currentPageImage2 = $state<string | null>(null)
    let prevPageImage = $state<string | null>(null)
    let prevPageImage2 = $state<string | null>(null)
    let nextPageImage = $state<string | null>(null)
    let nextPageImage2 = $state<string | null>(null)
    let currentPageDim1 = $state<{ width: number; height: number } | null>(null)
    let currentPageDim2 = $state<{ width: number; height: number } | null>(null)
    let prevPageDim1 = $state<{ width: number; height: number } | null>(null)
    let prevPageDim2 = $state<{ width: number; height: number } | null>(null)
    let nextPageDim1 = $state<{ width: number; height: number } | null>(null)
    let nextPageDim2 = $state<{ width: number; height: number } | null>(null)
    let isPageLoading = $state(false)

    let totalPages = $state(0)

    class SidebarState {
        active = $state<"left" | "settings" | null>(null)
        activeTab = $state<"outline" | "notes" | "bookmarks">("outline")

        get left() {
            return this.active === "left"
        }
        set left(v) {
            this.active = v ? "left" : null
        }
        get outline() {
            return this.active === "left" && this.activeTab === "outline"
        }
        set outline(v) {
            if (v) {
                this.active = "left"
                this.activeTab = "outline"
            } else if (this.active === "left" && this.activeTab === "outline") {
                this.active = null
            }
        }
        get settings() {
            return this.active === "settings"
        }
        set settings(v) {
            this.active = v ? "settings" : null
        }
        get notes() {
            return this.active === "left" && this.activeTab === "notes"
        }
        set notes(v) {
            if (v) {
                this.active = "left"
                this.activeTab = "notes"
            } else if (this.active === "left" && this.activeTab === "notes") {
                this.active = null
            }
        }
        get bookmarks() {
            return this.active === "left" && this.activeTab === "bookmarks"
        }
        set bookmarks(v) {
            if (v) {
                this.active = "left"
                this.activeTab = "bookmarks"
            } else if (this.active === "left" && this.activeTab === "bookmarks") {
                this.active = null
            }
        }
    }
    const sidebars = new SidebarState()

    let currentBookId = $derived(currentBook?.id)
    let currentPage = $derived(viewerStore.currentPage)

    let isCurrentPageBookmarked = $derived(
        currentBookId
            ? bookmarksStore.bookmarks.some(
                  (b) => b.bookId === currentBookId && b.pageNumber === currentPage,
              )
            : false,
    )
    let currentPageBookmark = $derived(
        currentBookId
            ? bookmarksStore.bookmarks.find(
                  (b) => b.bookId === currentBookId && b.pageNumber === currentPage,
              )
            : null,
    )

    function handleBookmarkHeaderClick() {
        if (isCurrentPageBookmarked) {
            if (currentPageBookmark) {
                viewerUIStore.bookmarkToDeleteId = currentPageBookmark.id
            }
        } else {
            viewerUIStore.openBookmarkAddModal(`${m.page()} ${currentPage}`)
        }
    }

    function saveCurrentNote() {
        const editorState = notesStore.editingNote
        if (!editorState) return

        if ("isNew" in editorState) {
            notesStore.addNote(
                editorState.bookId,
                editorState.pageNumber,
                editorState.start,
                editorState.end,
                editorState.text,
                editorState.noteContent || "",
                editorState.color,
            )
        } else {
            notesStore.updateNote(
                (editorState as UserNote).id,
                editorState.noteContent || "",
                editorState.color,
            )
        }
    }

    onMount(() => {
        gestureHintDismissed = localStorage.getItem("viewer-gesture-hint-dismissed") === "1"
        vfsStore.clearForwardHistory()
        if (vfsStore.initialized && !viewerStore.getCurrentBook()) {
            goto(resolve(localizedPath("/") as any))
            return
        }

        const handleGlobalClick = (e: MouseEvent) => {
            if (modalManager.hasAnyModal) return

            const target = e.target as HTMLElement
            if (
                !target.closest(".note-fab") &&
                !target.closest(".note-popup-surface") &&
                !target.closest(".modal-surface")
            ) {
                const selection = document.getSelection()
                if (!selection || selection.isCollapsed) {
                    notesStore.activeSelection = null
                }
                notesStore.activePopup = null
                notesStore.editingNote = null
                notesStore.editorCoords = null
            }
        }

        window.addEventListener("mousedown", handleGlobalClick)
        return () => {
            window.removeEventListener("mousedown", handleGlobalClick)
        }
    })

    $effect(() => {
        if (vfsStore.initialized) {
            const currentBook = viewerStore.getCurrentBook()
            if (!currentBook || currentBook.isLocked) {
                goto(resolve(localizedPath("/") as any))
            }
        }
    })

    // Load user highlights/notes for book
    $effect(() => {
        if (vfsStore.initialized) {
            const currentBook = viewerStore.getCurrentBook()
            if (currentBook) {
                notesStore.loadNotesForBook(currentBook.id)
            } else {
                notesStore.clear()
            }
        }
    })

    // Listen to SvelteKit page.state updates to restore navigation positions
    $effect(() => {
        const state = page.state as App.PageState
        if (state && state._pdfjump) {
            const last = viewerStore.lastSetPageState
            if (
                last &&
                last.page === state.page &&
                last.scrollPosition === state.scrollPosition &&
                last.bookId === state.bookId
            ) {
                return
            }
            viewerStore.restoreFromHistoryState(state as any)
        }
    })

    let updateTimeout: ReturnType<typeof setTimeout> | undefined
    $effect(() => {
        if (isLoaded) {
            const cPage = viewerStore.currentPage
            const sPos = viewerStore.scrollPosition
            const activeBook = viewerStore.getCurrentBook()
            if (!activeBook) return

            untrack(() => {
                // Update reactive state immediately for responsiveness
                activeBook.pageNumber = cPage
                activeBook.scrollPosition = sPos

                // Debounce the persistent DB update and history update
                if (updateTimeout) clearTimeout(updateTimeout)
                updateTimeout = setTimeout(() => {
                    if (typeof window !== "undefined" && !viewerStore.isRestoringHistory) {
                        const state = {
                            _pdfjump: true,
                            page: cPage,
                            scrollPosition: sPos,
                            bookId: activeBook.id,
                        }
                        viewerStore.lastSetPageState = state
                        replaceState("", state)
                    }
                    viewerStore.updateBook({
                        ...activeBook,
                        pageNumber: cPage,
                        scrollPosition: sPos,
                    })
                }, 500)
            })

            return () => {
                if (updateTimeout) {
                    clearTimeout(updateTimeout)
                }
            }
        }
    })

    // Ensure final save on unmount
    $effect(() => {
        return () => {
            const activeBook = untrack(() => viewerStore.getCurrentBook())
            if (activeBook && isLoaded) {
                const finalPage = untrack(() => viewerStore.currentPage)
                const finalScroll = untrack(() => viewerStore.scrollPosition)
                viewerStore.updateBook({
                    ...activeBook,
                    pageNumber: finalPage,
                    scrollPosition: finalScroll,
                })
            }
        }
    })

    let outlineList = $state<FlatHeading[] | null>(null)
    let isOutlineLoading = $state(false)

    let activeHeadings = $derived.by(() => {
        if (!outlineList || outlineList.length === 0) return new Set<FlatHeading>()

        const onCurrentPage = outlineList.filter((h) => h.pageNumber === viewerStore.currentPage)
        if (onCurrentPage.length > 0) {
            return new Set<FlatHeading>(onCurrentPage)
        }

        let precedingCandidate: FlatHeading | null = null
        for (const heading of outlineList) {
            if (heading.pageNumber !== undefined && heading.pageNumber < viewerStore.currentPage) {
                if (!precedingCandidate || heading.pageNumber >= precedingCandidate.pageNumber!) {
                    precedingCandidate = heading
                }
            }
        }

        const activeSet = new Set<FlatHeading>()
        if (precedingCandidate) {
            activeSet.add(precedingCandidate)
        }
        return activeSet
    })

    $effect(() => {
        const currentUrl = url
        const bookId = currentBookId
        untrack(() => {
            searchStore.reset()
            if (promptStore.snapshot?.request.id === "viewer-search") promptStore.close()
        })
        if (!currentUrl || !bookId) {
            untrack(() => {
                isLoaded = false
                pdf = null
                isPageLoading = false
            })
            return
        }

        let canceled = false
        let loadedDoc: PDFDocument | null = null

        untrack(() => {
            isLoaded = false
            pdf = null
            isPageLoading = false
            const currentBook = viewerStore.getCurrentBook()
            viewerStore.currentPage = currentBook?.pageNumber || 1
            viewerStore.scrollPosition = currentBook?.scrollPosition || 0

            const loadPdf = async (pdfUrl: string) => {
                try {
                    const doc = new PDFDocument(pdfUrl)
                    await doc.load(settingsStore.scale)

                    if (!canceled) {
                        loadedDoc = doc
                        pdf = doc
                        const [pagesCount, author] = await Promise.all([
                            doc.getPageNumber(),
                            doc.getAuthor(),
                        ])
                        totalPages = pagesCount
                        if (viewerStore.currentPage > pagesCount) {
                            viewerStore.currentPage = pagesCount
                        }
                        if (viewerStore.currentPage < 1) {
                            viewerStore.currentPage = 1
                        }
                        isLoaded = true
                        searchStore.initPdf({ pdf: doc, bookId })

                        const currentBook = viewerStore.getCurrentBook()
                        if (
                            currentBook &&
                            (currentBook.totalPages !== pagesCount ||
                                currentBook.author === undefined)
                        ) {
                            void viewerStore.updateBook({
                                ...currentBook,
                                totalPages: pagesCount,
                                author:
                                    currentBook.author === undefined ? author : currentBook.author,
                            })
                        }
                    } else {
                        await doc.close()
                    }
                } catch (err) {
                    console.error("Failed to load PDF:", err)
                    if (!canceled) {
                        isLoaded = false
                        viewerStore.setCurrentBook(null)
                        goto(resolve(localizedPath("/") as any))
                    }
                }
            }

            loadPdf(currentUrl)
        })

        return () => {
            canceled = true
            if (loadedDoc) {
                loadedDoc.close()
            }
        }
    })

    $effect(() => {
        // Only bitmap identity and render quality belong in this effect. Display scale
        // and unrelated viewer settings must never invalidate a rendered page image.
        const currentPdf = pdf
        const loaded = isLoaded
        const pageNo = viewerStore.currentPage
        const mode = settingsStore.layout
        const quality = settingsStore.quality

        if (!currentPdf || !loaded || mode === "scroll") {
            untrack(() => {
                currentPageImage = null
                currentPageImage2 = null
                prevPageImage = null
                prevPageImage2 = null
                nextPageImage = null
                nextPageImage2 = null
                currentPageDim1 = null
                currentPageDim2 = null
                prevPageDim1 = null
                prevPageDim2 = null
                nextPageDim1 = null
                nextPageDim2 = null
                lastPageNo = pageNo
                lastBitmapPdf = currentPdf
                lastBitmapLayout = mode
                lastBitmapQuality = quality
                isPageLoading = false
            })
            return
        }

        const controller = new AbortController()

        untrack(() => {
            const step = mode === "split" ? 2 : 1
            const keepCurrentBitmap =
                lastBitmapPdf === currentPdf &&
                lastPageNo === pageNo &&
                lastBitmapLayout === mode &&
                lastBitmapQuality !== null &&
                lastBitmapQuality !== quality &&
                currentPageImage !== null

            // Reuse preloaded images and dimensions if possible to prevent flicker
            let matched = false
            if (pageNo === lastPageNo + step && nextPageImage) {
                currentPageImage = nextPageImage
                currentPageImage2 = nextPageImage2
                currentPageDim1 = nextPageDim1
                currentPageDim2 = nextPageDim2
                isPageLoading = false
                matched = true
            } else if (pageNo === lastPageNo - step && prevPageImage) {
                currentPageImage = prevPageImage
                currentPageImage2 = prevPageImage2
                currentPageDim1 = prevPageDim1
                currentPageDim2 = prevPageDim2
                isPageLoading = false
                matched = true
            }

            if (!matched && !keepCurrentBitmap) {
                currentPageImage = null
                currentPageImage2 = null
                currentPageDim1 = null
                currentPageDim2 = null
                isPageLoading = true
            }

            prevPageImage = null
            prevPageImage2 = null
            nextPageImage = null
            nextPageImage2 = null
            prevPageDim1 = null
            prevPageDim2 = null
            nextPageDim1 = null
            nextPageDim2 = null

            lastPageNo = pageNo
            lastBitmapPdf = currentPdf
            lastBitmapLayout = mode
            lastBitmapQuality = quality

            const renderPages = async () => {
                try {
                    if (!matched) {
                        // Current page/spread
                        const page1 = await currentPdf.getPage(pageNo)
                        const img1 = await currentPdf.getCanvasPage(
                            page1,
                            quality,
                            controller.signal,
                        )
                        const dim1 = await currentPdf.getPageDimension(pageNo)
                        let img2: string | null = null
                        let dim2: { width: number; height: number } | null = null

                        if (mode === "split" && pageNo + 1 <= totalPages) {
                            const page2 = await currentPdf.getPage(pageNo + 1)
                            img2 = await currentPdf.getCanvasPage(page2, quality, controller.signal)
                            dim2 = await currentPdf.getPageDimension(pageNo + 1)
                        }

                        if (!controller.signal.aborted) {
                            currentPageImage = img1
                            currentPageImage2 = img2
                            currentPageDim1 = dim1
                            currentPageDim2 = dim2
                            isPageLoading = false
                        }
                    }

                    // Render prev and next pages in the background
                    const renderBackgroundPages = async () => {
                        let pImg1: string | null = null
                        let pImg2: string | null = null
                        let pDim1: { width: number; height: number } | null = null
                        let pDim2: { width: number; height: number } | null = null

                        if (viewport.isCompact && pageNo > step) {
                            try {
                                const prevPageNo = pageNo - step
                                const prevPage1 = await currentPdf.getPage(prevPageNo)
                                pImg1 = await currentPdf.getCanvasPage(
                                    prevPage1,
                                    quality,
                                    controller.signal,
                                )
                                pDim1 = await currentPdf.getPageDimension(prevPageNo)
                                if (mode === "split" && prevPageNo + 1 <= totalPages) {
                                    const prevPage2 = await currentPdf.getPage(prevPageNo + 1)
                                    pImg2 = await currentPdf.getCanvasPage(
                                        prevPage2,
                                        quality,
                                        controller.signal,
                                    )
                                    pDim2 = await currentPdf.getPageDimension(prevPageNo + 1)
                                }
                            } catch (err) {
                                // Ignore background preloading errors
                            }
                        }

                        let nImg1: string | null = null
                        let nImg2: string | null = null
                        let nDim1: { width: number; height: number } | null = null
                        let nDim2: { width: number; height: number } | null = null

                        if (viewport.isCompact && pageNo < totalPages) {
                            try {
                                const nextPageNo = pageNo + step
                                if (nextPageNo <= totalPages) {
                                    const nextPage1 = await currentPdf.getPage(nextPageNo)
                                    nImg1 = await currentPdf.getCanvasPage(
                                        nextPage1,
                                        quality,
                                        controller.signal,
                                    )
                                    nDim1 = await currentPdf.getPageDimension(nextPageNo)
                                    if (mode === "split" && nextPageNo + 1 <= totalPages) {
                                        const nextPage2 = await currentPdf.getPage(nextPageNo + 1)
                                        nImg2 = await currentPdf.getCanvasPage(
                                            nextPage2,
                                            quality,
                                            controller.signal,
                                        )
                                        nDim2 = await currentPdf.getPageDimension(nextPageNo + 1)
                                    }
                                }
                            } catch (err) {
                                // Ignore background preloading errors
                            }
                        }

                        if (!controller.signal.aborted) {
                            prevPageImage = pImg1
                            prevPageImage2 = pImg2
                            prevPageDim1 = pDim1
                            prevPageDim2 = pDim2
                            nextPageImage = nImg1
                            nextPageImage2 = nImg2
                            nextPageDim1 = nDim1
                            nextPageDim2 = nDim2
                        }
                    }

                    renderBackgroundPages()

                    // Silently prerender the next 2 pages
                    const nextPages =
                        mode === "split" ? [pageNo + 2, pageNo + 3] : [pageNo + 1, pageNo + 2]

                    for (const nextPageNo of nextPages) {
                        if (nextPageNo <= totalPages && !controller.signal.aborted) {
                            try {
                                const page = new Page(nextPageNo)
                                await currentPdf.getCanvasPage(page, quality, controller.signal)
                            } catch (err) {
                                // Silently ignore abortion/cancellation errors
                            }
                        }
                    }
                } catch (err: any) {
                    if (err.message?.startsWith("Rendering cancelled")) {
                        console.error("Failed to render page(s):", err)
                    }
                    if (!controller.signal.aborted) {
                        isPageLoading = false
                    }
                }
            }

            renderPages()
        })

        return () => {
            controller.abort()
        }
    })

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded
        const layout = settingsStore.layout
        const pageNo = viewerStore.currentPage
        const quality = settingsStore.quality

        if (!currentPdf || !loaded || layout !== "scroll") {
            return
        }

        const controller = new AbortController()

        const timeout = setTimeout(async () => {
            const nextPages = [pageNo + 1, pageNo + 2]
            for (const nextPageNo of nextPages) {
                if (nextPageNo <= totalPages && !controller.signal.aborted) {
                    try {
                        const page = new Page(nextPageNo)
                        await currentPdf.getCanvasPage(page, quality, controller.signal)
                    } catch (err) {
                        // Silently ignore abortion/cancellation errors
                    }
                }
            }
        }, 500)

        return () => {
            clearTimeout(timeout)
            controller.abort()
        }
    })

    onDestroy(() => {
        searchStore.reset()
    })

    let lastPdf: PDFDocument | null = null

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded
        const open = sidebars.outline

        if (currentPdf !== lastPdf) {
            untrack(() => {
                outlineList = null
                isOutlineLoading = false
                lastPdf = currentPdf
            })
        }

        if (!currentPdf || !loaded) {
            return
        }

        if (!open) return

        let canceled = false

        untrack(() => {
            if (!outlineList) {
                isOutlineLoading = true
            }
            const loadOutline = async () => {
                try {
                    const list = await currentPdf.getOutline()
                    if (!canceled) {
                        untrack(() => {
                            outlineList = list
                            isOutlineLoading = false
                        })
                    }
                } catch (err) {
                    console.error("Failed to load outline:", err)
                    if (!canceled) {
                        untrack(() => {
                            outlineList = null
                            isOutlineLoading = false
                        })
                    }
                }
            }
            loadOutline()
        })

        return () => {
            canceled = true
        }
    })

    $effect(() => {
        viewerStore.activeOutline = outlineList
        return () => {
            viewerStore.activeOutline = null
        }
    })

    $effect(() => {
        viewerStore.activeTotalPages = totalPages
        return () => {
            viewerStore.activeTotalPages = 0
        }
    })

    function handleClose() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        const book = viewerStore.getCurrentBook()
        const node = book ? vfsStore.nodes[book.id] : null
        const parentId = node ? node.parentId : null

        if (parentId) {
            const folderPath = vfsStore.getFolderPath(parentId)
            goto(resolve((localizedPath("/") + `?folder=${encodeURIComponent(folderPath)}`) as any))
        } else {
            goto(resolve(localizedPath("/") as any))
        }
    }

    function nextPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (viewerStore.currentPage + step <= totalPages) {
                viewerStore.goToPage(viewerStore.currentPage + step)
            } else if (viewerStore.currentPage < totalPages) {
                viewerStore.goToPage(viewerStore.currentPage + 1)
            }
        }
    }

    function prevPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (viewerStore.currentPage - step >= 1) {
                viewerStore.goToPage(viewerStore.currentPage - step)
            } else if (viewerStore.currentPage > 1) {
                viewerStore.goToPage(1)
            }
        }
    }

    function handleBodyClick(event: MouseEvent) {
        if (!viewport.isCompact || modalManager.hasBlockingModal) return

        const target = event.target
        if (
            target instanceof Element &&
            target.closest(
                '.sidebar, button, a, input, select, textarea, [role="button"], [role="link"]',
            )
        ) {
            return
        }

        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) return

        if (viewerUI.isToolbarsVisible) {
            sidebars.left = false
            sidebars.settings = false
        }
        if (sidebars.left || sidebars.settings) return

        const action = getViewerTapAction(event.clientX, window.innerWidth)
        if (action === "sidebar-left") {
            void commandsStore.execute("viewer.sidebar.outline.toggle")
        } else if (action === "previous-page") {
            void commandsStore.execute("viewer.page.previous")
        } else if (action === "toggle-toolbar") {
            void commandsStore.execute("viewer.toolbar.toggle")
        } else if (action === "next-page") {
            void commandsStore.execute("viewer.page.next")
        } else if (action === "sidebar-right") {
            void commandsStore.execute("viewer.sidebar.settings.toggle")
        }
    }

    function attachBodyTapNavigation(element: HTMLElement) {
        return on(element, "click", handleBodyClick)
    }

    function dismissGestureHint() {
        gestureHintDismissed = true
        localStorage.setItem("viewer-gesture-hint-dismissed", "1")
    }

    const swipe = createSwipeState({
        enabled: () =>
            viewport.isCompact &&
            !modalManager.hasBlockingModal &&
            !sidebars.left &&
            !sidebars.settings,
        disabledByLayout: () => settingsStore.layout === "scroll",
        canSwipe: (direction: "left" | "right") => {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (direction === "right") {
                // going next (swiping left)
                return settingsStore.layout === "split"
                    ? viewerStore.currentPage + step <= totalPages ||
                          viewerStore.currentPage < totalPages
                    : viewerStore.currentPage < totalPages
            } else {
                // going prev (swiping right)
                return viewerStore.currentPage > 1
            }
        },
        onSwipeComplete: (direction: "left" | "right") => {
            const step = settingsStore.layout === "split" ? 2 : 1
            let targetPage = viewerStore.currentPage
            if (direction === "right") {
                if (targetPage + step <= totalPages) {
                    targetPage += step
                } else if (targetPage < totalPages) {
                    targetPage = totalPages
                }
            } else {
                if (targetPage - step >= 1) {
                    targetPage -= step
                } else if (targetPage > 1) {
                    targetPage = 1
                }
            }
            void commandsStore.execute("viewer.page.go-to", {
                page: targetPage,
                isJump: false,
            })
        },
        ignoredSelectors: [
            "button",
            "input",
            "select",
            "textarea",
            "a",
            ".viewer-fab-btn",
            ".sidebar",
            ".viewer-header",
            ".viewer-footer",
            ".sidebar-backdrop",
        ],
        getScrollContainer: () => scrollContainer,
    })

    const sliderTrackStyle = $derived(
        `transform: translate3d(calc(-33.333333% + ${swipe.swipeOffsetX}), 0, 0); transition: ${swipe.swipeTransition};`,
    )

    function slideHeader(node: HTMLElement, { duration = 250 }) {
        const style = getComputedStyle(node)
        const opacity = +style.opacity
        const height = parseFloat(style.height)
        const padding_top = parseFloat(style.paddingTop)
        const padding_bottom = parseFloat(style.paddingBottom)
        const margin_top = parseFloat(style.marginTop)
        const margin_bottom = parseFloat(style.marginBottom)
        const border_top_width = parseFloat(style.borderTopWidth)
        const border_bottom_width = parseFloat(style.borderBottomWidth)

        return {
            duration,
            easing: cubicInOut,
            css: (t: number) => {
                return `
                    overflow: hidden;
                    opacity: ${t * opacity};
                    height: ${t * height}px;
                    padding-top: ${t * padding_top}px;
                    padding-bottom: ${t * padding_bottom}px;
                    margin-top: ${t * margin_top}px;
                    margin-bottom: ${t * margin_bottom}px;
                    border-top-width: ${t * border_top_width}px;
                    border-bottom-width: ${t * border_bottom_width}px;
                    transform: translateY(${(t - 1) * 100}%);
                `
            },
        }
    }

    function slideFooter(node: HTMLElement, { duration = 250 }) {
        const style = getComputedStyle(node)
        const opacity = +style.opacity
        const height = parseFloat(style.height)
        const padding_top = parseFloat(style.paddingTop)
        const padding_bottom = parseFloat(style.paddingBottom)
        const margin_top = parseFloat(style.marginTop)
        const margin_bottom = parseFloat(style.marginBottom)
        const border_top_width = parseFloat(style.borderTopWidth)
        const border_bottom_width = parseFloat(style.borderBottomWidth)

        return {
            duration,
            easing: cubicInOut,
            css: (t: number) => {
                return `
                    overflow: hidden;
                    opacity: ${t * opacity};
                    height: ${t * height}px;
                    padding-top: ${t * padding_top}px;
                    padding-bottom: ${t * padding_bottom}px;
                    margin-top: ${t * margin_top}px;
                    margin-bottom: ${t * margin_bottom}px;
                    border-top-width: ${t * border_top_width}px;
                    border-bottom-width: ${t * border_bottom_width}px;
                    transform: translateY(${(1 - t) * 100}%);
                `
            },
        }
    }
</script>

{#if viewerStore.getCurrentBook()}
    <div class="fullscreen-viewer">
        <div class="reader-card">
            <div class="viewer-layout">
                {#if viewerUI.isToolbarsVisible}
                    <div
                        style="position: relative; z-index: 250;"
                        transition:slideHeader={{
                            duration: motionPreferences.enabled ? 250 : 0,
                        }}
                    >
                        <ViewerHeader
                            {name}
                            {isLoaded}
                            bind:isOutlineOpen={sidebars.left}
                            bind:isSettingsOpen={sidebars.settings}
                            isBookmarked={isCurrentPageBookmarked}
                        />
                    </div>
                {/if}

                <main
                    {@attach swipe.attach}
                    {@attach attachBodyTapNavigation}
                    class="viewer-body"
                    aria-label={m.viewer_reading_region()}
                >
                    {#if !isLoaded}
                        <div class="loading-state">
                            <Spinner variant="dots" label={m.loading_doc()} />
                        </div>
                    {:else}
                        {#if sidebars.left}
                            <Sidebar
                                side="left"
                                presentation={viewport.isDocked ? "docked" : "overlay"}
                                showBackdrop={!viewport.isDocked}
                                bind:activeTab={sidebars.activeTab}
                                {isOutlineLoading}
                                {outlineList}
                                bind:currentPage={viewerStore.currentPage}
                                bind:scrollPosition={viewerStore.scrollPosition}
                                {activeHeadings}
                                onClose={() => {
                                    sidebars.left = false
                                }}
                            />
                        {/if}

                        {#if sidebars.settings}
                            <Sidebar
                                side="right"
                                presentation={viewport.isDocked ? "docked" : "overlay"}
                                showBackdrop={!viewport.isDocked}
                                activeTab="settings"
                                onClose={() => (sidebars.settings = false)}
                            />
                        {/if}

                        {#if viewport.isCompact && viewerUI.isToolbarsVisible && !gestureHintDismissed}
                            <aside class="gesture-hint" aria-label={m.viewer_gesture_hint()}>
                                <p>{m.viewer_gesture_hint()}</p>
                                <button type="button" onclick={dismissGestureHint}
                                    >{m.dismiss_hint()}</button
                                >
                            </aside>
                        {/if}

                        {#if viewport.isCompact && settingsStore.layout !== "scroll"}
                            <div class="slider-track" style={sliderTrackStyle}>
                                <!-- Previous Slide -->
                                <div class="slider-slide prev-slide">
                                    {#if prevPageImage}
                                        <CanvasPane
                                            {pdf}
                                            scale={settingsStore.scale}
                                            currentPage={viewerStore.currentPage -
                                                (settingsStore.layout === "split" ? 2 : 1)}
                                            scrollPosition={0}
                                            renderLayers={false}
                                            isPageLoading={false}
                                            currentPageImage={prevPageImage}
                                            currentPageImage2={prevPageImage2}
                                            layoutMode={settingsStore.layout}
                                            currentPageDim1={prevPageDim1}
                                            currentPageDim2={prevPageDim2}
                                        />
                                    {/if}
                                </div>

                                <!-- Current Slide -->
                                <div class="slider-slide current-slide">
                                    <CanvasPane
                                        {pdf}
                                        scale={settingsStore.scale}
                                        bind:currentPage={viewerStore.currentPage}
                                        bind:scrollPosition={viewerStore.scrollPosition}
                                        bind:container={scrollContainer}
                                        {isPageLoading}
                                        {currentPageImage}
                                        {currentPageImage2}
                                        layoutMode={settingsStore.layout}
                                        {currentPageDim1}
                                        {currentPageDim2}
                                    />
                                </div>

                                <!-- Next Slide -->
                                <div class="slider-slide next-slide">
                                    {#if nextPageImage}
                                        <CanvasPane
                                            {pdf}
                                            scale={settingsStore.scale}
                                            currentPage={viewerStore.currentPage +
                                                (settingsStore.layout === "split" ? 2 : 1)}
                                            scrollPosition={0}
                                            renderLayers={false}
                                            isPageLoading={false}
                                            currentPageImage={nextPageImage}
                                            currentPageImage2={nextPageImage2}
                                            layoutMode={settingsStore.layout}
                                            currentPageDim1={nextPageDim1}
                                            currentPageDim2={nextPageDim2}
                                        />
                                    {/if}
                                </div>
                            </div>
                        {:else}
                            <div class="canvas-pane-wrapper">
                                <CanvasPane
                                    {pdf}
                                    scale={settingsStore.scale}
                                    bind:currentPage={viewerStore.currentPage}
                                    bind:scrollPosition={viewerStore.scrollPosition}
                                    bind:container={scrollContainer}
                                    {isPageLoading}
                                    {currentPageImage}
                                    {currentPageImage2}
                                    layoutMode={settingsStore.layout}
                                    {currentPageDim1}
                                    {currentPageDim2}
                                />
                            </div>
                        {/if}

                        {#if isLoaded && (searchStore.isActive || viewerUI.isToolbarsVisible || !viewport.isCompact)}
                            <div
                                class={[
                                    "viewer-utility-rail",
                                    searchStore.isActive && "is-searching",
                                ]}
                                role="toolbar"
                                aria-label={m.viewer_utilities()}
                            >
                                {#if searchStore.isActive}
                                    <div
                                        class="search-control-group"
                                        role="group"
                                        aria-label={m.keymap_search()}
                                    >
                                        <Button
                                            size="default"
                                            variant="action"
                                            square={true}
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                void commandsStore.execute("viewer.search.previous")
                                            }}
                                            aria-label={m.keymap_prev_match()}
                                            tooltip={`${m.keymap_prev_match()}${getShortcutHint(commandsNode, "viewer.search.previous")}`}
                                        >
                                            <ChevronIcon style="transform: rotate(180deg);" />
                                        </Button>
                                        <span class="search-match-count" aria-live="polite">
                                            {searchStore.matches.length > 0
                                                ? `${searchStore.currentMatchIndex + 1} / ${searchStore.matches.length}`
                                                : `0 / 0`}
                                        </span>
                                        <Button
                                            size="default"
                                            variant="action"
                                            square={true}
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                void commandsStore.execute("viewer.search.next")
                                            }}
                                            aria-label={m.keymap_next_match()}
                                            tooltip={`${m.keymap_next_match()}${getShortcutHint(commandsNode, "viewer.search.next")}`}
                                        >
                                            <ChevronIcon />
                                        </Button>
                                        <Button
                                            size="default"
                                            variant="action"
                                            square={true}
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                void commandsStore.execute("viewer.search")
                                            }}
                                            aria-label={m.keymap_search()}
                                            tooltip={`${m.keymap_search()}${getShortcutHint(commandsNode, "viewer.search")}`}
                                        >
                                            <SearchIcon />
                                        </Button>
                                        <Button
                                            size="default"
                                            variant="action"
                                            square={true}
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                void commandsStore.execute("viewer.search.close")
                                            }}
                                            aria-label={m.close_search()}
                                            tooltip={`${m.close_search()}${getShortcutHint(commandsNode, "viewer.search.close")}`}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                {:else if isLoaded && viewerUI.isToolbarsVisible}
                                    <Button
                                        size="large"
                                        variant="fab"
                                        square={true}
                                        class="viewer-fab-btn fab-search"
                                        onclick={(e) => {
                                            e.stopPropagation()
                                            void commandsStore.execute("viewer.search")
                                        }}
                                        aria-label={m.keymap_search()}
                                        tooltip={`${m.keymap_search()}${getShortcutHint(commandsNode, "viewer.search")}`}
                                    >
                                        <SearchIcon />
                                    </Button>
                                {/if}

                                {#if isLoaded && !searchStore.isActive}
                                    {#if viewerUI.isToolbarsVisible}
                                        <Button
                                            size="large"
                                            variant="fab"
                                            square={true}
                                            class="viewer-fab-btn fab-prompt"
                                            onclick={(event) => {
                                                event.stopPropagation()
                                                void commandsStore.execute("prompt.open")
                                            }}
                                            aria-label={m.keymap_prompt()}
                                            tooltip={`${m.keymap_prompt()}${getShortcutHint(commandsNode, "prompt.open")}`}
                                        >
                                            <TerminalIcon />
                                        </Button>
                                    {/if}

                                    {#if !viewport.isCompact}
                                        <Button
                                            variant="fab"
                                            size="large"
                                            square={true}
                                            class="viewer-fab-btn fab-toggle"
                                            onclick={(e) => {
                                                e.stopPropagation()
                                                void commandsStore.execute("viewer.toolbar.toggle")
                                            }}
                                            aria-label={viewerUI.isToolbarsVisible
                                                ? m.hide_toolbars()
                                                : m.show_toolbars()}
                                            tooltip={`${viewerUI.isToolbarsVisible ? m.hide_toolbars() : m.show_toolbars()}${getShortcutHint(commandsNode, "viewer.toolbar.toggle")}`}
                                        >
                                            {#if viewerUI.isToolbarsVisible}
                                                <MinimizeIcon />
                                            {:else}
                                                <MaximizeIcon />
                                            {/if}
                                        </Button>
                                    {/if}
                                {/if}
                            </div>
                        {/if}
                    {/if}
                </main>

                {#if isLoaded && viewerUI.isToolbarsVisible}
                    <div
                        style="position: relative; z-index: 250;"
                        transition:slideFooter={{
                            duration: motionPreferences.enabled ? 250 : 0,
                        }}
                    >
                        <ViewerFooter
                            currentPage={viewerStore.currentPage}
                            {totalPages}
                            {isPageLoading}
                        />
                    </div>
                {/if}
            </div>

            <!-- Floating Highlights & Notes overlays -->
            {#if notesStore.activeSelection}
                <div
                    class="note-fab"
                    style="position: fixed; left: {notesStore.activeSelection.x}px; top: {notesStore
                        .activeSelection.bottomY +
                        12}px; transform: translate(-50%, 0); z-index: var(--z-modal);"
                >
                    <button
                        class="fab-btn"
                        onclick={() => void commandsStore.execute("viewer.note.add")}
                    >
                        <NoteIcon width="16" height="16" />
                        <span>{m.add_note()}</span>
                    </button>
                </div>
            {/if}

            <ViewerModals
                currentBookId={currentBookId ?? null}
                currentPage={viewerStore.currentPage}
            />
        </div>
    </div>
{/if}

<style>
    :global(body:has(.fullscreen-viewer)) {
        background-color: var(--viewer-chrome-color);
    }

    .fullscreen-viewer {
        position: fixed;
        inset: 0;
        z-index: var(--z-fixed);
        background-color: var(--bg-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .reader-card {
        flex: 1;
        background: var(--surface-color, #ffffff);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    /* Active Reader Screen */
    .viewer-layout {
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
        width: 100%;
    }

    .viewer-body {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: var(--canvas-bg-color);
        display: flex;
        flex-direction: row;
    }

    .canvas-pane-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
    }

    .slider-track {
        display: flex;
        flex-direction: row;
        width: 300%;
        height: 100%;
        will-change: transform;
        flex-shrink: 0;
    }

    .slider-slide {
        width: 33.333333%;
        height: 100%;
        flex-shrink: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        box-sizing: border-box;
    }

    .slider-slide:not(.current-slide) {
        pointer-events: none;
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .viewer-utility-rail {
        position: absolute;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: var(--z-sticky);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0;
        padding: 0;
        border: 2px solid var(--border-color);
        background: var(--viewer-chrome-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
    }

    .viewer-utility-rail :global(.viewer-fab-btn) {
        position: relative !important;
        right: auto !important;
        bottom: auto !important;
    }

    .viewer-utility-rail .search-control-group {
        position: relative;
        right: auto;
        bottom: auto;
        max-width: none;
        border: 0;
        box-shadow: none;
    }

    :global(.viewer-fab-btn) {
        position: absolute !important;
        right: 24px;
        border-color: transparent !important;
        border-radius: 0 !important;
        background: transparent;
        box-shadow: none !important;
    }

    :global(.viewer-fab-btn:focus-visible) {
        outline: none !important;
        box-shadow: var(--focus-ring) !important;
    }

    :global(.viewer-fab-btn:active:not(:disabled)),
    :global(.viewer-fab-btn.open) {
        transform: translate(1px, 1px) !important;
        border-color: transparent !important;
        background: transparent !important;
        box-shadow: none !important;
        color: var(--accent-active-color) !important;
    }

    :global(.viewer-fab-btn:disabled) {
        opacity: 0.45;
    }

    :global(.fab-prompt) {
        bottom: calc(24px + 50px + 16px);
    }

    :global(.fab-search),
    :global(.fab-next-search) {
        bottom: calc(24px + 50px + 16px + 50px + 16px);
    }

    :global(.fab-jump-back.hidden-toolbars),
    :global(.fab-jump-forward.hidden-toolbars) {
        transform: translateX(100px);
        opacity: 0;
        pointer-events: none;
    }

    :global(.fab-jump-back) {
        bottom: calc(24px + 50px + 16px + 50px + 16px + 50px + 16px);
    }

    :global(.fab-jump-forward) {
        bottom: calc(24px + 50px + 16px + 50px + 16px + 50px + 16px + 50px + 16px);
    }

    :global(.fab-prev-search) {
        bottom: calc(24px + 50px + 16px + 50px + 16px + 50px + 16px);
    }

    :global(.fab-close-search) {
        bottom: calc(24px + 50px + 16px + 50px + 16px + 50px + 16px + 50px + 16px);
    }

    :global(.fab-toggle) {
        position: absolute;
        bottom: 24px;
        right: 24px;
    }

    .search-control-group {
        position: absolute;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: var(--z-sticky);
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px;
        max-width: calc(100% - 32px - env(safe-area-inset-left) - env(safe-area-inset-right));
        border: var(--border-elevated) solid var(--border-color);
        background: var(--viewer-chrome-color);
        box-shadow: var(--shadow-elevated);
        font-family: var(--ui-font);
    }

    .search-match-count {
        min-width: 4.5rem;
        padding-inline: 6px;
        color: var(--text-color);
        font-family: var(--ui-mono-font);
        font-size: var(--font-size-sm);
        font-weight: 800;
        text-align: center;
        white-space: nowrap;
    }

    @media (--mobile) {
        .viewer-utility-rail {
            right: calc(8px + env(safe-area-inset-right));
            bottom: calc(8px + env(safe-area-inset-bottom));
            left: auto;
            box-sizing: border-box;
            flex-direction: column;
            align-items: flex-end;
            justify-content: flex-end;
            gap: 0;
        }

        .viewer-utility-rail.is-searching {
            right: auto;
            left: 50%;
            width: max-content;
            max-width: calc(100% - 16px - env(safe-area-inset-left) - env(safe-area-inset-right));
            transform: translateX(-50%);
            flex-direction: row;
            align-items: center;
        }

        .viewer-utility-rail .search-control-group {
            width: auto;
            max-width: 100%;
        }

        :global(.fab-search),
        :global(.fab-next-search) {
            bottom: calc(12px + 44px + 8px);
            right: calc(12px + env(safe-area-inset-right));
        }

        :global(.fab-jump-back) {
            bottom: calc(12px + 44px + 8px + 44px + 8px);
            right: calc(12px + env(safe-area-inset-right));
        }

        :global(.fab-jump-forward) {
            bottom: calc(12px + 44px + 8px + 44px + 8px + 44px + 8px);
            right: calc(12px + env(safe-area-inset-right));
        }

        :global(.fab-prev-search) {
            bottom: calc(12px + 44px + 8px + 44px + 8px);
            right: calc(12px + env(safe-area-inset-right));
        }

        :global(.fab-close-search) {
            bottom: calc(12px + 44px + 8px + 44px + 8px + 44px + 8px);
            right: calc(12px + env(safe-area-inset-right));
        }

        :global(.fab-prompt) {
            bottom: 12px;
            right: calc(12px + env(safe-area-inset-right));
        }

        :global(.fab-toggle) {
            bottom: 12px;
            right: calc(12px + env(safe-area-inset-right));
        }

        .search-control-group {
            right: calc(8px + env(safe-area-inset-right));
            bottom: calc(8px + env(safe-area-inset-bottom));
            gap: 2px;
            padding: 3px;
        }

        .search-match-count {
            min-width: 3.5rem;
            padding-inline: 2px;
        }
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .gesture-hint {
        position: absolute;
        left: 50%;
        bottom: calc(72px + env(safe-area-inset-bottom));
        z-index: var(--z-sticky);
        width: min(32rem, calc(100% - 32px));
        box-sizing: border-box;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: var(--border-inline) solid var(--border-color);
        background: var(--viewer-chrome-color);
        box-shadow: var(--shadow-elevated);
        color: var(--text-color);
        font-family: var(--ui-font);
    }

    .gesture-hint p {
        flex: 1;
        margin: 0;
        font-size: var(--font-size-sm);
        line-height: 1.35;
    }

    .gesture-hint button {
        flex: 0 0 auto;
        min-height: 36px;
        border: var(--border-inline) solid var(--border-color);
        background: var(--primary-color);
        color: var(--primary-text-color);
        padding: 6px 10px;
        font-weight: 800;
        cursor: pointer;
    }

    /* Note Selection FAB styling */
    .note-fab .fab-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--text-color);
        color: var(--surface-color);
        border: 2px solid var(--text-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        padding: 6px 12px;
        font-family: inherit;
        font-size: var(--font-size-sm);
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition:
            background-color 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            color 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .note-fab .fab-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 5px 5px 0 var(--shadow-color);
        background: var(--accent-active-color);
        color: var(--text-color);
    }
</style>
