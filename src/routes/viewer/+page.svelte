<script lang="ts">
    import PDFDocument from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack, onMount, onDestroy } from "svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { searchStore } from "$lib/stores/searchStore.svelte"
    import { goto } from "$app/navigation"

    import ViewerHeader from "./components/ViewerHeader.svelte"
    import OutlineSidebar from "./components/OutlineSidebar.svelte"
    import SettingsSidebar from "./components/SettingsSidebar.svelte"
    import CanvasPane from "./components/CanvasPane.svelte"
    import ViewerFooter from "./components/ViewerFooter.svelte"
    import { resolve } from "$app/paths"
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

    function getScrollContainer() {
        return document.querySelector(".canvas-frame")
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
                        action: () => {
                            searchStore.addToHistory(queryText)
                            searchStore.currentMatchIndex = i
                            if (viewerStore.goToPage) {
                                viewerStore.goToPage(match.pageNumber)
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
                            viewerStore.goToPage(targetPage)
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
                            viewerStore.goToPage(currentPageNum)
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
                            viewerStore.goToPage(num)
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
            keys: "shift++",
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
            keys: "j",
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
            id: "scroll-down-alt",
            keys: "arrowdown",
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
            keys: "k",
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
            id: "scroll-up-alt",
            keys: "arrowup",
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
            id: "scroll-page-down-main",
            keys: "d",
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
            id: "scroll-page-down-alt",
            keys: "pagedown",
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
            id: "scroll-page-up-main",
            keys: "u",
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
            id: "scroll-page-up-alt",
            keys: "pageup",
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
            keys: "space",
            description: m.keymap_next_page(),
            englishDescription: m.keymap_next_page({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            id: "next-page-alt",
            keys: "arrowright",
            description: m.keymap_next_page(),
            englishDescription: m.keymap_next_page({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            id: "prev-page",
            keys: "shift+space",
            description: m.keymap_prev_page(),
            englishDescription: m.keymap_prev_page({}, { locale: "en" }),
            category: "navigation",
            action: () => {
                prevPage()
            },
        },
        {
            id: "prev-page-alt",
            keys: "arrowleft",
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
                isOutlineOpen = !isOutlineOpen
            },
        },
        {
            id: "toggle-settings",
            keys: "shift+s",
            description: m.keymap_toggle_settings(),
            englishDescription: m.keymap_toggle_settings({}, { locale: "en" }),
            category: "commands",
            action: () => {
                isSettingsOpen = !isSettingsOpen
            },
        },
        {
            id: "close-viewer",
            keys: "q",
            description: m.keymap_close_viewer(),
            englishDescription: m.keymap_close_viewer({}, { locale: "en" }),
            category: "commands",
            action: () => {
                const book = viewerStore.getCurrentBook()
                if (book) {
                    vfsStore.pushForwardHistory(book.id)
                }
                handleClose()
            },
        },
        {
            id: "hide-toolbars",
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
            id: "close-search",
            keys: "escape",
            description: m.prompt_close_aria ? m.prompt_close_aria() : "Close search",
            englishDescription: "Close search",
            category: "commands",
            action: () => {
                if (uiStore.isSearchModeActive) {
                    uiStore.isSearchModeActive = false
                    searchStore.setQuery("")
                    uiStore.prompt.clearValue("search")
                }
            },
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

    const url = $derived(viewerStore.getCurrentBook()?.url ?? "")
    const name = $derived(viewerStore.getCurrentBook()?.name ?? "")

    let pdf = $state.raw<PDFDocument | null>(null)
    let isLoaded = $state(false)

    let currentPage = $state(1)
    let scrollPosition = $state(0)
    let currentPageImage = $state<string | null>(null)
    let currentPageImage2 = $state<string | null>(null)
    let isPageLoading = $state(false)

    let totalPages = $state(0)

    let isOutlineOpen = $state(false)
    let isSettingsOpen = $state(false)

    function restoreBookPosition() {
        const book = viewerStore.getCurrentBook()
        currentPage = book?.pageNumber || 1
        scrollPosition = book?.scrollPosition || 0
    }

    onMount(() => {
        vfsStore.clearForwardHistory()
        if (vfsStore.initialized && !viewerStore.getCurrentBook()) {
            goto(resolve("/"))
            return
        }
        restoreBookPosition()
    })

    $effect(() => {
        if (vfsStore.initialized) {
            const currentBook = viewerStore.getCurrentBook()
            if (!currentBook || currentBook.isLocked) {
                goto(resolve("/"))
            }
        }
    })

    let updateTimeout: ReturnType<typeof setTimeout> | undefined
    $effect(() => {
        if (isLoaded) {
            const cPage = currentPage
            const sPos = scrollPosition
            const activeBook = viewerStore.getCurrentBook()
            if (!activeBook) return

            untrack(() => {
                // Update reactive state immediately for responsiveness
                activeBook.pageNumber = cPage
                activeBook.scrollPosition = sPos

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
                    viewerStore.updateBook({
                        ...activeBook,
                        pageNumber: cPage,
                        scrollPosition: sPos,
                    })
                }
            }
        }
    })

    $effect(() => {
        if (isOutlineOpen) {
            untrack(() => {
                isSettingsOpen = false
            })
        }
    })

    $effect(() => {
        if (isSettingsOpen) {
            untrack(() => {
                isOutlineOpen = false
            })
        }
    })

    let outlineList = $state<FlatHeading[] | null>(null)
    let isOutlineLoading = $state(false)

    let isHoverTriggered = $state(false)

    let activeHeadings = $derived.by(() => {
        if (!outlineList || outlineList.length === 0) return new Set<FlatHeading>()

        const onCurrentPage = outlineList.filter((h) => h.pageNumber === currentPage)
        if (onCurrentPage.length > 0) {
            return new Set<FlatHeading>(onCurrentPage)
        }

        let precedingCandidate: FlatHeading | null = null
        for (const heading of outlineList) {
            if (heading.pageNumber !== undefined && heading.pageNumber < currentPage) {
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
            currentPage = viewerStore.getCurrentBook()?.pageNumber || 1

            const loadPdf = async (pdfUrl: string) => {
                try {
                    const doc = new PDFDocument(pdfUrl)
                    await doc.load(settingsStore.scale)

                    if (!canceled) {
                        loadedDoc = doc
                        pdf = doc
                        const pagesCount = await doc.getPageNumber()
                        totalPages = pagesCount
                        if (currentPage > pagesCount) {
                            currentPage = pagesCount
                        }
                        if (currentPage < 1) {
                            currentPage = 1
                        }
                        isLoaded = true
                        searchStore.indexPdf(doc)

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
                        goto(resolve("/"))
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
        const pageNo = currentPage
        const mode = settingsStore.layout
        const quality = settingsStore.quality

        if (!currentPdf || !loaded || mode === "scroll") {
            untrack(() => {
                currentPageImage = null
                currentPageImage2 = null
            })
            return
        }

        const controller = new AbortController()

        untrack(() => {
            isPageLoading = true

            const renderPages = async () => {
                let img1: string | null = null
                let img2: string | null = null
                try {
                    const page1 = await currentPdf.getPage(pageNo)
                    img1 = await currentPdf.getCanvasPage(page1, quality, controller.signal)

                    if (mode === "split" && pageNo + 1 <= totalPages) {
                        const page2 = await currentPdf.getPage(pageNo + 1)
                        img2 = await currentPdf.getCanvasPage(page2, quality, controller.signal)
                    }

                    if (!controller.signal.aborted) {
                        untrack(() => {
                            currentPageImage = img1
                            currentPageImage2 = img2
                            isPageLoading = false
                        })
                    }
                } catch (err: any) {
                    if (err.message?.startsWith("Rendering cancelled")) {
                        console.error("Failed to render page(s):", err)
                    }
                    if (!controller.signal.aborted) {
                        untrack(() => {
                            isPageLoading = false
                        })
                    }
                }
            }

            renderPages()
        })

        return () => {
            controller.abort()
        }
    })

    onDestroy(() => {
        if (pdf) {
            pdf.close()
        }
    })

    $effect(() => {
        const currentPdf = pdf
        const loaded = isLoaded

        if (!currentPdf || !loaded) {
            untrack(() => {
                outlineList = null
                isOutlineLoading = false
            })
            return
        }

        let canceled = false

        untrack(() => {
            isOutlineLoading = true
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

    $effect(() => {
        viewerStore.goToPage = (page: number) => {
            if (page >= 1 && page <= totalPages) {
                currentPage = page
                scrollPosition = 0
            }
        }
        return () => {
            viewerStore.goToPage = null
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
            console.log("goto", resolve("/") + `?folder=${encodeURIComponent(folderPath)}`)
            goto(resolve("/") + `?folder=${encodeURIComponent(folderPath)}`)
        } else {
            goto(resolve("/"))
        }
    }

    function nextPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (currentPage + step <= totalPages) {
                currentPage += step
                scrollPosition = 0
            } else if (currentPage < totalPages) {
                currentPage += 1
                scrollPosition = 0
            }
        }
    }

    function prevPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (currentPage - step >= 1) {
                currentPage -= step
                scrollPosition = 0
            } else if (currentPage > 1) {
                currentPage = 1
                scrollPosition = 0
            }
        }
    }

    function handleBodyClick(e: MouseEvent) {
        if (uiStore.isToolbarsVisible) return
        if (!uiStore.isCompact) return

        const { clientX } = e
        const { innerWidth } = window
        if (clientX < innerWidth * 0.3) {
            prevPage()
        } else if (clientX > innerWidth * 0.7) {
            nextPage()
        }
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
                            bind:isOutlineOpen
                            bind:isSettingsOpen
                            onClose={handleClose}
                        />
                    </div>
                {/if}

                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="viewer-body" onclick={handleBodyClick}>
                    {#if !isLoaded}
                        <div class="loading-state">
                            <Spinner variant="dots" label={m.loading_doc()} />
                        </div>
                    {:else}
                        {#if isOutlineOpen}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    isOutlineOpen = false
                                    isHoverTriggered = false
                                }}
                            ></div>
                            <OutlineSidebar
                                {isOutlineLoading}
                                {outlineList}
                                bind:currentPage
                                bind:scrollPosition
                                {activeHeadings}
                                onCloseOutline={() => {
                                    isOutlineOpen = false
                                    isHoverTriggered = false
                                }}
                                onMouseLeave={() => {
                                    if (!uiStore.isToolbarsVisible && isHoverTriggered) {
                                        isOutlineOpen = false
                                        isHoverTriggered = false
                                    }
                                }}
                            />
                        {/if}

                        {#if isSettingsOpen}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="sidebar-backdrop"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    isSettingsOpen = false
                                }}
                            ></div>
                            <SettingsSidebar onClose={() => (isSettingsOpen = false)} />
                        {/if}

                        {#if !uiStore.isToolbarsVisible && !isOutlineOpen}
                            <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="outline-hover-trigger"
                                onmouseenter={() => {
                                    isOutlineOpen = true
                                    isHoverTriggered = true
                                }}
                            ></div>
                        {/if}

                        <CanvasPane
                            {pdf}
                            scale={settingsStore.scale}
                            bind:currentPage
                            bind:scrollPosition
                            {isPageLoading}
                            {currentPageImage}
                            {currentPageImage2}
                            layoutMode={settingsStore.layout}
                        />

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
                            <Button
                                size="large"
                                variant="fab"
                                square={true}
                                class="viewer-fab-btn fab-close-search {!uiStore.isToolbarsVisible
                                    ? 'hidden-toolbars'
                                    : ''}"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    uiStore.isSearchModeActive = false
                                    searchStore.setQuery("")
                                    uiStore.prompt.clearValue("search")
                                }}
                                aria-label={m.prompt_close_aria
                                    ? m.prompt_close_aria()
                                    : "Close search"}
                                tooltip={`${m.prompt_close_aria ? m.prompt_close_aria() : "Close search"}${getShortcutHint(commandsNode, "close-search")}`}
                            >
                                ✕
                            </Button>
                            <Button
                                size="large"
                                variant="fab"
                                square={true}
                                class="viewer-fab-btn fab-prev-search {!uiStore.isToolbarsVisible
                                    ? 'hidden-toolbars'
                                    : ''}"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    searchStore.prev()
                                }}
                                aria-label={m.keymap_prev_match
                                    ? m.keymap_prev_match()
                                    : "Previous match"}
                                tooltip={`${m.keymap_prev_match ? m.keymap_prev_match() : "Previous match"}${getShortcutHint(commandsNode, "prev-search-match")}`}
                            >
                                <ChevronIcon style="transform: rotate(180deg);" />
                            </Button>
                            <Button
                                size="large"
                                variant="fab"
                                square={true}
                                class="viewer-fab-btn fab-next-search {!uiStore.isToolbarsVisible
                                    ? 'hidden-toolbars'
                                    : ''}"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    searchStore.next()
                                }}
                                aria-label={m.keymap_next_match
                                    ? m.keymap_next_match()
                                    : "Next match"}
                                tooltip={`${m.keymap_next_match ? m.keymap_next_match() : "Next match"}${getShortcutHint(commandsNode, "next-search-match")}`}
                            >
                                <ChevronIcon />
                            </Button>
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
                                aria-label={m.keymap_search ? m.keymap_search() : "Search PDF"}
                                tooltip={`${m.keymap_search ? m.keymap_search() : "Search PDF"}${getShortcutHint(commandsNode, "open-search")}`}
                            >
                                <SearchIcon />
                            </Button>
                        {/if}

                        {#if isLoaded}
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
                                aria-label={m.keymap_prompt
                                    ? m.keymap_prompt()
                                    : "Open Command Prompt"}
                                tooltip={`${m.keymap_prompt ? m.keymap_prompt() : "Open Command Prompt"}${getShortcutHint(commandsNode, "open-prompt")}`}
                            >
                                <TerminalIcon />
                            </Button>

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
                                tooltip={`${uiStore.isToolbarsVisible ? m.hide_toolbars() : m.show_toolbars()}${getShortcutHint(commandsNode, "hide-toolbars")}`}
                            >
                                {#if uiStore.isToolbarsVisible}
                                    <MinimizeIcon />
                                {:else}
                                    <MaximizeIcon />
                                {/if}
                            </Button>
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
                            bind:currentPage
                            bind:scrollPosition
                            {totalPages}
                            {isPageLoading}
                            {nextPage}
                            {prevPage}
                        />
                    </div>
                {/if}
            </div>
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
        background: var(--surface-hover-color);
        display: flex;
        flex-direction: row;
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

    :global(.fab-search.hidden-toolbars),
    :global(.fab-next-search.hidden-toolbars),
    :global(.fab-prev-search.hidden-toolbars),
    :global(.fab-close-search.hidden-toolbars) {
        transform: translateX(100px);
        opacity: 0;
        pointer-events: none;
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

    @media (--mobile) {
        :global(.fab-search),
        :global(.fab-next-search) {
            bottom: calc(16px + 44px + 12px + 44px + 12px);
            right: 16px;
        }

        :global(.fab-prev-search) {
            bottom: calc(16px + 44px + 12px + 44px + 12px + 44px + 12px);
            right: 16px;
        }

        :global(.fab-close-search) {
            bottom: calc(16px + 44px + 12px + 44px + 12px + 44px + 12px + 44px + 12px);
            right: 16px;
        }

        :global(.fab-prompt) {
            bottom: calc(16px + 44px + 12px);
            right: 16px;
        }

        :global(.fab-toggle) {
            bottom: 16px;
            right: 16px;
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
        right: 90px;
        bottom: calc(24px + 50px + 16px + 50px + 16px + 12px);
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
            right: 76px;
            bottom: calc(16px + 44px + 12px + 44px + 12px + 10px);
            padding: 4px 8px;
            font-size: 12px;
            box-shadow: 2px 2px 0 var(--shadow-color);
            border-width: 2px;
        }
    }
</style>
