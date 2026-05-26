<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Header from "$lib/components/Header.svelte"
    import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
    import BookImporter from "$lib/components/BookImporter.svelte"
</script>

<div class="container">
    <Header />
    <Breadcrumbs breadcrumbs={[m.library(), m.test()]} />

    <main class="grid">
        <BookImporter />
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
