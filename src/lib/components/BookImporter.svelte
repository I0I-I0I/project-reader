<script lang="ts">
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import * as m from "$lib/paraglide/messages"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { saveBookFile } from "$lib/db"
    import { getContext, onMount } from "svelte"
    import { KEYMAP_CONTEXT_KEY, KeymapNode } from "$lib/keymaps"

    interface Props {
        onimport?: (book: { url: string; name: string }) => void
        variant?: "full" | "card"
    }

    let { onimport, variant = "full" }: Props = $props()

    const activeNode = getContext<KeymapNode>(KEYMAP_CONTEXT_KEY)
    let fileInput = $state<HTMLInputElement | null>(null)
    let dragCount = $state(0)
    let isDragging = $derived(dragCount > 0)

    async function processFiles(files: FileList | File[]) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                continue
            }
            const name = file.name
            const id = `book_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            try {
                await saveBookFile(id, file)
                const url = URL.createObjectURL(file)
                viewerStore.addBook({
                    id,
                    url,
                    name,
                    updatedAt: Date.now(),
                    pageNumber: 1,
                    isLocked: false,
                })
                if (onimport) {
                    onimport({ url, name })
                }
            } catch (err) {
                console.error("Failed to process file:", err)
            }
        }
    }

    function handleFileChange(event: Event) {
        const target = event.target as HTMLInputElement
        const fileList = target.files
        if (fileList && fileList.length > 0) {
            processFiles(fileList)
        }
    }

    async function handleImportClick(event?: MouseEvent) {
        if (event) event.stopPropagation()
        if (typeof window.showOpenFilePicker === "function") {
            try {
                const handles = await window.showOpenFilePicker({
                    types: [
                        {
                            description: "PDF Ebooks",
                            accept: { "application/pdf": [".pdf"] },
                        },
                    ],
                    multiple: true,
                })

                for (const handle of handles) {
                    const id = `book_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                    try {
                        await saveBookFile(id, handle)
                        const file = await handle.getFile()
                        const url = URL.createObjectURL(file)
                        viewerStore.addBook({
                            id,
                            url,
                            name: handle.name,
                            updatedAt: Date.now(),
                            pageNumber: 1,
                            isLocked: false,
                        })
                        if (onimport) {
                            onimport({ url, name: handle.name })
                        }
                    } catch (err) {
                        console.error("Failed to import book via handle:", err)
                    }
                }
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("showOpenFilePicker failed, falling back to standard input", err)
                    fileInput?.click()
                }
            }
        } else {
            fileInput?.click()
        }
    }

    function handleDragEnter(event: DragEvent) {
        event.preventDefault()
        dragCount++
    }

    function handleDragLeave(event: DragEvent) {
        event.preventDefault()
        dragCount = Math.max(0, dragCount - 1)
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault()
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault()
        dragCount = 0

        const files = event.dataTransfer?.files
        if (files && files.length > 0) {
            processFiles(files)
        }
    }

    onMount(() => {
        if (activeNode) {
            return activeNode.register({
                keys: "shift+i",
                action: (e) => {
                    e.preventDefault()
                    handleImportClick(null as any)
                },
                description: "Import book",
            })
        }
    })
</script>

