<script lang="ts">
    import type { Component } from "svelte"
    import type { HTMLButtonAttributes } from "svelte/elements"
    import * as m from "$lib/paraglide/messages"
    import { goto } from "$app/navigation"
    import { viewerStore, type Book } from "$lib/viewerStore.svelte"
    import TrashIcon from "$lib/components/icons/TrashIcon.svelte"
    import PDFDocument from "$lib/pdf"
    import { resolve } from "$app/paths"

    interface Props extends HTMLButtonAttributes {
        book: Book
        kind: "folder" | "book"
        extension?: "pdf" | "epub"
        Icon?: Component
    }

    let { book, Icon, kind, extension, ...props }: Props = $props()
    let previewDataUrl = $state<string | null>(null)

    $effect(() => {
        if (kind === "book" && extension === "pdf" && book.url) {
            let isCancelled = false
            const loadPreview = async () => {
                const doc = new PDFDocument(book.url)
                try {
                    await doc.load()
                    const page = await doc.getPage(1)
                    const imageUrl = await doc.getCanvasPage(page)
                    if (!isCancelled) {
                        previewDataUrl = imageUrl
                    }
                } catch (err) {
                    console.error("[Card] Failed to load PDF preview:", err)
                } finally {
                    await doc.close()
                }
            }
            loadPreview()
            return () => {
                isCancelled = true
            }
        }
    })

    const onClick = () => {
        viewerStore.setCurrentBook(book)
        goto(resolve("/viewer"))
    }

    const onRemove = (e: MouseEvent) => {
        e.stopPropagation()
        viewerStore.removeBook(book)
    }
</script>

<div class="card">
    <button type="button" class="card-main-button" onclick={onClick} {...props}>
        {#if kind === "book" && extension}
            <div class="badge" aria-label="{m.file_format()}: {extension}">
                {extension}
            </div>
        {/if}

        {#if previewDataUrl}
            <div class="card-preview" aria-hidden="true">
                <div class="pdf-image-wrapper">
                    <img src={previewDataUrl} alt="Cover preview" />
                </div>
            </div>
        {:else if Icon}
            <div class="card-icon" aria-hidden="true">
                <Icon />
            </div>
        {/if}

        <p class="card-title">{book.name}</p>
    </button>

    {#if kind === "book"}
        <button
            type="button"
            class="remove-btn"
            aria-label={m.remove_book ? m.remove_book() : "Remove book"}
            onclick={onRemove}
        >
            <TrashIcon />
        </button>
    {/if}
</div>

<style>
    .card {
        background: var(--card-bg);
        aspect-ratio: 1/1;
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        display: flex;
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

    .card-main-button {
        background: transparent;
        border: none;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        cursor: pointer;
        font-family: inherit;
        text-align: center;
        color: inherit;
        box-sizing: border-box;
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

    .card-preview {
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 120px;
    }

    .pdf-image-wrapper {
        max-width: 100%;
        max-height: 100%;
        display: inline-flex;
    }

    .card-preview img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: block;
    }

    :global(html.dark) .card-preview img {
        filter: invert(1) hue-rotate(180deg);
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

    .remove-btn {
        position: absolute;
        top: 15px;
        left: 15px;
        background: var(--badge-bg);
        color: var(--badge-text);
        border: 2.5px solid var(--border-color);
        box-shadow: 2px 2px 0 var(--shadow-color);
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 12;
        transition:
            transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.2s ease-out;
        opacity: 0;
        pointer-events: none;
    }

    .card:hover .remove-btn,
    .remove-btn:focus-within {
        opacity: 1;
        pointer-events: auto;
    }

    .remove-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--shadow-color);
        filter: brightness(1.15);
    }

    .remove-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    @media (max-width: 600px) {
        .card-main-button {
            padding: 12px;
        }

        .card-icon {
            margin-bottom: 10px;
        }

        .card-icon :global(svg) {
            width: 36px;
            height: 36px;
        }

        .card-preview {
            margin-bottom: 10px;
            height: 80px;
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

        .remove-btn {
            opacity: 1;
            pointer-events: auto;
            top: 8px;
            left: 8px;
            padding: 4px;
            border-width: 1.5px;
        }

        .remove-btn :global(svg) {
            width: 14px;
            height: 14px;
            stroke-width: 2.5;
        }
    }
</style>
