import { browser } from "$app/environment"
import { goto } from "$app/navigation"
import { tick } from "svelte"
import { localizedPath } from "$lib/language"
import { vfsStore } from "./vfsStore.svelte"
import { fileNodeToBook, type Book } from "./viewerStore.types"
import type { FileNode } from "./vfsStore.types"

export type JumpType = "folder" | "book_open" | "book_page"

export interface BaseJump {
    type: JumpType
    timestamp: number
}

export interface FolderJump extends BaseJump {
    type: "folder"
    folderId: string | null
    folderPath: string
    folderName: string
}

export interface BookOpenJump extends BaseJump {
    type: "book_open"
    bookId: string
    bookName: string
}

export interface BookPageJump extends BaseJump {
    type: "book_page"
    bookId: string
    bookName: string
    pageNumber: number
    scrollPosition: number
}

export type Jump = FolderJump | BookOpenJump | BookPageJump

export interface ViewerInterface {
    setCurrentBook(book: Book | null, options?: { isJump?: boolean }): Promise<void>
    getCurrentBook(): Book | null
    goToPage?:
        | ((page: number, options?: { scrollPosition?: number; isJump?: boolean }) => void)
        | null
}

class JumplistStore {
    jumps = $state<Jump[]>([])
    currentIndex = $state<number>(-1)
    private isNavigatingHistory = false
    private viewer: ViewerInterface | null = null

    setViewer(viewer: ViewerInterface) {
        this.viewer = viewer
    }

    constructor() {
        if (browser) {
            const savedJumplist = localStorage.getItem("jumplist")
            if (savedJumplist) {
                try {
                    const parsed = JSON.parse(savedJumplist) as any[]
                    this.jumps = parsed.map((j) => {
                        // Migration path for legacy page-only jumps
                        if (!j.type) {
                            return {
                                type: "book_page",
                                bookId: j.bookId,
                                bookName: j.bookName || "Unknown Book",
                                pageNumber: j.pageNumber || 1,
                                scrollPosition: j.scrollPosition || 0,
                                timestamp: Date.now(),
                            } as BookPageJump
                        }
                        return j
                    })
                } catch (e) {
                    console.error("Failed to parse jumplist from localStorage", e)
                }
            }
            const savedJumplistIndex = localStorage.getItem("jumplistIndex")
            if (savedJumplistIndex) {
                this.currentIndex = parseInt(savedJumplistIndex, 10)
            }
        }
    }

    private persist() {
        if (!browser) return
        localStorage.setItem("jumplist", JSON.stringify(this.jumps))
        localStorage.setItem("jumplistIndex", this.currentIndex.toString())
    }

    private truncateForwardHistory() {
        if (this.currentIndex < this.jumps.length - 1) {
            this.jumps = this.jumps.slice(0, this.currentIndex + 1)
        }
    }

    pushFolderJump(folderId: string | null) {
        if (this.isNavigatingHistory) return

        let folderName = ""
        let folderPath = ""

        if (folderId === null) {
            folderName = "Library"
            folderPath = ""
        } else {
            const node = vfsStore.nodes[folderId]
            if (!node || node.type !== "folder") return
            folderName = node.name
            folderPath = vfsStore.getFolderPath(folderId)
        }

        // Avoid duplicate consecutive jumps
        const lastJump = this.jumps[this.currentIndex]
        if (lastJump && lastJump.type === "folder" && lastJump.folderId === folderId) {
            return
        }

        this.truncateForwardHistory()

        this.jumps.push({
            type: "folder",
            folderId,
            folderPath,
            folderName,
            timestamp: Date.now(),
        })

        if (this.jumps.length > 100) {
            this.jumps.shift()
        } else {
            this.currentIndex++
        }
        this.persist()
    }

    pushBookOpenJump(bookId: string) {
        if (this.isNavigatingHistory) return

        const node = vfsStore.nodes[bookId]
        if (!node || node.type !== "file") return

        // Avoid duplicate consecutive jumps
        const lastJump = this.jumps[this.currentIndex]
        if (lastJump && lastJump.type === "book_open" && lastJump.bookId === bookId) {
            return
        }

        this.truncateForwardHistory()

        this.jumps.push({
            type: "book_open",
            bookId,
            bookName: node.name,
            timestamp: Date.now(),
        })

        if (this.jumps.length > 100) {
            this.jumps.shift()
        } else {
            this.currentIndex++
        }
        this.persist()
    }

    pushBookPageJump(bookId: string, pageNumber: number, scrollPosition: number) {
        if (this.isNavigatingHistory) return

        const node = vfsStore.nodes[bookId]
        if (!node || node.type !== "file") return

        // Avoid duplicate consecutive page jumps
        const lastJump = this.jumps[this.currentIndex]
        if (
            lastJump &&
            lastJump.type === "book_page" &&
            lastJump.bookId === bookId &&
            lastJump.pageNumber === pageNumber &&
            Math.abs(lastJump.scrollPosition - scrollPosition) < 0.01
        ) {
            return
        }

        this.truncateForwardHistory()

        this.jumps.push({
            type: "book_page",
            bookId,
            bookName: node.name,
            pageNumber,
            scrollPosition,
            timestamp: Date.now(),
        })

        if (this.jumps.length > 100) {
            this.jumps.shift()
        } else {
            this.currentIndex++
        }
        this.persist()
    }

    async jumpBack() {
        if (this.currentIndex > 0) {
            await this.jumpToIndex(this.currentIndex - 1)
        }
    }

    async jumpForward() {
        if (this.currentIndex < this.jumps.length - 1) {
            await this.jumpToIndex(this.currentIndex + 1)
        }
    }

    async jumpToIndex(index: number) {
        if (index < 0 || index >= this.jumps.length) return
        const jump = this.jumps[index]

        this.isNavigatingHistory = true
        try {
            if (jump.type === "folder") {
                const base = localizedPath("/")
                const url = jump.folderId
                    ? `${base}?folder=${encodeURIComponent(jump.folderPath)}`
                    : base
                this.currentIndex = index
                this.persist()
                await goto(url)
            } else if (jump.type === "book_open") {
                const node = vfsStore.nodes[jump.bookId]
                if (node && node.type === "file") {
                    this.currentIndex = index
                    this.persist()
                    await this.viewer?.setCurrentBook(fileNodeToBook(node as FileNode), {
                        isJump: true,
                    })
                    await goto(localizedPath("/viewer"))
                }
            } else if (jump.type === "book_page") {
                const node = vfsStore.nodes[jump.bookId]
                if (node && node.type === "file") {
                    this.currentIndex = index
                    this.persist()
                    const currentBook = this.viewer?.getCurrentBook()
                    if (currentBook && currentBook.id === jump.bookId) {
                        currentBook.pageNumber = jump.pageNumber
                        currentBook.scrollPosition = jump.scrollPosition
                        if (this.viewer?.goToPage) {
                            this.viewer.goToPage(jump.pageNumber, {
                                scrollPosition: jump.scrollPosition,
                                isJump: false,
                            })
                        }
                    } else {
                        const book = fileNodeToBook(node as FileNode)
                        book.pageNumber = jump.pageNumber
                        book.scrollPosition = jump.scrollPosition
                        await this.viewer?.setCurrentBook(book, { isJump: true })
                    }
                    await goto(localizedPath("/viewer"))
                }
            }
        } catch (e) {
            console.error("Failed executing jump:", e)
        } finally {
            await tick()
            this.isNavigatingHistory = false
        }
    }
}

export const jumplistStore = new JumplistStore()
