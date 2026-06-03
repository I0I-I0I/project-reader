<script lang="ts">
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import * as m from "$lib/paraglide/messages"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { useCommands } from "$lib/stores/commandsStore.svelte"

    interface Props {
        onimport?: (book: { url: string; name: string }) => void
        variant?: "full" | "card"
        class?: string
    }

    let { onimport, variant = "full", class: className }: Props = $props()

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
            try {
                const id = await vfsStore.createFile(name, vfsStore.currentFolderId, file)
                if (onimport) {
                    const url = await vfsStore.getFileUrl(id)
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
                    try {
                        const id = await vfsStore.createFile(
                            handle.name,
                            vfsStore.currentFolderId,
                            handle,
                        )
                        if (onimport) {
                            const url = await vfsStore.getFileUrl(id)
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

    useCommands([
        {
            keys: "a",
            action: (e) => {
                e.preventDefault()
                handleImportClick(null as any)
            },
            description: m.keymap_import_book(),
        },
    ])
</script>

{#if variant === "card"}
    <button
        type="button"
        class={`card card-importer ${className}`}
        class:drag-active={isDragging}
        onclick={handleImportClick}
        ondragenter={handleDragEnter}
        ondragleave={handleDragLeave}
        ondragover={handleDragOver}
        ondrop={handleDrop}
    >
        <div class="card-cover-container">
            <div class="card-icon" aria-hidden="true">
                <PlusIcon />
            </div>
        </div>
        <div class="card-metadata">
            <p class="card-title">{m.import_pdf()}</p>
            <p class="card-author">&nbsp;</p>
        </div>
    </button>
{:else}
    <div
        class="reader-card"
        class:drag-active={isDragging}
        role="region"
        aria-label={m.pdf_drop_zone()}
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
        background: var(--surface-color, #ffffff);
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
        background: var(--surface-color, #ffffff);
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

    @media (hover: hover) {
        .btn:hover:not(:disabled) {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--shadow-color);
            background: var(--surface-hover-color, #faf8f5);
        }
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
        background: var(--surface-color, #ffffff);
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
        background: var(--danger-active-color);
        border: 2.5px solid var(--border-color);
        padding: 16px;
        border-radius: 50%;
        display: inline-flex;
        box-shadow: 3px 3px 0 var(--shadow-color);
        color: var(--danger-text-color, #ffffff);
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
        background: var(--danger-active-color);
        color: var(--danger-text-color, #ffffff);
        border-color: var(--border-color);
    }

    @media (hover: hover) {
        .upload-btn:hover {
            background: var(--danger-active-color);
            opacity: 0.9;
        }
    }

    /* Card variant styles */
    .card {
        background: var(--surface-color);
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: inherit;
        user-select: none;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
    }

    @media (hover: hover) {
        .card:hover {
            transform: translate(-4px, -4px);
            box-shadow: 8px 8px 0 var(--shadow-color);
            background-color: var(--surface-hover-color);
        }
    }

    .card:active {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 var(--shadow-color);
    }

    .card-cover-container {
        position: relative;
        width: 100%;
        aspect-ratio: 2/3;
        background: var(--bg-color);
        border-bottom: 2px solid var(--border-color);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
    }

    .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-color);
    }

    .card-icon :global(svg) {
        width: 48px;
        height: 48px;
        stroke-width: 2;
    }

    .card-metadata {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        box-sizing: border-box;
        text-align: left;
    }

    .card-title {
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        width: 100%;
        word-wrap: break-word;
        color: var(--text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.3;
    }

    .card-author {
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        width: 100%;
        word-wrap: break-word;
        color: var(--text-color);
        opacity: 0.7;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.2;
    }

    .card-importer {
        background-color: rgb(0 0 0 / 0);
    }

    @media (--mobile-width) {
        .card-metadata {
            padding: 8px;
            gap: 2px;
        }

        .card-title {
            font-size: 11px;
        }

        .card-author {
            font-size: 9.5px;
        }

        .card-icon :global(svg) {
            width: 36px;
            height: 36px;
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
        background-color: var(--surface-hover-color);
        border-color: var(--danger-active-color);
        transform: translate(-6px, -6px);
        box-shadow: 8px 8px 0 var(--shadow-color);
    }

    .reader-card.drag-active {
        border-color: var(--danger-active-color);
        background-color: var(--surface-hover-color);
        transform: translate(-4px, -4px);
        box-shadow: 12px 12px 0 var(--shadow-color);
    }

    .reader-card.drag-active .dashed-border {
        border-color: var(--danger-active-color);
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
        border-color: var(--danger-active-color);
        background: var(--danger-active-color);
        color: var(--danger-text-color);
    }
</style>