{#if variant === "card"}
    <button
        type="button"
        class="card card-importer"
        class:drag-active={isDragging}
        onclick={handleImportClick}
        ondragenter={handleDragEnter}
        ondragleave={handleDragLeave}
        ondragover={handleDragOver}
        ondrop={handleDrop}
    >
        <div class="card-icon" aria-hidden="true">
            <PlusIcon />
        </div>
        <p class="card-title">{m.import_pdf()}</p>
    </button>
{:else}
    <div
        class="reader-card"
        class:drag-active={isDragging}
        role="region"
        aria-label="PDF drop zone"
        ondragenter={handleDragEnter}
        ondragleave={handleDragLeave}
        ondragover={handleDragOver}
        ondrop={handleDrop}
    >
        <div class="upload-zone">
            <div class="dashed-border">
                <div class="upload-icon-wrapper" aria-hidden="true">
                    <PlusIcon width="48" height="48" />
                </div>
                <h3>{m.import_pdf()}</h3>
                <p>{m.upload_p_text()}</p>
                <button type="button" class="btn upload-btn" onclick={handleImportClick}>
                    {m.choose_pdf()}
                </button>
            </div>
        </div>
    </div>
{/if}

<input
    bind:this={fileInput}
    type="file"
    accept=".pdf"
    multiple
    onchange={handleFileChange}
    style="display: none;"
/>

<style>
    .reader-card {
        grid-column: 1 / -1;
        background: var(--card-bg, #ffffff);
        border: 3px solid var(--border-color);
        box-shadow: 8px 8px 0 var(--shadow-color);
        margin-top: 20px;
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        overflow: hidden;
    }

    /* Neo-brutalist button style */
    .btn {
        background: var(--button-bg, #ffffff);
        border: 2px solid var(--border-color);
        font-family: inherit;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--text-color);
        padding: 8px 16px;
        cursor: pointer;
        box-shadow: 3px 3px 0 var(--shadow-color);
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        user-select: none;
    }

    .btn:hover:not(:disabled) {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 var(--shadow-color);
        background: var(--button-hover-bg, #faf8f5);
    }

    .btn:active:not(:disabled) {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0 var(--shadow-color);
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: 1px 1px 0 var(--shadow-color);
        transform: translate(1px, 1px);
    }

    /* Upload Screen */
    .upload-zone {
        padding: 48px;
        text-align: center;
        background: var(--card-bg, #ffffff);
    }

    .dashed-border {
        border: 3px dashed var(--border-color);
        padding: 40px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }

    .upload-icon-wrapper {
        background: var(--badge-bg);
        border: 2.5px solid var(--border-color);
        padding: 16px;
        border-radius: 50%;
        display: inline-flex;
        box-shadow: 3px 3px 0 var(--shadow-color);
        color: var(--badge-text, #ffffff);
        margin-bottom: 8px;
    }

    .dashed-border h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 900;
        letter-spacing: -0.5px;
        color: var(--text-color);
    }

    .dashed-border p {
        margin: 0;
        font-size: 13px;
        color: var(--text-color);
        opacity: 0.8;
        max-width: 320px;
        line-height: 1.5;
        font-weight: bold;
    }

    .upload-btn {
        margin-top: 8px;
        background: var(--badge-bg);
        color: var(--badge-text, #ffffff);
        border-color: var(--border-color);
    }

    .upload-btn:hover {
        background: var(--badge-bg);
        opacity: 0.9;
    }

    /* Card variant styles */
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
        user-select: none;
        box-sizing: border-box;
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

    .card-importer {
        background-color: rgb(0 0 0 / 0);
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

        .upload-zone {
            padding: 24px 16px;
        }

        .dashed-border {
            padding: 24px 12px;
            gap: 12px;
        }

        .dashed-border h3 {
            font-size: 18px;
        }

        .dashed-border p {
            font-size: 12px;
        }

        .upload-icon-wrapper {
            padding: 12px;
            margin-bottom: 4px;
        }

        .upload-icon-wrapper :global(svg) {
            width: 36px;
            height: 36px;
        }
    }

    /* Drag and drop active states */
    .card.drag-active {
        background-color: var(--card-hover-bg);
        border-color: var(--badge-bg);
        transform: translate(-6px, -6px);
        box-shadow: 8px 8px 0 var(--shadow-color);
    }

    .reader-card.drag-active {
        border-color: var(--badge-bg);
        background-color: var(--card-hover-bg);
        transform: translate(-4px, -4px);
        box-shadow: 12px 12px 0 var(--shadow-color);
    }

    .reader-card.drag-active .dashed-border {
        border-color: var(--badge-bg);
        background: rgba(255, 77, 77, 0.04);
    }

    :global(html.dark) .reader-card.drag-active .dashed-border {
        background: rgba(184, 82, 68, 0.04);
    }

    @keyframes float {
        0% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-8px);
        }
        100% {
            transform: translateY(0px);
        }
    }

    .reader-card.drag-active .upload-icon-wrapper,
    .card.drag-active .card-icon {
        animation: float 1.2s ease-in-out infinite;
        border-color: var(--badge-bg);
        background: var(--badge-bg);
        color: var(--badge-text);
    }
</style>
