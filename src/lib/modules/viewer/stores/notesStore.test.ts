import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { put } = vi.hoisted(() => ({ put: vi.fn(async () => undefined) }))

vi.mock("$lib/modules/documents", () => ({
    vfsStore: { db: { userNotes: { put } } },
}))

import { notesStore } from "./notesStore.svelte"

const note = {
    id: "note-1",
    bookId: "book-1",
    pageNumber: 2,
    start: 10,
    end: 20,
    text: "Selected text",
    noteContent: "Original",
    color: "yellow" as const,
    createdAt: 1,
}

describe("notesStore live editing", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        put.mockClear()
        notesStore.clear()
        notesStore.notes = [{ ...note }]
        notesStore.editingNote = notesStore.notes[0]
    })

    afterEach(() => vi.useRealTimers())

    it("updates visible content and color immediately but debounces persistence", async () => {
        notesStore.updateNoteDraft(note.id, "Changed", "blue")

        expect(notesStore.notes[0]).toMatchObject({ noteContent: "Changed", color: "blue" })
        expect(notesStore.editingNote).toMatchObject({ noteContent: "Changed", color: "blue" })
        expect(put).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(300)
        expect(put).toHaveBeenCalledWith(
            expect.objectContaining({ id: note.id, noteContent: "Changed", color: "blue" }),
        )
    })

    it("flushes an existing note when the editor closes", async () => {
        notesStore.updateNoteDraft(note.id, "Final", "pink")
        await notesStore.closeEditor()

        expect(notesStore.editingNote).toBeNull()
        expect(put).toHaveBeenCalledOnce()
        expect(put).toHaveBeenCalledWith(
            expect.objectContaining({ noteContent: "Final", color: "pink" }),
        )
    })

    it("discards a new-note draft without persisting it", async () => {
        notesStore.editingNote = {
            isNew: true,
            bookId: "book-1",
            pageNumber: 1,
            start: 0,
            end: 5,
            text: "Draft",
            noteContent: "Unsaved",
            color: "green",
        }

        await notesStore.closeEditor()

        expect(notesStore.editingNote).toBeNull()
        expect(put).not.toHaveBeenCalled()
    })
})
