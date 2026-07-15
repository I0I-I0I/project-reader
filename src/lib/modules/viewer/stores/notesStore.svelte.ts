import { SvelteMap } from "svelte/reactivity"
import { browser } from "$app/environment"
import { untrack } from "svelte"
import { vfsStore } from "$lib/modules/documents"
import type { UserNote } from "$lib/modules/documents"

export interface SelectionState {
    bookId: string
    pageNumber: number
    start: number
    end: number
    text: string
    x: number
    y: number
    bottomY: number
}

export interface PopupState {
    note: UserNote
    x: number
    y: number
}

class NotesStore {
    notes = $state<UserNote[]>([])
    activePopup = $state<PopupState | null>(null)
    activeSelection = $state<SelectionState | null>(null)
    editingNote = $state<
        | UserNote
        | {
              isNew: true
              bookId: string
              pageNumber: number
              start: number
              end: number
              text: string
              color: "yellow" | "green" | "blue" | "pink" | "purple"
              noteContent: string
          }
        | null
    >(null)
    editorCoords = $state<{ x: number; y: number } | null>(null)
    scrollingToNoteId = $state<string | null>(null)

    private pageRanges = new SvelteMap<number, { noteId: string; range: Range; color: string }[]>()
    private highlightUpdatePending = false

    async loadNotesForBook(bookId: string) {
        if (!browser) return
        try {
            const loaded = await vfsStore.db.userNotes.getByBookId(bookId)
            this.notes = loaded.sort((a, b) => a.createdAt - b.createdAt)
            this.activePopup = null
            this.activeSelection = null
            this.editingNote = null
            this.editorCoords = null
            this.pageRanges.clear()
            this.updateCSSHighlights()
        } catch (e) {
            console.error("[NotesStore] Failed to load notes:", e)
        }
    }

    async addNote(
        bookId: string,
        pageNumber: number,
        start: number,
        end: number,
        text: string,
        noteContent: string,
        color: "yellow" | "green" | "blue" | "pink" | "purple",
    ) {
        const note: UserNote = {
            id: crypto.randomUUID(),
            bookId,
            pageNumber,
            start,
            end,
            text,
            noteContent,
            color,
            createdAt: Date.now(),
        }

        try {
            await vfsStore.db.userNotes.put(note)
            this.notes.push(note)
            this.notes = [...this.notes] // force reactivity update
            this.activePopup = null
            this.activeSelection = null
            this.editingNote = null
            this.editorCoords = null
            // Trigger highlight refresh
            this.queueHighlightUpdate()
            return note
        } catch (e) {
            console.error("[NotesStore] Failed to add note:", e)
            return null
        }
    }

    async updateNote(
        id: string,
        noteContent: string,
        color: "yellow" | "green" | "blue" | "pink" | "purple",
    ) {
        const idx = this.notes.findIndex((n) => n.id === id)
        if (idx !== -1) {
            const updated = {
                ...this.notes[idx],
                noteContent,
                color,
            }
            try {
                await vfsStore.db.userNotes.put(updated)
                this.notes[idx] = updated
                this.notes = [...this.notes] // force reactivity update
                this.activePopup = null
                this.editingNote = null
                this.editorCoords = null
                this.queueHighlightUpdate()
            } catch (e) {
                console.error("[NotesStore] Failed to update note:", e)
            }
        }
    }

    async deleteNote(id: string) {
        try {
            await vfsStore.db.userNotes.delete(id)
            const noteToDelete = this.notes.find((n) => n.id === id)
            this.notes = this.notes.filter((n) => n.id !== id)

            if (noteToDelete) {
                this.unregisterNoteRange(noteToDelete.pageNumber, id)
            }

            if (this.activePopup?.note.id === id) {
                this.activePopup = null
            }
            if (this.editingNote && "id" in this.editingNote && this.editingNote.id === id) {
                this.editingNote = null
                this.editorCoords = null
            }
            this.queueHighlightUpdate()
        } catch (e) {
            console.error("[NotesStore] Failed to delete note:", e)
        }
    }

    clear() {
        this.notes = []
        this.activePopup = null
        this.activeSelection = null
        this.editingNote = null
        this.editorCoords = null
        this.pageRanges.clear()
        this.updateCSSHighlights()
    }

    registerPageRanges(
        pageNumber: number,
        noteRanges: { noteId: string; range: Range; color: string }[],
    ) {
        this.pageRanges.set(pageNumber, noteRanges)
        this.queueHighlightUpdate()
    }

    unregisterPageRanges(pageNumber: number) {
        if (this.pageRanges.has(pageNumber)) {
            this.pageRanges.delete(pageNumber)
            this.queueHighlightUpdate()
        }
    }

    private unregisterNoteRange(pageNumber: number, noteId: string) {
        const ranges = this.pageRanges.get(pageNumber)
        if (ranges) {
            this.pageRanges.set(
                pageNumber,
                ranges.filter((r) => r.noteId !== noteId),
            )
        }
    }

