<script lang="ts">
    import { usePreviewUrl } from "$lib/stores/vfsStore.svelte"
    import BookItemIcon from "./icons/BookItemIcon.svelte"

    interface Props {
        bookId: string
    }

    let { bookId }: Props = $props()

    const preview = usePreviewUrl(() => bookId)
    const previewUrl = $derived(preview.url)
</script>

{#if previewUrl}
    <img src={previewUrl} alt="Cover preview" class="prompt-book-preview-img" />
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
