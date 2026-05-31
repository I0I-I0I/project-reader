import type { Book } from "./booksStore.svelte"

interface Folder {
    id: string
    name: string
    children: Folder[] | Book[]
}
