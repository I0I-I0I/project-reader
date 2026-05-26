<script lang="ts">
    import type { Component } from "svelte"
    import type { HTMLButtonAttributes } from "svelte/elements"
    import * as m from "$lib/paraglide/messages"
    import { goto } from "$app/navigation"
    import { viewerStore, type Book } from "$lib/viewerStore.svelte"

    interface Props extends HTMLButtonAttributes {
        book: Book
        kind: "folder" | "book"
        extension?: "pdf" | "epub"
        Icon?: Component
    }

    let { book, Icon, kind, extension, ...props }: Props = $props()

    const onClick = () => {
        viewerStore.setCurrentBook(book)
        goto("/viewer")
    }
</script>

<button class="card" onclick={onClick} {...props}>
    {#if kind === "book" && extension}
        <div class="badge" aria-label="{m.file_format()}: {extension}">
            {extension}
        </div>
    {/if}

    {#if Icon}
        <div class="card-icon" aria-hidden="true">
            <Icon />
        </div>
    {/if}

    <p class="card-title">{book.name}</p>
</button>

<style>
    .card {
        background: var(--card-bg);
        aspect-ratio: 1/1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        font-family: inherit;
        text-align: center;
        color: inherit;
    }

    .card:hover {
        transform: translate(-4px, -4px);
        box-shadow: 8px 8px 0 var(--shadow-color);
        background-color: var(--card-hover-bg);
    }

    .card:active {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .card-icon {
        margin-bottom: 20px;
        color: var(--text-color);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-icon :global(svg) {
        width: 48px;
        height: 48px;
        stroke-width: 2;
    }

    .card-title {
        font-size: 14px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 0;
        text-align: center;
        max-width: 180px;
        word-wrap: break-word;
        color: var(--text-color);
    }

    .badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: var(--badge-bg);
        color: var(--badge-text);
        font-size: 11px;
        font-weight: bold;
        padding: 4px 10px;
        transform: rotate(-10deg);
        border: 1.5px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        z-index: 10;
        text-transform: uppercase;
    }

    @media (max-width: 600px) {
        .card {
            padding: 12px;
        }

        .card-icon {
            margin-bottom: 10px;
        }

        .card-icon :global(svg) {
            width: 36px;
            height: 36px;
        }

        .card-title {
            font-size: 11px;
            max-width: 100%;
        }

        .badge {
            top: 8px;
            right: 8px;
            font-size: 9px;
            padding: 2px 6px;
        }
    }
</style>
