<script lang="ts">
    import { usePreviewUrl } from "$lib/core/vfs/vfsStore.svelte"
    import * as m from "$lib/paraglide/messages"
    import BookItemIcon from "$lib/core/components/icons/BookItemIcon.svelte"
    import type { Snippet } from "svelte"

    interface Props {
        bookId: string
        fallback?: Snippet
    }

    let { bookId, fallback }: Props = $props()

    const preview = usePreviewUrl(() => bookId)
    const previewUrl = $derived(preview.url)
</script>

{#if previewUrl}
    <img src={previewUrl} alt={m.cover_preview_alt()} class="prompt-book-preview-img" />
{:else if fallback}
    {@render fallback()}
{:else}
    <BookItemIcon class="item-icon book" />
{/if}

<style>
    .prompt-book-preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
</style>
