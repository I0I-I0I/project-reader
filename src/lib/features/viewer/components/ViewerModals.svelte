<script lang="ts">
    import { tick } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
    import { notesStore } from "$lib/features/viewer/stores/notesStore.svelte"
    import { viewerUIStore } from "$lib/features/viewer/stores/viewerUIStore.svelte"
    import type { UserNote } from "$lib/core/vfs/vfsStore.types"
    import NotePopup from "./NotePopup.svelte"
    import NoteEditor from "./NoteEditor.svelte"
    import BookmarkAddKeymaps from "./BookmarkAddKeymaps.svelte"
    import Modal from "$lib/core/components/ui/Modal.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import DeleteConfirmModal from "$lib/features/library/components/DeleteConfirmModal.svelte"

    interface Props {
        currentBookId: string | null
        currentPage: number
    }

    let { currentBookId, currentPage }: Props = $props()

    async function handleConfirmAddBookmark() {
        if (!currentBookId) return
        const defaultName = `${m.page()} ${currentPage}`
        const nameToUse = viewerUIStore.bookmarkName.trim() || defaultName
        await bookmarksStore.addBookmark(currentBookId, currentPage, nameToUse)
        viewerUIStore.isBookmarkAddModalOpen = false
        viewerUIStore.bookmarkName = ""
    }

    $effect(() => {
        if (viewerUIStore.isBookmarkAddModalOpen) {
            viewerUIStore.bookmarkName = `${m.page()} ${currentPage}`
            tick().then(() => {
                const input = document.getElementById(
                    "header-bookmark-name-input",
                ) as HTMLInputElement | null
                if (input) {
                    input.focus()
                    input.select()
                }
            })
        }
    })
</script>

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
                viewerUIStore.noteToDeleteId = note.id
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

{#if viewerUIStore.noteToDeleteId}
    <DeleteConfirmModal
        message={m.delete_higlight_note()}
        onConfirm={() => {
            if (viewerUIStore.noteToDeleteId) {
                notesStore.deleteNote(viewerUIStore.noteToDeleteId)
            }
            viewerUIStore.noteToDeleteId = null
        }}
        onCancel={() => {
            viewerUIStore.noteToDeleteId = null
        }}
    />
{/if}

{#if viewerUIStore.isBookmarkAddModalOpen}
    <BookmarkAddKeymaps
        onConfirm={handleConfirmAddBookmark}
        onCancel={() => (viewerUIStore.isBookmarkAddModalOpen = false)}
    />
    <Modal
        onClose={() => (viewerUIStore.isBookmarkAddModalOpen = false)}
        title={m.add_bookmark()}
        autofocusClose={false}
    >
        <div class="modal-form">
            <Input
                id="header-bookmark-name-input"
                placeholder={m.bookmark_name_placeholder
                    ? m.bookmark_name_placeholder()
                    : "Bookmark name..."}
                label={m.bookmark_page()}
                bind:value={viewerUIStore.bookmarkName}
                onkeydown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        handleConfirmAddBookmark()
                    }
                }}
            />
            <div class="modal-actions">
                <Button variant="brutalist" onclick={handleConfirmAddBookmark}>
                    {m.add_bookmark()}
                </Button>
                <Button
                    variant="ghost"
                    onclick={() => (viewerUIStore.isBookmarkAddModalOpen = false)}
                >
                    {m.cancel()}
                </Button>
            </div>
        </div>
    </Modal>
{/if}

{#if viewerUIStore.bookmarkToDeleteId}
    <DeleteConfirmModal
        message={m.delete_bookmark_confirm()}
        onConfirm={async () => {
            if (viewerUIStore.bookmarkToDeleteId) {
                await bookmarksStore.deleteBookmark(viewerUIStore.bookmarkToDeleteId)
            }
            viewerUIStore.bookmarkToDeleteId = null
        }}
        onCancel={() => {
            viewerUIStore.bookmarkToDeleteId = null
        }}
    />
{/if}
