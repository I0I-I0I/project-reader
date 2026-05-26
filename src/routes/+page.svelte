<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import FolderIcon from "$lib/components/icons/FolderIcon.svelte"
    import BookIcon from "$lib/components/icons/BookIcon.svelte"
    import Card from "$lib/components/Card.svelte"
    import Header from "$lib/components/Header.svelte"
    import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
    import DocumentViewer from "$lib/components/DocumentViewer.svelte"
    import { Spinner } from "$lib"
</script>

<div class="container">
    <Header />
    <Breadcrumbs breadcrumbs={[m.library(), m.test()]} />

    <main class="grid">
        <Card title={m.test()} kind="folder" Icon={FolderIcon} />
        <Card title={m.book_title()} kind="book" extension="pdf" Icon={BookIcon} />
        <DocumentViewer />
    </main>

    <section class="spinner-playground">
        <h2 class="section-title">Spinner Component Playground</h2>
        <div class="playground-grid">
            <div class="playground-card">
                <h3>Variants</h3>
                <div class="flex-row">
                    <Spinner variant="classic" label="classic" />
                    <Spinner variant="square" label="square" />
                    <Spinner variant="dots" label="dots" />
                </div>
            </div>

            <div class="playground-card">
                <h3>Sizes</h3>
                <div class="flex-row items-end">
                    <Spinner size="sm" label="small" labelPosition="right" />
                    <Spinner size="md" label="medium" labelPosition="right" />
                    <Spinner size="lg" label="large" labelPosition="right" />
                    <Spinner size="xl" label="extra-large" labelPosition="right" />
                </div>
            </div>

            <div class="playground-card">
                <h3>Speeds & Animations</h3>
                <div class="flex-row">
                    <Spinner variant="classic" speed="slow" label="slow stepped" />
                    <Spinner variant="classic" speed="normal" label="normal stepped" />
                    <Spinner variant="classic" speed="fast" label="fast stepped" />
                    <Spinner
                        variant="classic"
                        speed="normal"
                        stepped={false}
                        label="normal smooth"
                    />
                </div>
            </div>

            <div class="playground-card">
                <h3>Label Position</h3>
                <div class="flex-row flex-center">
                    <Spinner variant="square" label="bottom label" labelPosition="bottom" />
                    <Spinner variant="square" label="right label" labelPosition="right" />
                </div>
            </div>
        </div>
    </section>
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

    /* Playground Styles matching the retro neo-brutalist theme */
    .spinner-playground {
        margin-top: 20px;
        padding: 30px;
        border: 2px solid var(--border-color);
        background: var(--card-bg);
        box-shadow: 6px 6px 0 var(--shadow-color);
    }

    .section-title {
        font-family: inherit;
        font-size: 20px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 0 0 24px 0;
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 12px;
        color: var(--text-color);
    }

    .playground-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
    }

    .playground-card {
        border: 2px solid var(--border-color);
        background: var(--card-hover-bg);
        padding: 20px;
        box-shadow: 4px 4px 0 var(--shadow-color);
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .playground-card h3 {
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 0;
        color: var(--text-color);
        border-bottom: 1px dashed var(--border-color);
        padding-bottom: 8px;
    }

    .flex-row {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        align-items: center;
        justify-content: flex-start;
    }

    .flex-row.items-end {
        align-items: flex-end;
    }

    .flex-row.flex-center {
        justify-content: space-around;
        padding: 10px 0;
    }
</style>
