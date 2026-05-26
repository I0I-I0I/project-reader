<script lang="ts">
    import PlusIcon from "$lib/components/icons/PlusIcon.svelte"
    import * as m from "$lib/paraglide/messages"
    import { viewerStore } from "$lib/viewerStore.svelte"
    import { goto } from "$app/navigation"

    interface Props {
        onimport?: (book: { url: string; name: string }) => void
        variant?: "full" | "card"
    }

    let { onimport, variant = "full" }: Props = $props()

    let fileInput = $state<HTMLInputElement | null>(null)

    function handleFileChange(event: Event) {
        const target = event.target as HTMLInputElement
        const fileList = target.files
        if (fileList && fileList.length > 0) {
            const file = fileList[0]
            const name = file.name
            const url = URL.createObjectURL(file)
            viewerStore.setCurrentBook({ url, name })
            viewerStore.addBook({ url, name })
            if (onimport) {
                onimport({ url, name })
            }
            goto("/viewer")
        }
    }
</script>

{#if variant === "card"}
    <button type="button" class="card card-importer" onclick={() => fileInput?.click()}>
        <div class="card-icon" aria-hidden="true">
            <PlusIcon />
        </div>
        <p class="card-title">{m.import_pdf()}</p>
    </button>
    <input
        bind:this={fileInput}
        type="file"
        accept=".pdf"
        onchange={handleFileChange}
        style="display: none;"
    />
{:else}
    <div class="reader-card">
        <div class="upload-zone">
            <div class="dashed-border">
                <div class="upload-icon-wrapper" aria-hidden="true">
                    <PlusIcon width="48" height="48" />
                </div>
                <h3>{m.import_pdf()}</h3>
                <p>{m.upload_p_text()}</p>
                <label class="btn upload-btn">
                    {m.choose_pdf()}
                    <input
                        type="file"
                        accept=".pdf"
                        onchange={handleFileChange}
                        style="display: none;"
                    />
                </label>
            </div>
        </div>
    </div>
{/if}

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
</style>
