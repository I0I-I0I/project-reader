<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Header from "$lib/components/Header.svelte"
    import Breadcrumbs from "$lib/components/ui/Breadcrumbs.svelte"
    import BookImporter from "$lib/components/BookImporter.svelte"
    import BookIcon from "$lib/components/icons/BookIcon.svelte"

    import { booksStore } from "$lib/stores/booksStore.svelte"
    import Card from "$lib/components/Card.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import Folder from "$lib/components/Folder.svelte"

    const books = $derived(booksStore.books)
</script>

<div class="container">
    <Header />
    {#if books.length !== 0}
        <Breadcrumbs breadcrumbs={[m.library(), m.test()]} />
    {/if}

    <main class="grid">
        {#if books.length !== 0}
            <Folder type="new-folder" />
            {#each books as book (book.id)}
                <Card {book} kind="book" extension="pdf" Icon={BookIcon} />
            {/each}
            <BookImporter variant="card" />
        {:else}
            <BookImporter />
        {/if}
    </main>

    {#if uiStore.isCompact}
        <button
            class="mobile-prompt-btn"
            onclick={() => (uiStore.isPromptOpen = true)}
            aria-label={m.keymap_prompt ? m.keymap_prompt() : "Open Command Prompt"}
            title={m.keymap_prompt ? m.keymap_prompt() : "Open Command Prompt"}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="square"
                stroke-linejoin="miter"
            >
                <path d="M5 7l5 5-5 5M12 17h7" />
            </svg>
        </button>
    {/if}
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

    @media (max-width: 800px) {
        .container {
            gap: 20px;
        }

        .grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
        }
    }

    .mobile-prompt-btn {
        position: fixed;
        bottom: calc(16px + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        width: 44px;
        height: 44px;
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 3px 3px 0 var(--shadow-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
        color: var(--text-color);
        padding: 0;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mobile-prompt-btn:active {
        transform: translateX(-50%) translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
        background: var(--surface-hover-color);
    }

    .mobile-prompt-btn svg {
        width: 18px;
        height: 18px;
    }
</style>
