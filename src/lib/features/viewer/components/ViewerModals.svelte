<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import { bookmarksStore } from "$lib/features/viewer/stores/bookmarksStore.svelte"
    import { notesStore } from "$lib/features/viewer/stores/notesStore.svelte"
    import { viewerUIStore } from "$lib/features/viewer/stores/viewerUIStore.svelte"
    import NotePopup from "./NotePopup.svelte"
    import NoteEditor from "./NoteEditor.svelte"
    import BookmarkAddKeymaps from "./BookmarkAddKeymaps.svelte"
    import Modal from "$lib/core/components/ui/modal/Modal.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import DeleteConfirmModal from "$lib/features/library/components/DeleteConfirmModal.svelte"
    import type { CommandScope } from "$lib/features/commands/commandsStore.svelte"
    import type { AppCommandPayloads } from "$lib/features/commands/appCommandPayloads"
    import {
        executeViewerBookmarkDelete,
        executeViewerNoteDelete,
    } from "$lib/features/viewer/commands/viewerMutationExecution"

    interface Props {
        currentBookId: string | null
        currentPage: number
    }

    let { currentBookId, currentPage }: Props = $props()
    let bookmarkAddScope = $state.raw<CommandScope>()

    type BookmarkAddPayload = NonNullable<AppCommandPayloads["viewer.bookmark.add"]>

    function getBookmarkAddPayload(): BookmarkAddPayload {
        return {
            page: currentPage,
            name: viewerUIStore.bookmarkName.trim() || `${m.page()} ${currentPage}`,
        }
    }

    async function handleConfirmAddBookmark(payload: BookmarkAddPayload) {
        if (!currentBookId) return
        const page = payload.page ?? currentPage
        const name = payload.name?.trim() || `${m.page()} ${page}`
        await bookmarksStore.addBookmark(currentBookId, page, name)
        viewerUIStore.closeBookmarkAddModal()
    }

    function focusBookmarkName(input: HTMLInputElement) {
        const frame = requestAnimationFrame(() => {
            input.focus()
            input.select()
        })
        return () => cancelAnimationFrame(frame)
    }
</script>

{#if notesStore.activePopup}
    <NotePopup
        activePopup={notesStore.activePopup}
        onClose={() => (notesStore.activePopup = null)}
        onEdit={() => {
            const popup = notesStore.activePopup
            if (!popup) return
            notesStore.editingNote = popup.note
            notesStore.editorCoords = { x: popup.x, y: popup.y }
            notesStore.activePopup = null
        }}
        onDelete={() => {
            const noteId = notesStore.activePopup?.note.id
            if (!noteId) return
            viewerUIStore.noteToDeleteId = noteId
            notesStore.activePopup = null
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
    />
{/if}

{#if viewerUIStore.noteToDeleteId}
    <DeleteConfirmModal
        message={m.delete_higlight_note()}
        onConfirm={async () => {
            if (!viewerUIStore.noteToDeleteId) return
            await executeViewerNoteDelete({
                noteId: viewerUIStore.noteToDeleteId,
                confirmed: true,
            })
        }}
        onCancel={() => {
            viewerUIStore.noteToDeleteId = null
        }}
    />
{/if}

{#if viewerUIStore.isBookmarkAddModalOpen}
    <BookmarkAddKeymaps
        onConfirm={handleConfirmAddBookmark}
        onCancel={() => viewerUIStore.closeBookmarkAddModal()}
        getPayload={getBookmarkAddPayload}
        bind:scope={bookmarkAddScope}
    />
    <Modal
        variant="default"
        type="float"
        size="medium"
        placement="center"
        onClose={() => void bookmarkAddScope?.execute("modal.cancel")}
        title={m.add_bookmark()}
        initialFocus={() => document.getElementById("header-bookmark-name-input")}
        draggable
    >
        <div class="modal-form">
            <Input
                id="header-bookmark-name-input"
                attachment={focusBookmarkName}
                placeholder={m.bookmark_name_placeholder
                    ? m.bookmark_name_placeholder()
                    : "Bookmark name..."}
                label={m.bookmark_page()}
                bind:value={viewerUIStore.bookmarkName}
                onkeydown={(e) => {
                    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                        e.preventDefault()
                        void bookmarkAddScope?.execute("viewer.bookmark.add", {
                            page: currentPage,
                            name: viewerUIStore.bookmarkName.trim() || `${m.page()} ${currentPage}`,
                        })
                    }
                }}
            />
            <div class="modal-actions">
                <Button
                    variant="brutalist"
                    onclick={() =>
                        void bookmarkAddScope?.execute("viewer.bookmark.add", {
                            page: currentPage,
                            name: viewerUIStore.bookmarkName.trim() || `${m.page()} ${currentPage}`,
                        })}
                >
                    {m.add_bookmark()}
                </Button>
                <Button
                    variant="ghost"
                    onclick={() => void bookmarkAddScope?.execute("modal.cancel")}
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
                await executeViewerBookmarkDelete({
                    bookmarkId: viewerUIStore.bookmarkToDeleteId,
                    confirmed: true,
                })
            }
            viewerUIStore.bookmarkToDeleteId = null
        }}
        onCancel={() => {
            viewerUIStore.bookmarkToDeleteId = null
        }}
    />
{/if}
