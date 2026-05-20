<script lang="ts">
    import favicon from "$lib/assets/favicon.svg"
    import { themeState } from "$lib/theme.svelte"

    let { children } = $props()

    $effect(() => {
        themeState.updateDOM()
    })
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
    {@render children()}
</div>

<style>
    :global(:root) {
        /* Theme light tokens */
        --bg-color: #f5f0e1;
        --text-color: #1a1a1a;
        --border-color: #1a1a1a;
        --shadow-color: #1a1a1a;
        --card-bg: #ffffff;
        --card-hover-bg: #faf8f5;
        --button-bg: #ffffff;
        --button-hover-bg: #faf8f5;
        --tooltip-bg: #1a1a1a;
        --tooltip-text: #f5f0e1;
        --dropdown-bg: #ffffff;
        --dropdown-hover-bg: #f5f0e1;
        --badge-bg: #ff4d4d;
        --badge-text: #ffffff;
        --link-hover-bg: rgba(0, 0, 0, 0.05);
    }

    :global(html.dark) {
        /* Theme dark tokens */
        --bg-color: #1b1715;
        --text-color: #d2c7b1;
        --border-color: #5c5146;
        --shadow-color: #100d0b;
        --card-bg: #241f1c;
        --card-hover-bg: #2e2824;
        --button-bg: #241f1c;
        --button-hover-bg: #2e2824;
        --tooltip-bg: #d2c7b1;
        --tooltip-text: #1b1715;
        --dropdown-bg: #241f1c;
        --dropdown-hover-bg: #2e2824;
        --badge-bg: #b85244;
        --badge-text: #ffffff;
        --link-hover-bg: rgba(210, 199, 177, 0.08);
    }

    :global(body) {
        margin: 0;
        padding: 0;
        background-color: var(--bg-color);
        color: var(--text-color);
        font-family: Georgia, "Times New Roman", Times, serif;
        transition:
            background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .app {
        padding: 40px;
        min-height: 100dvh;
    }
</style>
