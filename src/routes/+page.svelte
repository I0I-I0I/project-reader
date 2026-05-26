<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Header from "$lib/components/Header.svelte"
    import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
    import BookImporter from "$lib/components/BookImporter.svelte"
    import BookIcon from "$lib/components/icons/BookIcon.svelte"

    import { viewerStore, type Book } from "$lib/viewerStore.svelte"
    import { onMount } from "svelte"
    import Card from "$lib/components/Card.svelte"

    let books = $state<Book[]>([])

    onMount(() => {
        const book = viewerStore.getBooks()
        if (book) {
            books = book
        }
    })
</script>

<div class="container">
    <Header />
    {#if books.length !== 0}
        <Breadcrumbs breadcrumbs={[m.library(), m.test()]} />
    {/if}

    <main class="grid">
        {#if books.length !== 0}
            {#each books as book}
                <Card {book} kind="book" extension="pdf" Icon={BookIcon} />
            {/each}
            <BookImporter variant="card" />
        {:else}
            <BookImporter />
        {/if}
    </main>
</div>

<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 40px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
    }
</style>