    queueHighlightUpdate() {
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
            const yellowRanges: Range[] = []
            const greenRanges: Range[] = []
            const blueRanges: Range[] = []
            const pinkRanges: Range[] = []
            const purpleRanges: Range[] = []
            const activeRanges: Range[] = []

            const activeNoteId =
                this.activePopup?.note.id ||
                (this.editingNote && !("isNew" in this.editingNote)
                    ? (this.editingNote as UserNote).id
                    : null)

            for (const noteRanges of this.pageRanges.values()) {
                for (const item of noteRanges) {
                    const { noteId, range, color } = item
                    if (
                        range &&
                        range.startContainer &&
                        range.startContainer.isConnected &&
                        range.endContainer &&
                        range.endContainer.isConnected
                    ) {
                        if (noteId === activeNoteId) {
                            activeRanges.push(range)
                        } else {
                            if (color === "yellow") yellowRanges.push(range)
                            else if (color === "green") greenRanges.push(range)
                            else if (color === "blue") blueRanges.push(range)
                            else if (color === "pink") pinkRanges.push(range)
                            else if (color === "purple") purpleRanges.push(range)
                            else yellowRanges.push(range)
                        }
                    }
                }
            }

            try {
                // @ts-ignore - Highlight API is valid in browser but may lack typings
                CSS.highlights.set("user-note-yellow", new Highlight(...yellowRanges))
                // @ts-ignore
                CSS.highlights.set("user-note-green", new Highlight(...greenRanges))
                // @ts-ignore
                CSS.highlights.set("user-note-blue", new Highlight(...blueRanges))
                // @ts-ignore
                CSS.highlights.set("user-note-pink", new Highlight(...pinkRanges))
                // @ts-ignore
                CSS.highlights.set("user-note-purple", new Highlight(...purpleRanges))
                // @ts-ignore
                CSS.highlights.set("user-note-active", new Highlight(...activeRanges))
            } catch (e) {
                console.error("[NotesStore] Failed to update CSS Highlights:", e)
            }
        })
    }
}

export const notesStore = new NotesStore()

// Helper Functions for offset calculation and range matching
export function getGlobalOffset(
    node: Node,
    offset: number,
    cachedSpanRanges: any[],
): number | null {
    if (node.nodeType === Node.TEXT_NODE) {
        const entry = cachedSpanRanges.find((s) => s.textNode === node)
        if (entry) return entry.start + offset
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const entry = cachedSpanRanges.find((s) => s.span === node)
        if (entry) {
            if (offset === 0) return entry.start
            if (offset >= node.childNodes.length) return entry.end
            const child = node.childNodes[offset]
            if (child) {
                return getGlobalOffset(child, 0, cachedSpanRanges)
            }
            return entry.start
        }
    }
    // Fallback: search for parent span
    const parentSpan = node.parentElement?.closest("span")
    if (parentSpan) {
        const entry = cachedSpanRanges.find((s) => s.span === parentSpan)
        if (entry) {
            if (entry.textNode === node) {
                return entry.start + offset
            }
            return entry.start
        }
    }
    return null
}

export function getOffsetFromPoint(
    e: MouseEvent,
    textContainer: HTMLElement,
    cachedSpanRanges: any[],
): number | null {
    if (!cachedSpanRanges || cachedSpanRanges.length === 0) return null
    let range: Range | null = null

    // @ts-ignore
    if (document.caretRangeFromPoint) {
        // @ts-ignore
        range = document.caretRangeFromPoint(e.clientX, e.clientY)
    } else if ((e as any).rangeParent) {
        // Firefox fallback
        range = document.createRange()
        range.setStart((e as any).rangeParent, (e as any).rangeOffset)
        range.setEnd((e as any).rangeParent, (e as any).rangeOffset)
    }

    if (!range) return null

    const textNode = range.startContainer
    const offset = range.startOffset

    // Find which span contains this textNode
    const entry = cachedSpanRanges.find(
        (s) => s.textNode === textNode || s.span === textNode || s.span.contains(textNode),
    )
    if (entry) {
        return entry.start + offset
    }
    return null
}

export function getTextNodeAndOffset(
    parent: Node,
    targetOffset: number,
): { node: Node; offset: number } {
    if (parent.nodeType === Node.TEXT_NODE) {
        return { node: parent, offset: targetOffset }
    }
    let current = 0
    for (let i = 0; i < parent.childNodes.length; i++) {
        const child = parent.childNodes[i]
        const textLen = child.textContent?.length || 0
        if (current + textLen >= targetOffset) {
            return getTextNodeAndOffset(child, targetOffset - current)
        }
        current += textLen
    }
    return { node: parent.firstChild || parent, offset: targetOffset - current }
}

export interface SpanRange {
    span: HTMLSpanElement
    textNode: Node
    start: number
    end: number
}

export function buildSpanRanges(textContainer: HTMLElement): SpanRange[] {
    const spans = Array.from(textContainer.querySelectorAll("span"))
    let currentOffset = 0
    return spans.map((span) => {
        const text = span.textContent || ""
        const len = text.length
        const entry = {
            span,
            textNode: span.firstChild || span,
            start: currentOffset,
            end: currentOffset + len,
        }
        currentOffset += len
        return entry
    })
}

export function findSpanByOffset(ranges: SpanRange[], offset: number): SpanRange | null {
    let lo = 0,
        hi = ranges.length - 1
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1
        const entry = ranges[mid]
        if (entry.end <= offset) lo = mid + 1
        else if (entry.start > offset) hi = mid - 1
        else return entry
    }
    return null
}
