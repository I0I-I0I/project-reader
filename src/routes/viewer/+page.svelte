<script lang="ts">
    import PDFDocument from "$lib/pdf"
    import type { FlatHeading } from "$lib/pdf"
    import Spinner from "$lib/components/ui/Spinner.svelte"
    import Button from "$lib/components/ui/Button.svelte"
    import * as m from "$lib/paraglide/messages"
    import { untrack, onMount, onDestroy } from "svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
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

    function getScrollContainer() {
        return document.querySelector(".canvas-frame")
    }

    const viewerPromptProvider: PromptProvider = ({ value, mode }) => {
        const list: SearchItem[] = []
        const activeTotalPages = viewerStore.activeTotalPages

        if (mode === "page") {
            const num = parseInt(value.trim(), 10)
            const targetPage =
                !isNaN(num) && num >= 1 ? (num > activeTotalPages ? activeTotalPages : num) : null

            if (targetPage !== null) {
                list.push({
                    id: `nav-page-single`,
                    title: `${m.keymap_goto_page()} ${targetPage}`,
                    englishTitle: `${m.keymap_goto_page({}, { locale: "en" })} ${targetPage}`,
                    subtitle: m.jump_page_desc({ page: targetPage, total: activeTotalPages }),
                    englishSubtitle: m.jump_page_desc(
                        { page: targetPage, total: activeTotalPages },
                        { locale: "en" },
                    ),
                    category: "navigation",
                    action: () => {
                        if (viewerStore.goToPage) {
                            viewerStore.goToPage(targetPage)
                        }
                        uiStore.prompt.mode("global")
                        uiStore.prompt.isOpen(false)
                    },
                })
            } else {
                const currentBook = viewerStore.getCurrentBook()
                const currentPageNum = currentBook?.pageNumber || 1
                list.push({
                    id: `nav-page-placeholder`,
                    title: `${m.keymap_goto_page()}...`,
                    englishTitle: `Go to page...`,
                    subtitle: m.jump_page_desc({ page: currentPageNum, total: activeTotalPages }),
                    englishSubtitle: `Jump to a page (1-${activeTotalPages})`,
                    category: "navigation",
                    action: () => {
                        if (viewerStore.goToPage) {
                            viewerStore.goToPage(currentPageNum)
                        }
                        uiStore.prompt.mode("global")
                        uiStore.prompt.isOpen(false)
                    },
                })
            }
        } else if (mode === "global") {
            const num = parseInt(value.trim(), 10)
            if (!isNaN(num) && activeTotalPages > 0 && num >= 1 && num <= activeTotalPages) {
                list.push({
                    id: `nav-page-${num}`,
                    title: `${m.keymap_goto_page()} ${num}`,
                    englishTitle: `${m.keymap_goto_page({}, { locale: "en" })} ${num}`,
                    subtitle: m.jump_page_desc({ page: num, total: activeTotalPages }),
                    englishSubtitle: m.jump_page_desc(
                        { page: num, total: activeTotalPages },
                        { locale: "en" },
                    ),
                    category: "navigation",
                    action: () => {
                        if (viewerStore.goToPage) {
                            viewerStore.goToPage(num)
                        }
                        uiStore.prompt.mode("global")
                        uiStore.prompt.isOpen(false)
                    },
                })
            }
        }

        return list
    }

    usePrompt(viewerPromptProvider)

    const commandsNode = useCommands([
        {
            id: "zoom-in",
            keys: "shift++",
            description: m.keymap_zoom_in(),
            category: "settings",
            subtitle: () => m.scale_subtitle({ scale: Math.round(settingsStore.scale * 100) }),
            action: () => {
                settingsStore.scale = Math.min(settingsStore.scale + 0.1, CONSTANTS.maxScale)
            },
        },
        {
            id: "zoom-out",
            keys: "-",
            description: m.keymap_zoom_out(),
            category: "settings",
            subtitle: () => m.scale_subtitle({ scale: Math.round(settingsStore.scale * 100) }),
            action: () => {
                settingsStore.scale = Math.max(settingsStore.scale - 0.1, CONSTANTS.minScale)
            },
        },
        {
            id: "scroll-down",
            keys: "j",
            description: m.keymap_scroll_down(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: 150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-down",
            keys: "arrowdown",
            description: m.keymap_scroll_down(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: 150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-up",
            keys: "k",
            description: m.keymap_scroll_up(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: -150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-up",
            keys: "arrowup",
            description: m.keymap_scroll_up(),
            category: "navigation",
            action: () => {
                const pane = getScrollContainer()
                if (pane)
                    pane.scrollBy({
                        top: -150,
                        behavior: settingsStore.animations ? "smooth" : "auto",
                    })
            },
        },
        {
            id: "scroll-page-down",
            keys: "d",
            description: m.keymap_scroll_page_down(),
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
            id: "scroll-page-down",
            keys: "pagedown",
            description: m.keymap_scroll_page_down(),
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
            keys: "u",
            description: m.keymap_scroll_page_up(),
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
            id: "scroll-page-up",
            keys: "pageup",
            description: m.keymap_scroll_page_up(),
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
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            id: "next-page",
            keys: "arrowright",
            description: m.keymap_next_page(),
            category: "navigation",
            action: () => {
                nextPage()
            },
        },
        {
            id: "prev-page",
            keys: "shift+space",
            description: m.keymap_prev_page(),
            category: "navigation",
            action: () => {
                prevPage()
            },
        },
        {
            id: "prev-page",
            keys: "arrowleft",
            description: m.keymap_prev_page(),
            category: "navigation",
            action: () => {
                prevPage()
            },
        },
        {
            id: "toggle-outline",
            keys: "shift+o",
            description: m.keymap_toggle_outline(),
            category: "commands",
            action: () => {
                isOutlineOpen = !isOutlineOpen
            },
        },
        {
            id: "toggle-settings",
            keys: "shift+s",
            description: m.keymap_toggle_settings(),
            category: "commands",
            action: () => {
                isSettingsOpen = !isSettingsOpen
            },
        },
        {
            id: "close-viewer",
            keys: "q",
            description: m.keymap_close_viewer(),
            category: "commands",
            action: () => {
                handleClose()
            },
        },
        {
            id: "hide-toolbars",
            keys: "shift+m",
            description: m.keymap_hide_toolbars(),
            category: "commands",
            action: () => {
                uiStore.isToolbarsVisible = !uiStore.isToolbarsVisible
            },
        },
        {
            id: "goto-page",
            keys: "g",
            description: m.keymap_goto_page(),
            category: "menu",
            action: (event: KeyboardEvent) => {
                event.preventDefault()
                uiStore.prompt.mode("page")
                uiStore.prompt.isOpen(true)
            },
        },
    ])

    const url = $derived(viewerStore.getCurrentBook()?.url ?? "")
    const name = $derived(viewerStore.getCurrentBook()?.name ?? "")

    let pdf = $state.raw<PDFDocument | null>(null)
    let isLoaded = $state(false)

    let currentPage = $state(1)
    let currentPageImage = $state<string | null>(null)
    let currentPageImage2 = $state<string | null>(null)
    let isPageLoading = $state(false)

    let totalPages = $state(0)

    let isOutlineOpen = $state(false)
    let isSettingsOpen = $state(false)

    function restoreBookPosition() {
        const book = viewerStore.getCurrentBook()
        currentPage = book?.pageNumber || 1
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

    $effect(() => {
        if (isLoaded) {
            let cPage = currentPage
            untrack(() => {
                const book = viewerStore.getCurrentBook()
                if (book) {
                    viewerStore.updateBook({ ...book, pageNumber: cPage })
                }
            })
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
                        isLoaded = true

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
            } else if (currentPage < totalPages) {
                currentPage += 1
            }
        }
    }

    function prevPage() {
        if (!isPageLoading) {
            const step = settingsStore.layout === "split" ? 2 : 1
            if (currentPage - step >= 1) {
                currentPage -= step
            } else if (currentPage > 1) {
                currentPage = 1
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
                        transition:slideHeader={{ duration: settingsStore.animations ? 250 : 0 }}
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
                            {isPageLoading}
                            {currentPageImage}
                            {currentPageImage2}
                            layoutMode={settingsStore.layout}
                        />

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
                                    uiStore.prompt.mode("global")
                                    uiStore.prompt.isOpen(true)
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
                        transition:slideFooter={{ duration: settingsStore.animations ? 250 : 0 }}
                    >
                        <ViewerFooter
                            bind:currentPage
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

    :global(.fab-toggle) {
        position: absolute;
        bottom: 24px;
        right: 24px;
    }

    @media (--mobile) {
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
</style>
