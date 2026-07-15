import type { AppCommandPayloads } from "$lib/modules/commands"
import { defineCommands } from "$lib/modules/commands"
import * as m from "$lib/paraglide/messages"

type MutationContext = {
    addBookmark: (payload: AppCommandPayloads["viewer.bookmark.add"]) => void | Promise<void>
    editBookmark: (payload: AppCommandPayloads["viewer.bookmark.edit"]) => void | Promise<void>
    deleteBookmark: (payload: AppCommandPayloads["viewer.bookmark.delete"]) => void | Promise<void>
    addNote: (payload: AppCommandPayloads["viewer.note.add"]) => void | Promise<void>
    editNote: (payload: AppCommandPayloads["viewer.note.edit"]) => void | Promise<void>
    saveNote: (payload: AppCommandPayloads["viewer.note.save"]) => void | Promise<void>
    deleteNote: (payload: AppCommandPayloads["viewer.note.delete"]) => void | Promise<void>
}

export function createViewerMutationCommands(context: MutationContext) {
    return defineCommands({
        "viewer.bookmark.add": {
            id: "viewer.bookmark.add",
            label: () => m.add_bookmark(),
            englishLabel: () => m.add_bookmark({}, { locale: "en" }),
            category: "bookmarks",
            run: context.addBookmark,
            palette: false,
        },
        "viewer.bookmark.edit": {
            id: "viewer.bookmark.edit",
            label: () => m.edit_bookmark(),
            englishLabel: () => m.edit_bookmark({}, { locale: "en" }),
            category: "bookmarks",
            run: context.editBookmark,
        },
        "viewer.bookmark.delete": {
            id: "viewer.bookmark.delete",
            label: () => m.remove_bookmark(),
            englishLabel: () => m.remove_bookmark({}, { locale: "en" }),
            category: "bookmarks",
            run: context.deleteBookmark,
            palette: false,
        },
        "viewer.note.add": {
            id: "viewer.note.add",
            label: () => m.add_note(),
            englishLabel: () => m.add_note({}, { locale: "en" }),
            category: "commands",
            run: context.addNote,
        },
        "viewer.note.edit": {
            id: "viewer.note.edit",
            label: () => m.edit_note(),
            englishLabel: () => m.edit_note({}, { locale: "en" }),
            category: "commands",
            run: context.editNote,
        },
        "viewer.note.save": {
            id: "viewer.note.save",
            label: () => m.save(),
            englishLabel: () => m.save({}, { locale: "en" }),
            category: "commands",
            keymap: "ctrl+enter",
            allowInInputs: true,
            run: context.saveNote,
        },
        "viewer.note.delete": {
            id: "viewer.note.delete",
            label: () => m.delete(),
            englishLabel: () => m.delete({}, { locale: "en" }),
            category: "commands",
            run: context.deleteNote,
        },
    })
}
