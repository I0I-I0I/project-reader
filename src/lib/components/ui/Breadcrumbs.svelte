<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { goto } from "$app/navigation"

    interface Props {
        breadcrumbs: {
            name: string
            id: string | null
        }[]
    }

    let { breadcrumbs }: Props = $props()
</script>

{#if breadcrumbs.length > 0}
    <nav aria-label={m.breadcrumb ? m.breadcrumb() : "Breadcrumbs"} class="breadcrumbs-nav">
        <ol class="breadcrumbs-list">
            {#each breadcrumbs as segment, idx (segment.id || "root")}
                <li class="breadcrumb-item">
                    <button
                        type="button"
                        class="breadcrumb-text-btn"
                        class:active={idx === breadcrumbs.length - 1}
                        onclick={() => {
                            vfsStore.clearForwardHistory()
                            goto(segment.id ? `?folder=${segment.id}` : "?")
                        }}
                        disabled={idx === breadcrumbs.length - 1}
                    >
                        {segment.name}
                    </button>
                    {#if idx < breadcrumbs.length - 1}
                        <span class="separator" aria-hidden="true">/</span>
                    {/if}
                </li>
            {/each}
        </ol>
    </nav>
{/if}

<style>
    .breadcrumbs-nav {
        --font-size: clamp(24px, 6vw, 28px);
        --gap: clamp(8px, 6vw, 16px);
        margin-bottom: 20px;
    }

    .breadcrumbs-list {
        display: flex;
        flex-wrap: wrap;
        list-style: none;
        margin: 0;
        padding: 0;
        gap: var(--gap);
    }

    .breadcrumb-item {
        display: flex;
        align-items: center;
        gap: var(--gap);
    }

    .separator {
        color: var(--text-color);
        font-size: var(--font-size);
        font-weight: bold;
        user-select: none;
    }

    .breadcrumb-text-btn {
        font-size: var(--font-size);
        font-weight: normal;
        text-transform: uppercase;
        margin: 0;
        color: var(--text-color);
        letter-spacing: 1px;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        transition: opacity 0.15s ease;
    }

    .breadcrumb-text-btn:not(.active):hover {
        opacity: 0.7;
        text-decoration: underline;
    }

    .breadcrumb-text-btn.active {
        font-weight: bold;
        cursor: default;
    }
</style>
