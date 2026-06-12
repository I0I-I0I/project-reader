<script lang="ts">
    import PDFDocument, { Page } from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack, onMount, onDestroy } from "svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"
    import { goto, replaceState } from "$app/navigation"
    import { page } from "$app/state"

    import ViewerHeader from "./components/ViewerHeader.svelte"
    import OutlineSidebar from "./components/OutlineSidebar.svelte"
    import SettingsSidebar from "./components/SettingsSidebar.svelte"
    import NotesSidebar from "./components/NotesSidebar.svelte"
    import NotePopup from "./components/NotePopup.svelte"
    import NoteEditor from "./components/NoteEditor.svelte"
    import CanvasPane from "./components/CanvasPane.svelte"
    import ViewerFooter from "./components/ViewerFooter.svelte"
    import { notesStore } from "$lib/stores/notesStore.svelte"
    import NoteIcon from "$lib/components/icons/NoteIcon.svelte"
    import type { UserNote } from "$lib/stores/vfsStore.types"
    import DeleteConfirmModal from "$lib/components/DeleteConfirmModal.svelte"
    import { browser } from "$app/environment"
    import { localizedPath } from "$lib/language"
    import { CONSTANTS, settingsStore } from "$lib/stores/settingsStore.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { cubicInOut } from "svelte/easing"
    import { useCommands, getShortcutHint } from "$lib/stores/commandsStore.svelte"
    import { usePrompt, type PromptProvider, type SearchItem } from "$lib/stores/promptStore.svelte"
    import TerminalIcon from "$lib/components/icons/TerminalIcon.svelte"
    import MinimizeIcon from "$lib/components/icons/MinimizeIcon.svelte"
    import MaximizeIcon from "$lib/components/icons/MaximizeIcon.svelte"
    import SearchIcon from "$lib/components/icons/SearchIcon.svelte"
    import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte"

    let scrollContainer = $state<HTMLElement | null>(null)

    onMount(() => {
        scrollContainer = document.querySelector(".canvas-frame")
    })

    function getScrollContainer() {
        return scrollContainer
    }

    function getMatchContext(text: string, start: number, end: number, contextLen = 40) {
        const contextStart = Math.max(0, start - contextLen)
        const contextEnd = Math.min(text.length, end + contextLen)
        let context = text.slice(contextStart, contextEnd)
        if (contextStart > 0) context = "..." + context
        if (contextEnd < text.length) context = context + "..."
        return context
    }

    const viewerPromptProvider: PromptProvider = ({ value, mode }) => {
        const cleanValue = value.replace(/\u200B/g, "")
        const list: SearchItem[] = []
        const activeTotalPages = viewerStore.activeTotalPages

        if (mode === "search") {
            const queryText = cleanValue.trim()
            if (queryText === "") {
                if (searchStore.searchHistory.length === 0) {
                    list.push({
                        id: "search-history-empty",
                        title: m.search_history_empty
                            ? m.search_history_empty()
                            : "No search history yet",
                        englishTitle: "No search history yet",
                        category: "navigation",
                        action: () => {},
                    })
                } else {
                    for (let i = 0; i < searchStore.searchHistory.length; i++) {
                        const historyQuery = searchStore.searchHistory[i]
                        list.push({
                            id: `search-history-${i}`,
                            title: historyQuery,
                            category: "navigation",
                            action: () => {
                                uiStore.prompt.value = historyQuery
                            },
                        })
                    }
                }
            } else {
                const matches = searchStore.matches
                // Limit suggestions in prompt dropdown to 200 to avoid crash/lag
                const limit = 200
                const count = Math.min(matches.length, limit)
                for (let i = 0; i < count; i++) {
                    const match = matches[i]
                    const pageText = searchStore.pageTexts.get(match.pageNumber)
                    const text = pageText ? pageText.original : ""
                    const context = getMatchContext(text, match.start, match.end)

                    list.push({
                        id: `search-match-${i}`,
                        title: `${m.page()} ${match.pageNumber}`,
                        subtitle: context,
                        category: "navigation",
                        pageNumber: match.pageNumber,
                        action: (opts) => {
                            searchStore.addToHistory(queryText)

                            searchStore.currentMatchIndex = i
                            if (viewerStore.goToPage) {
                                viewerStore.goToPage(match.pageNumber, {
                                    isJump: opts?.asJump ?? false,
                                })
                            }
                            uiStore.isSearchModeActive = true
                            uiStore.prompt.isOpen = false
                        },
                    })
                }
            }
        } else if (mode === "page") {
            const num = parseInt(cleanValue.trim(), 10)
            const targetPage =
                !isNaN(num) && num >= 1 ? (num > activeTotalPages ? activeTotalPages : num) : null

            if (targetPage !== null) {
                list.push({
                    id: `nav-page-single`,
                    title: `${m.keymap_goto_page()} ${targetPage}`,
                    englishTitle: `${m.keymap_goto_page({}, { locale: "en" })} ${targetPage}`,
                    subtitle: m.jump_page_desc({
                        page: targetPage,
                        total: activeTotalPages,
                    }),
                    englishSubtitle: m.jump_page_desc(
                        { page: targetPage, total: activeTotalPages },
                        { locale: "en" },
                    ),
                    category: "navigation",
                    action: () => {
                        if (viewerStore.goToPage) {
                            viewerStore.goToPage(targetPage, { isJump: true })
                        }
                        uiStore.prompt.mode = "global"
                        uiStore.prompt.isOpen = false
                    },
                })
            } else {
                const currentBook = viewerStore.getCurrentBook()
                const currentPageNum = currentBook?.pageNumber || 1
                list.push({
                    id: `nav-page-placeholder`,
                    title: `${m.keymap_goto_page()}...`,
                    englishTitle: `Go to page...`,
                    subtitle: m.jump_page_desc({
                        page: currentPageNum,
                        total: activeTotalPages,
                    }),
                    englishSubtitle: `Jump to a page (1-${activeTotalPages})`,
                    category: "navigation",
                    action: () => {
                        if (viewerStore.goToPage) {
                            viewerStore.goToPage(currentPageNum, {
                                isJump: true,
                            })
                        }
                        uiStore.prompt.mode = "global"
                        uiStore.prompt.isOpen = false
                    },
                })
            }
        } else if (mode === "global") {
            const num = parseInt(cleanValue.trim(), 10)
            if (!isNaN(num) && activeTotalPages > 0 && num >= 1 && num <= activeTotalPages) {
                list.push({
                    id: `nav-page-${num}`,
                    title: `${m.keymap_goto_page()} ${num}`,
                    englishTitle: `${m.keymap_goto_page({}, { locale: "en" })} ${num}`,
                    subtitle: m.jump_page_desc({
                        page: num,
                        total: activeTotalPages,
                    }),
                    englishSubtitle: m.jump_page_desc(
                        { page: num, total: activeTotalPages },
                        { locale: "en" },
                    ),
                    category: "navigation",
                    action: () => {
                        if (viewerStore.goToPage) {
                            viewerStore.goToPage(num, { isJump: true })
                        }
                        uiStore.prompt.mode = "global"
                        uiStore.prompt.isOpen = false
                    },
                })
            }
        }

        return list
    }

    usePrompt(viewerPromptProvider)

    $effect(() => {
        if (uiStore.prompt.mode === "search" && uiStore.prompt.isOpen) {
            searchStore.startIndexing()
            const currentBook = viewerStore.getCurrentBook()
            searchStore.searchStartPage = currentBook ? currentBook.pageNumber : 1
        }
    })

    $effect(() => {
        if (uiStore.prompt.mode === "search") {
            const query = uiStore.prompt.value
            untrack(() => {
                searchStore.setQuery(query)
                if (query.trim() !== "") {
                    uiStore.isSearchModeActive = true
                }
            })
        }
    })

    const commandsNode = useCommands([
        {
            keys: "shift+l",
            description: m.keymap_toggle_layouts(),
            englishDescription: m.keymap_toggle_layouts({}, { locale: "en" }),
            category: "settings",
            subtitle: () => {
                const layoutNames = {
                    single: m.single_page(),
                    split: m.split_pages(),
                    scroll: m.scroll_pages(),
                }
                return `${m.layout()}: ${layoutNames[settingsStore.layout]}`
            },
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "layout"
                uiStore.prompt.isOpen = true
            },
        },
        {
            id: "zoom-in",
            keys: "+",
            description: m.keymap_zoom_in(),
            englishDescription: m.keymap_zoom_in({}, { locale: "en" }),
            category: "settings",
            subtitle: () =>
                m.scale_subtitle({
                    scale: Math.round(settingsStore.scale * 100),
                }),
            action: () => {
                settingsStore.scale = Math.min(settingsStore.scale + 0.1, CONSTANTS.maxScale)
            },
        },
        {
            id: "zoom-out",
            keys: "-",
            description: m.keymap_zoom_out(),
            englishDescription: m.keymap_zoom_out({}, { locale: "en" }),
            category: "settings",
            subtitle: () =>
                m.scale_subtitle({
                    scale: Math.round(settingsStore.scale * 100),
                }),
            action: () => {
                settingsStore.scale = Math.max(settingsStore.scale - 0.1, CONSTANTS.minScale)
            },
        },
        {
            id: "scroll-down",
            keys: ["j", "arrowdown"],
            description: m.keymap_scroll_down(),
            englishDescription: m.keymap_scroll_down({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: window.innerHeight * 0.2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-up",
            keys: ["k", "arrowup"],
            description: m.keymap_scroll_up(),
            englishDescription: m.keymap_scroll_up({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: -window.innerHeight * 0.2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-page-down",
            keys: ["d", "pagedown"],
            description: m.keymap_scroll_page_down(),
            englishDescription: m.keymap_scroll_page_down({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                const currentHeight = window.innerHeight
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: currentHeight / 2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-page-up",
            keys: ["u", "pageup"],
            description: m.keymap_scroll_page_up(),
            englishDescription: m.keymap_scroll_page_up({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                const currentHeight = window.innerHeight
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: currentHeight / -2,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "next-page",
            keys: ["space", "arrowright"],
            description: m.keymap_next_page(),
            englishDescription: m.keymap_next_page({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            id: "prev-page",
            keys: ["shift+space", "arrowleft"],
            description: m.keymap_prev_page(),
            englishDescription: m.keymap_prev_page({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                prevPage()
            },
        },
        {
            id: "toggle-outline",
            keys: "shift+o",
            description: m.keymap_toggle_outline(),
            englishDescription: m.keymap_toggle_outline({}, { locale: "en" }),
            category: "commands",
            action: () => {
                sidebars.outline = !sidebars.outline
            },
        },
        {
            id: "toggle-settings",
            keys: "shift+s",
            description: m.keymap_toggle_settings(),
            englishDescription: m.keymap_toggle_settings({}, { locale: "en" }),
            category: "commands",
            action: () => {
                sidebars.settings = !sidebars.settings
            },
        },
        {
            id: "toggle-notes",
            keys: "shift+b",
            description: "Toggle Notes Sidebar",
            englishDescription: "Toggle Notes Sidebar",
            category: "commands",
            action: () => {
                sidebars.notes = !sidebars.notes
            },
        },
        {
            id: "close",
            keys: "q",
            description: m.keymap_close_viewer(),
            englishDescription: m.keymap_close_viewer({}, { locale: "en" }),
            category: "commands",
            action: (event: KeyboardEvent) => {
                if (notesStore.editingNote || notesStore.activePopup) {
                    event.preventDefault()
                    notesStore.editingNote = null
                    notesStore.editorCoords = null
                    notesStore.activePopup = null
                    return
                }
                const book = viewerStore.getCurrentBook()
                if (book) {
                    vfsStore.pushForwardHistory(book.id)
                }
                handleClose()
            },
        },
        {
            id: "hide-toolbar",
            keys: "shift+m",
            description: m.keymap_hide_toolbars(),
            englishDescription: m.keymap_hide_toolbars({}, { locale: "en" }),
            category: "commands",
            action: () => {
                uiStore.isToolbarsVisible = !uiStore.isToolbarsVisible
            },
        },
        {
            id: "goto-page",
            keys: "g",
            description: m.keymap_goto_page(),
            englishDescription: m.keymap_goto_page({}, { locale: "en" }),
            category: "menu",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "page"
                uiStore.prompt.isOpen = true
            },
        },
        {
            id: "open-search",
            keys: "/",
            description: m.keymap_search ? m.keymap_search() : "Search PDF",
            englishDescription: m.keymap_search
                ? m.keymap_search({}, { locale: "en" })
                : "Search PDF",
            category: "commands",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode = "search"
                uiStore.prompt.isOpen = true
            },
        },
        {
            id: "save-note",
            keys: ["ctrl+enter"],
            description: "Save Active Note",
            allowInInputs: true,
            disabled: () => !notesStore.editingNote,
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                saveCurrentNote()
            },
        },
        {
            id: "save-note-alt",
            keys: ["enter"],
            description: "Save Active Note",
            allowInInputs: false,
            disabled: () => !notesStore.editingNote,
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                saveCurrentNote()
            },
        },
        {
            id: "close-search",
            keys: ["escape", "ctrl+c", "ctrl+["],
            description: m.prompt_close_aria ? m.prompt_close_aria() : "Close search",
            englishDescription: "Close search",
            category: "commands",
            action: (event: KeyboardEvent) => {
                if (notesStore.editingNote || notesStore.activePopup) {
                    if (event.key === "c" && event.ctrlKey) {
                        const selection = window.getSelection()?.toString()
                        if (selection) return
                    }
                    event.preventDefault()
                    notesStore.editingNote = null
                    notesStore.editorCoords = null
                    notesStore.activePopup = null
                    return
                }

                if (uiStore.isSearchModeActive) {
                    uiStore.isSearchModeActive = false
                    searchStore.setQuery("")
                    uiStore.prompt.clearValue("search")
                }
            },
            allowInInputs: true,
        },
        {
            id: "next-search-match",
            keys: "n",
            description: m.keymap_next_match ? m.keymap_next_match() : "Next match",
            englishDescription: m.keymap_next_match
                ? m.keymap_next_match({}, { locale: "en" })
                : "Next match",
            category: "navigation",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                searchStore.next()
            },
        },
        {
            id: "prev-search-match",
            keys: "shift+n",
            description: m.keymap_prev_match ? m.keymap_prev_match() : "Previous match",
            englishDescription: m.keymap_prev_match
                ? m.keymap_prev_match({}, { locale: "en" })
                : "Previous match",
            category: "navigation",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                searchStore.prev()
            },
        },
    ])

    const currentBook = $derived(viewerStore.getCurrentBook())
    const url = $derived(currentBook?.url ?? "")
    const name = $derived(currentBook?.name ?? "")

    let pdf = $state.raw<PDFDocument | null>(null)
    let isLoaded = $state(false)

    let lastPageNo = 1
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
        active = $state<"outline" | "settings" | "notes" | null>(null)
        get outline() {
            return this.active === "outline"
        }
        set outline(v) {
            this.active = v ? "outline" : null
        }
        get settings() {
            return this.active === "settings"
        }
        set settings(v) {
            this.active = v ? "settings" : null
        }
        get notes() {
            return this.active === "notes"
        }
        set notes(v) {
            this.active = v ? "notes" : null
        }
    }
    const sidebars = new SidebarState()

    let isShortHeight = $derived(uiStore.isShortHeight)
    let viewportWidth = $state(0)
    let noteToDeleteId = $state<string | null>(null)

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
        vfsStore.clearForwardHistory()
        if (vfsStore.initialized && !viewerStore.getCurrentBook()) {
            goto(localizedPath("/"))
            return
        }

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (
                !target.closest(".note-fab") &&
                !target.closest(".note-popup") &&
                !target.closest(".note-editor")
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
                goto(localizedPath("/"))
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

                // Keep browser history state in sync with current position (e.g. on scroll)
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

                // Debounce the persistent DB update
                if (updateTimeout) clearTimeout(updateTimeout)
                updateTimeout = setTimeout(() => {
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

    let isHoverTriggered = $state(false)

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
        if (!currentUrl) return

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
                        const pagesCount = await doc.getPageNumber()
                        totalPages = pagesCount
                        if (viewerStore.currentPage > pagesCount) {
                            viewerStore.currentPage = pagesCount
                        }
                        if (viewerStore.currentPage < 1) {
                            viewerStore.currentPage = 1
                        }
                        isLoaded = true
                        searchStore.initPdf(doc)

                        const currentBook = viewerStore.getCurrentBook()
                        if (currentBook && currentBook.totalPages !== pagesCount) {
                            viewerStore.updateBook({
                                ...currentBook,
                                totalPages: pagesCount,
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
                        goto(localizedPath("/"))
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
                isPageLoading = false
            })
            return
        }

        const controller = new AbortController()

        untrack(() => {
            const step = mode === "split" ? 2 : 1

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

            if (!matched) {
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

                        if (uiStore.isCompact && pageNo > step) {
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

                        if (uiStore.isCompact && pageNo < totalPages) {
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
        if (pdf) {
            pdf.close()
        }
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
            goto(localizedPath("/") + `?folder=${encodeURIComponent(folderPath)}`)
        } else {
            goto(localizedPath("/"))
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

    function handleBodyClick(e: MouseEvent) {
        if (!uiStore.isCompact) return

        // Don't trigger if user is selecting text
        const selection = window.getSelection()
        if (selection && selection.toString()) return

        const { clientX } = e
        const width = window.innerWidth
        const ratio = clientX / width

        if (ratio < 0.05) {
            sidebars.outline = true
        } else if (ratio < 0.35) {
            prevPage()
        } else if (ratio < 0.65) {
            uiStore.isToolbarsVisible = !uiStore.isToolbarsVisible
        } else if (ratio < 0.95) {
            nextPage()
        } else {
            sidebars.settings = true
        }
    }

    let swipeOffsetX = $state("0px")
    let swipeTransition = $state("none")
    let isTransitioning = $state(false)
    let swipeTimeoutId: any = null
    let pendingPageTurnAction: (() => void) | null = null

    function getPageScale(dim: { width: number; height: number } | null) {
        if (uiStore.isCompact && viewportWidth > 0 && pdf) {
            const pageWidth = dim?.width || pdf.defaultWidth || 612
            if (isShortHeight) {
                return (viewportWidth / pageWidth) * (settingsStore.scale / 1.5)
            }
            return viewportWidth / pageWidth
        }
        return settingsStore.scale
    }

    function getSlideImageStyle(dim: { width: number; height: number } | null) {
        const actualDim =
            dim ||
            (pdf
                ? { width: pdf.defaultWidth || 612, height: pdf.defaultHeight || 792 }
                : { width: 612, height: 792 })
        const scale = getPageScale(actualDim)
        const aspectRatio = `${actualDim.width} / ${actualDim.height}`

        if (uiStore.isCompact && !isShortHeight) {
            if (settingsStore.layout === "split") {
                return `width: 50% !important; height: auto !important; aspect-ratio: ${aspectRatio} !important;`
            }
            return `width: 100% !important; height: auto !important; aspect-ratio: ${aspectRatio} !important;`
        }

        const w = actualDim.width * scale
        const h = actualDim.height * scale
        return `width: ${w}px !important; height: ${h}px !important; aspect-ratio: ${aspectRatio} !important;`
    }

    const prevImageStyle1 = $derived(getSlideImageStyle(prevPageDim1))
    const prevImageStyle2 = $derived(getSlideImageStyle(prevPageDim2))
    const nextImageStyle1 = $derived(getSlideImageStyle(nextPageDim1))
    const nextImageStyle2 = $derived(getSlideImageStyle(nextPageDim2))

    const sliderTrackStyle = $derived(
        `transform: translate3d(calc(-33.333333% + ${swipeOffsetX}), 0, 0); transition: ${swipeTransition};`,
    )

    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0

    function handleTouchStart(e: TouchEvent) {
        if (!uiStore.isCompact) return

        // If a transition is in progress, instantly complete the page turn to avoid lag/race conditions
        if (isTransitioning && swipeTimeoutId && pendingPageTurnAction) {
            clearTimeout(swipeTimeoutId)
            pendingPageTurnAction()
            swipeTransition = "none"
            swipeOffsetX = "0px"
            isTransitioning = false
            swipeTimeoutId = null
            pendingPageTurnAction = null
        }

        if (e.touches.length !== 1) return
        if (sidebars.outline || sidebars.settings) return

        // Don't trigger if touching any button, input, or open sidebar
        const target = e.target as HTMLElement
        if (
            target.closest(
                "button, input, select, textarea, a, .viewer-fab-btn, .settings-sidebar, .outline-sidebar, .viewer-header, .viewer-footer, .sidebar-backdrop",
            )
        ) {
            return
        }

        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartTime = Date.now()

        // Reset positions
        swipeOffsetX = "0px"
        swipeTransition = "none"
    }

    function handleTouchMove(e: TouchEvent) {
        if (!uiStore.isCompact) return
        if (isTransitioning) return
        if (settingsStore.layout === "scroll") return
        if (e.touches.length !== 1) return
        if (sidebars.outline || sidebars.settings) return

        let deltaX = e.touches[0].clientX - touchStartX
        const deltaY = e.touches[0].clientY - touchStartY

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (e.cancelable) {
                e.preventDefault()
            }

            const step = settingsStore.layout === "split" ? 2 : 1
            const hasPrev = viewerStore.currentPage > 1
            const hasNext =
                settingsStore.layout === "split"
                    ? viewerStore.currentPage + step <= totalPages ||
                      viewerStore.currentPage < totalPages
                    : viewerStore.currentPage < totalPages

            if (deltaX > 0 && !hasPrev) {
                // Dragging right, but no prev page -> rubber band
                deltaX = deltaX * 0.3
            } else if (deltaX < 0 && !hasNext) {
                // Dragging left, but no next page -> rubber band
                deltaX = deltaX * 0.3
            }

            swipeOffsetX = `${deltaX}px`
            swipeTransition = "none"
        }
    }

    function handleTouchEnd(e: TouchEvent) {
        if (!uiStore.isCompact) return
        if (isTransitioning) return
        if (settingsStore.layout === "scroll") return
        if (e.changedTouches.length !== 1) return
        if (sidebars.outline || sidebars.settings) return

        const deltaX = e.changedTouches[0].clientX - touchStartX
        const deltaY = e.changedTouches[0].clientY - touchStartY
        const deltaTime = Date.now() - touchStartTime

        const threshold = 50 // minimum distance in px
        const maxDiagonal = 80 // maximum perpendicular deviation in px
        const maxTime = 300 // maximum duration in ms

        const isSwipe =
            (deltaTime < maxTime &&
                Math.abs(deltaX) > threshold &&
                Math.abs(deltaY) < maxDiagonal) ||
            Math.abs(deltaX) > window.innerWidth * 0.3

        if (isSwipe) {
            const isNext = deltaX < 0
            const step = settingsStore.layout === "split" ? 2 : 1
            const canTurn = isNext
                ? viewerStore.currentPage + step <= totalPages ||
                  viewerStore.currentPage < totalPages
                : viewerStore.currentPage - step >= 1 || viewerStore.currentPage > 1

            if (canTurn) {
                isTransitioning = true
                // Slide to the next/prev slide (faster 150ms transition)
                swipeTransition = "transform 0.15s ease-out"
                swipeOffsetX = isNext ? "-33.333333%" : "33.333333%"

                const action = () => {
                    if (isNext) {
                        nextPage()
                    } else {
                        prevPage()
                    }
                }
                pendingPageTurnAction = action

                swipeTimeoutId = setTimeout(() => {
                    action()
                    // Instantly snap track back to center (0px offset)
                    swipeTransition = "none"
                    swipeOffsetX = "0px"
                    isTransitioning = false
                    swipeTimeoutId = null
                    pendingPageTurnAction = null
                }, 150)

                e.preventDefault()
                return
            }
        }

        // Animate back to center
        swipeTransition = "transform 0.2s ease-out"
        swipeOffsetX = "0px"
    }

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
                {#if uiStore.isToolbarsVisible}
                    <div
                        style="position: relative; z-index: 250;"
                        transition:slideHeader={{
                            duration: settingsStore.animations ? 250 : 0,
                        }}
                    >
                        <ViewerHeader
                            {name}
                            {isLoaded}
                            bind:isOutlineOpen={sidebars.outline}
                            bind:isSettingsOpen={sidebars.settings}
                            bind:isNotesOpen={sidebars.notes}
                            onClose={handleClose}
                        />
                    </div>
                {/if}

                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="viewer-body"
                    onclick={(args) => {
                        if (uiStore.isToolbarsVisible) {
                            sidebars.outline = false
                            sidebars.settings = false
                            sidebars.notes = false
                        }
                        if (!sidebars.outline && !sidebars.settings) {
                            handleBodyClick(args)
                        }
                    }}
                    ontouchstart={handleTouchStart}
                    ontouchmove={handleTouchMove}
                    ontouchend={handleTouchEnd}
                >
                    {#if !isLoaded}
                        <div class="loading-state">
                            <Spinner variant="dots" label={m.loading_doc()} />
                        </div>
                    {:else}
                        {#if sidebars.outline}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    sidebars.outline = false
                                    isHoverTriggered = false
                                }}
                            ></div>
                            <OutlineSidebar
                                {isOutlineLoading}
                                {outlineList}
                                bind:currentPage={viewerStore.currentPage}
                                bind:scrollPosition={viewerStore.scrollPosition}
                                {activeHeadings}
                                onCloseOutline={() => {
                                    sidebars.outline = false
                                    isHoverTriggered = false
                                }}
                                onMouseLeave={() => {
                                    if (!uiStore.isToolbarsVisible && isHoverTriggered) {
                                        sidebars.outline = false
                                        isHoverTriggered = false
                                    }
                                }}
                            />
                        {/if}

                        {#if sidebars.settings}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    sidebars.settings = false
                                }}
                            ></div>
                            <SettingsSidebar onClose={() => (sidebars.settings = false)} />
                        {/if}

                        {#if sidebars.notes}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    sidebars.notes = false
                                }}
                            ></div>
                            <NotesSidebar
                                onClose={() => {
                                    sidebars.notes = false
                                }}
                            />
                        {/if}

                        {#if !uiStore.isToolbarsVisible && !sidebars.outline}
                            <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="outline-hover-trigger"
                                onmouseenter={() => {
                                    sidebars.outline = true
                                    isHoverTriggered = true
                                }}
                            ></div>
                        {/if}

                        {#if uiStore.isCompact && settingsStore.layout !== "scroll"}
                            <div
                                class="slider-viewport"
                                class:short-height={isShortHeight}
                                class:single-layout={settingsStore.layout === "single"}
                                bind:clientWidth={viewportWidth}
                            >
                                <div class="slider-track" style={sliderTrackStyle}>
                                    <!-- Previous Slide -->
                                    <div class="slider-slide prev-slide">
                                        {#if prevPageImage}
                                            <div
                                                class="pages-container"
                                                class:split-mode={settingsStore.layout === "split"}
                                            >
                                                {#if settingsStore.layout === "split" && prevPageImage2}
                                                    <div class="book-spread">
                                                        <div
                                                            class="pdf-image-wrapper split-left"
                                                            style={prevImageStyle1}
                                                        >
                                                            <img
                                                                src={prevPageImage}
                                                                class="pdf-image"
                                                                alt={m.page_render_alt({
                                                                    page:
                                                                        viewerStore.currentPage -
                                                                        (settingsStore.layout ===
                                                                        "split"
                                                                            ? 2
                                                                            : 1),
                                                                })}
                                                            />
                                                        </div>
                                                        <div class="book-spine"></div>
                                                        <div
                                                            class="pdf-image-wrapper split-right"
                                                            style={prevImageStyle2}
                                                        >
                                                            <img
                                                                src={prevPageImage2}
                                                                class="pdf-image"
                                                                alt={m.page_render_alt({
                                                                    page:
                                                                        viewerStore.currentPage -
                                                                        (settingsStore.layout ===
                                                                        "split"
                                                                            ? 2
                                                                            : 1) +
                                                                        1,
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                {:else}
                                                    <div
                                                        class="pdf-image-wrapper"
                                                        style={prevImageStyle1}
                                                    >
                                                        <img
                                                            src={prevPageImage}
                                                            class="pdf-image"
                                                            alt={m.page_render_alt({
                                                                page:
                                                                    viewerStore.currentPage -
                                                                    (settingsStore.layout ===
                                                                    "split"
                                                                        ? 2
                                                                        : 1),
                                                            })}
                                                        />
                                                    </div>
                                                {/if}
                                            </div>
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
                                            <div
                                                class="pages-container"
                                                class:split-mode={settingsStore.layout === "split"}
                                            >
                                                {#if settingsStore.layout === "split" && nextPageImage2}
                                                    <div class="book-spread">
                                                        <div
                                                            class="pdf-image-wrapper split-left"
                                                            style={nextImageStyle1}
                                                        >
                                                            <img
                                                                src={nextPageImage}
                                                                class="pdf-image"
                                                                alt={m.page_render_alt({
                                                                    page:
                                                                        viewerStore.currentPage +
                                                                        (settingsStore.layout ===
                                                                        "split"
                                                                            ? 2
                                                                            : 1),
                                                                })}
                                                            />
                                                        </div>
                                                        <div class="book-spine"></div>
                                                        <div
                                                            class="pdf-image-wrapper split-right"
                                                            style={nextImageStyle2}
                                                        >
                                                            <img
                                                                src={nextPageImage2}
                                                                class="pdf-image"
                                                                alt={m.page_render_alt({
                                                                    page:
                                                                        viewerStore.currentPage +
                                                                        (settingsStore.layout ===
                                                                        "split"
                                                                            ? 2
                                                                            : 1) +
                                                                        1,
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                {:else}
                                                    <div
                                                        class="pdf-image-wrapper"
                                                        style={nextImageStyle1}
                                                    >
                                                        <img
                                                            src={nextPageImage}
                                                            class="pdf-image"
                                                            alt={m.page_render_alt({
                                                                page:
                                                                    viewerStore.currentPage +
                                                                    (settingsStore.layout ===
                                                                    "split"
                                                                        ? 2
                                                                        : 1),
                                                            })}
                                                        />
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
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

                        {#if isLoaded && uiStore.isSearchModeActive}
                            {#if searchStore.matches.length > 0}
                                <div
                                    class="search-match-badge {!uiStore.isToolbarsVisible
                                        ? 'hidden-toolbars'
                                        : ''}"
                                >
                                    {searchStore.currentMatchIndex + 1} / {searchStore.matches
                                        .length}
                                </div>
                            {/if}
                            <div
                                class="search-fab-grid {!uiStore.isToolbarsVisible
                                    ? 'hidden-toolbars'
                                    : ''}"
                            >
                                <Button
                                    size="large"
                                    variant="fab"
                                    square={true}
                                    class="viewer-fab-btn fab-prev-search"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        searchStore.prev()
                                    }}
                                    aria-label={m.keymap_prev_match()}
                                    tooltip={`${m.keymap_prev_match()}${getShortcutHint(commandsNode, "prev-search-match")}`}
                                >
                                    <ChevronIcon style="transform: rotate(180deg);" />
                                </Button>
                                <Button
                                    size="large"
                                    variant="fab"
                                    square={true}
                                    class="viewer-fab-btn fab-close-search"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        uiStore.isSearchModeActive = false
                                        searchStore.setQuery("")
                                        uiStore.prompt.clearValue("search")
                                    }}
                                    aria-label={m.prompt_close_aria()}
                                    tooltip={`${m.prompt_close_aria()}${getShortcutHint(commandsNode, "close-search")}`}
                                >
                                    ✕
                                </Button>
                                <Button
                                    size="large"
                                    variant="fab"
                                    square={true}
                                    class="viewer-fab-btn fab-next-search"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        searchStore.next()
                                    }}
                                    aria-label={m.keymap_next_match()}
                                    tooltip={`${m.keymap_next_match()}${getShortcutHint(commandsNode, "next-search-match")}`}
                                >
                                    <ChevronIcon />
                                </Button>
                                <Button
                                    size="large"
                                    variant="fab"
                                    square={true}
                                    class="viewer-fab-btn fab-search"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        uiStore.prompt.mode = "search"
                                        uiStore.prompt.isOpen = true
                                    }}
                                    aria-label={m.keymap_search ? m.keymap_search() : "Search PDF"}
                                    tooltip={`${m.keymap_search ? m.keymap_search() : "Search PDF"}${getShortcutHint(commandsNode, "open-search")}`}
                                >
                                    <SearchIcon />
                                </Button>
                            </div>
                        {:else if isLoaded}
                            <Button
                                size="large"
                                variant="fab"
                                square={true}
                                class="viewer-fab-btn fab-search {!uiStore.isToolbarsVisible
                                    ? 'hidden-toolbars'
                                    : ''}"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    uiStore.prompt.mode = "search"
                                    uiStore.prompt.isOpen = true
                                }}
                                aria-label={m.keymap_search()}
                                tooltip={`${m.keymap_search()}${getShortcutHint(commandsNode, "open-search")}`}
                            >
                                <SearchIcon />
                            </Button>
                        {/if}

                        {#if isLoaded && !uiStore.isSearchModeActive}
                            <Button
                                size="large"
                                variant="fab"
                                square={true}
                                class="viewer-fab-btn fab-prompt {!uiStore.isToolbarsVisible
                                    ? 'hidden-toolbars'
                                    : ''}"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    uiStore.prompt.mode = "global"
                                    uiStore.prompt.isOpen = true
                                }}
                                aria-label={m.keymap_prompt()}
                                tooltip={`${m.keymap_prompt()}${getShortcutHint(commandsNode, "open-prompt")}`}
                            >
                                <TerminalIcon />
                            </Button>

                            {#if !uiStore.isCompact}
                                <Button
                                    variant="fab"
                                    size="large"
                                    square={true}
                                    class="viewer-fab-btn fab-toggle"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        uiStore.isToolbarsVisible = !uiStore.isToolbarsVisible
                                    }}
                                    aria-label={uiStore.isToolbarsVisible
                                        ? m.hide_toolbars()
                                        : m.show_toolbars()}
                                    tooltip={`${uiStore.isToolbarsVisible ? m.hide_toolbars() : m.show_toolbars()}${getShortcutHint(commandsNode, "hide-toolbar")}`}
                                >
                                    {#if uiStore.isToolbarsVisible}
                                        <MinimizeIcon />
                                    {:else}
                                        <MaximizeIcon />
                                    {/if}
                                </Button>
                            {/if}
                        {/if}
                    {/if}
                </div>

                {#if isLoaded && uiStore.isToolbarsVisible}
                    <div
                        style="position: relative; z-index: 250;"
                        transition:slideFooter={{
                            duration: settingsStore.animations ? 250 : 0,
                        }}
                    >
                        <ViewerFooter
                            bind:currentPage={viewerStore.currentPage}
                            bind:scrollPosition={viewerStore.scrollPosition}
                            {totalPages}
                            {isPageLoading}
                            {nextPage}
                            {prevPage}
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
                        12}px; transform: translate(-50%, 0); z-index: 1000;"
                >
                    <button
                        class="fab-btn"
                        onclick={() => {
                            const sel = notesStore.activeSelection
                            if (sel) {
                                notesStore.editingNote = {
                                    isNew: true,
                                    bookId: sel.bookId,
                                    pageNumber: sel.pageNumber,
                                    start: sel.start,
                                    end: sel.end,
                                    text: sel.text,
                                    color: "yellow",
                                    noteContent: "",
                                }
                                notesStore.editorCoords = { x: sel.x, y: sel.y }
                                notesStore.activeSelection = null
                            }
                        }}
                    >
                        <NoteIcon width="16" height="16" />
                        <span>{m.add_note()}</span>
                    </button>
                </div>
            {/if}

            {#if notesStore.activePopup}
                <NotePopup
                    activePopup={notesStore.activePopup}
                    onClose={() => (notesStore.activePopup = null)}
                    onEdit={() => {
                        const note = notesStore.activePopup?.note
                        const coords = notesStore.activePopup
                        if (note && coords) {
                            notesStore.editingNote = note
                            notesStore.editorCoords = { x: coords.x, y: coords.y }
                            notesStore.activePopup = null
                        }
                    }}
                    onDelete={() => {
                        const note = notesStore.activePopup?.note
                        if (note) {
                            noteToDeleteId = note.id
                            notesStore.activePopup = null
                        }
                    }}
                />
            {/if}

            {#if notesStore.editingNote}
                <NoteEditor
                    bind:editorState={notesStore.editingNote}
                    onCancel={() => {
                        notesStore.editingNote = null
                        notesStore.editorCoords = null
                    }}
                    onSave={() => {
                        const editorState = notesStore.editingNote
                        if (editorState) {
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
                    }}
                />
            {/if}

            {#if noteToDeleteId}
                <DeleteConfirmModal
                    message="Delete this highlight and note?"
                    onConfirm={() => {
                        if (noteToDeleteId) {
                            notesStore.deleteNote(noteToDeleteId)
                        }
                        noteToDeleteId = null
                    }}
                    onCancel={() => {
                        noteToDeleteId = null
                    }}
                />
            {/if}
        </div>
    </div>
{/if}

<style>
    .fullscreen-viewer {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
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

    .slider-viewport {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex: 1;
        background: var(--canvas-bg-color);
        box-shadow: inset 3px 3px 0 rgba(0, 0, 0, 0.05);
    }

    @media (min-width: 801px) and (min-height: 501px) {
        .slider-viewport {
            background-image: radial-gradient(var(--border-color) 1px, transparent 0);
            background-size: 24px 24px;
        }
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

    .slider-viewport.single-layout:not(.short-height) .slider-slide {
        justify-content: center;
    }

    .slider-slide .pages-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        box-sizing: border-box;
    }

    .slider-viewport.short-height .slider-slide {
        padding: 16px;
    }

    .slider-viewport.short-height .slider-slide:not(.current-slide) {
        overflow-y: auto;
    }

    .slider-slide .pdf-image-wrapper {
        display: inline-flex;
        position: relative;
        box-sizing: border-box;
    }

    /* Book Spread joined layout */
    .book-spread {
        display: flex;
        position: relative;
        align-items: flex-start;
        box-shadow: 12px 12px 0 var(--shadow-color);
        border: 3px solid var(--border-color);
        background: var(--surface-color);
    }

    .book-spread .pdf-image-wrapper {
        border: none;
        box-shadow: none;
    }

    .book-spread .split-left {
        border-right: 1px solid rgba(0, 0, 0, 0.12);
    }

    :global(html.dark) .book-spread .split-left {
        border-right-color: rgba(255, 255, 255, 0.12);
    }

    .book-spine {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 32px;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 5;
        background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.05) 30%,
            rgba(0, 0, 0, 0.12) 48%,
            rgba(0, 0, 0, 0.18) 50%,
            rgba(0, 0, 0, 0.12) 52%,
            rgba(0, 0, 0, 0.05) 70%,
            rgba(0, 0, 0, 0) 100%
        );
    }

    :global(html.dark) .book-spine {
        background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.15) 30%,
            rgba(0, 0, 0, 0.35) 48%,
            rgba(0, 0, 0, 0.5) 50%,
            rgba(0, 0, 0, 0.35) 52%,
            rgba(0, 0, 0, 0.15) 70%,
            rgba(0, 0, 0, 0) 100%
        );
    }

    /* When mobile-full-width is active (not short height) */
    .slider-viewport:not(.short-height) .pdf-image-wrapper {
        border-width: 0;
        box-shadow: none;
        border-bottom: none !important;
    }

    .slider-viewport:not(.short-height) .book-spread {
        border-width: 0;
        box-shadow: none;
        width: 100% !important;
        border-bottom: none !important;
    }

    .slider-viewport:not(.short-height) .book-spread .pdf-image-wrapper {
        border-bottom: none !important;
    }

    /* When short height, match CanvasPane's default pdf-image-wrapper styling */
    .slider-viewport.short-height .pdf-image-wrapper {
        border: 3px solid var(--border-color);
        box-shadow: 12px 12px 0 var(--shadow-color);
        background: var(--surface-color);
    }

    .slider-slide .pdf-image {
        display: block;
        width: 100% !important;
        height: auto !important;
    }

    :global(html.dark) .slider-slide .pdf-image {
        filter: invert(1) hue-rotate(180deg);
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .sidebar-backdrop {
        display: block;
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(4px);
        z-index: 20;
        cursor: pointer;
        animation: fade-in 0.2s ease-out;
    }

    .outline-hover-trigger {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 24px;
        z-index: 2;
        cursor: pointer;
    }

    :global(.viewer-fab-btn) {
        position: absolute !important;
        right: 24px;
    }

    :global(.fab-prompt) {
        bottom: calc(24px + 50px + 16px);
    }

    :global(.fab-prompt.hidden-toolbars) {
        transform: translateX(100px);
        opacity: 0;
        pointer-events: none;
    }

    :global(.fab-search),
    :global(.fab-next-search) {
        bottom: calc(24px + 50px + 16px + 50px + 16px);
    }

    :global(.fab-jump-back.hidden-toolbars),
    :global(.fab-jump-forward.hidden-toolbars),
    :global(.fab-search.hidden-toolbars),
    :global(.fab-next-search.hidden-toolbars),
    :global(.fab-prev-search.hidden-toolbars),
    :global(.fab-close-search.hidden-toolbars) {
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

    .search-fab-grid {
        position: absolute;
        bottom: 24px;
        right: 24px;
        display: grid;
        grid-template-columns: repeat(2, auto);
        gap: 16px;
        z-index: 100;
        transition:
            transform 0.2s ease,
            opacity 0.2s ease;
    }

    .search-fab-grid.hidden-toolbars {
        transform: translateX(100px);
        opacity: 0;
        pointer-events: none;
    }

    .search-fab-grid :global(.viewer-fab-btn) {
        position: static !important;
        transform: none !important;
    }

    @media (--mobile) {
        :global(.fab-search),
        :global(.fab-next-search) {
            bottom: calc(12px + 44px + 8px);
            right: 12px;
        }

        :global(.fab-jump-back) {
            bottom: calc(12px + 44px + 8px + 44px + 8px);
            right: 12px;
        }

        :global(.fab-jump-forward) {
            bottom: calc(12px + 44px + 8px + 44px + 8px + 44px + 8px);
            right: 12px;
        }

        :global(.fab-prev-search) {
            bottom: calc(12px + 44px + 8px + 44px + 8px);
            right: 12px;
        }

        :global(.fab-close-search) {
            bottom: calc(12px + 44px + 8px + 44px + 8px + 44px + 8px);
            right: 12px;
        }

        :global(.fab-prompt) {
            bottom: 12px;
            right: 12px;
        }

        :global(.fab-toggle) {
            bottom: 12px;
            right: 12px;
        }

        .search-fab-grid {
            bottom: 12px;
            right: 12px;
            gap: 8px;
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

    .search-match-badge {
        position: absolute;
        right: 156px;
        bottom: 64px;
        background: var(--surface-color);
        color: var(--text-color);
        border: 2.5px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        padding: 6px 12px;
        font-family: inherit;
        font-weight: 900;
        font-size: 14px;
        border-radius: 20px;
        z-index: 200;
        white-space: nowrap;
        pointer-events: none;
        transition:
            transform 0.2s ease,
            opacity 0.2s ease;
    }

    .search-match-badge.hidden-toolbars {
        transform: translateX(100px);
        opacity: 0;
    }

    @media (--mobile) {
        .search-match-badge {
            bottom: 46px;
            right: 116px;
            padding: 4px 8px;
            font-size: 12px;
            box-shadow: 2px 2px 0 var(--shadow-color);
            border-width: 2px;
        }
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
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .note-fab .fab-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 5px 5px 0 var(--shadow-color);
        background: var(--accent-active-color);
        color: var(--text-color);
    }
</style>
