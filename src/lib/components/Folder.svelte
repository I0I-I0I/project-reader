<script lang="ts">
    import { flushSync } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import FolderIcon from "./icons/FolderIcon.svelte"
    import Modal from "./ui/Modal.svelte"
    import Button from "./ui/Button.svelte"
    import Input from "./ui/Input.svelte"
    import NewFolderIcon from "./icons/NewFolderIcon.svelte"

    interface Props {
        type?: "new-folder" | "folder"
        onCreate?: (name: string) => void
    }

    const { type = "folder", onCreate }: Props = $props()

    let isCreatingFolder = $state(false)
    let folderName = $state("")
    let errors = $state<string[]>([])

    function onCreateFolder() {
        flushSync(() => {
            isCreatingFolder = true
            folderName = ""
        })

        const input = document.getElementById("folder-name-input") as HTMLInputElement | null
        if (input) {
            input.focus()
            input.select()
        }
    }

    function validateInput() {
        if (folderName.length <= 0) {
            errors = ["Folder name is required"]
            return false
        }

        errors = []
        return true
    }

    function handleCreate() {
        if (folderName.length <= 0) {
            errors = ["Folder name is required"]
            return
        }

        errors = []
        isCreatingFolder = false

        if (onCreate) {
            onCreate(folderName)
        }
    }
</script>

<button
    type="button"
    class="card"
    class:card-action={type === "new-folder"}
    onclick={type === "new-folder" ? onCreateFolder : undefined}
>
    <div class="card-cover-container">
        <div class="card-icon" aria-hidden="true">
            {#if type === "new-folder"}
                <NewFolderIcon />
            {:else}
                <FolderIcon />
            {/if}
        </div>
    </div>
    <div class="card-metadata">
        <p class="card-title">
            {type === "new-folder" ? (m.new_folder ? m.new_folder() : "New Folder") : "Folder"}
        </p>
        {#if type === "new-folder"}
            <p class="card-author">&nbsp;</p>
        {/if}
    </div>
</button>

{#if isCreatingFolder}
    <Modal
        onClose={() => (isCreatingFolder = false)}
        title={m.new_folder ? m.new_folder() : "New Folder"}
        autofocusClose={false}
    >
        <div class="modal-form">
            <Input
                id="folder-name-input"
                placeholder="e.g. My Favorite Books"
                label="Folder Name"
                bind:value={folderName}
                onfocusout={validateInput}
                onkeydown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        handleCreate()
                    }
                }}
                {errors}
            />
            <div class="modal-actions">
                <Button variant="brutalist" onclick={handleCreate}>Create</Button>
                <Button variant="ghost" onclick={() => (isCreatingFolder = false)}>Cancel</Button>
            </div>
        </div>
    </Modal>
{/if}

<style>
    .card {
        background: var(--surface-color);
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: inherit;
        width: 100%;
        height: 100%;
        user-select: none;
    }

    .card-action {
        background-color: transparent;
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
        line-clamp: 2;
        -webkit-line-clamp: 2;
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
        line-clamp: 1;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.2;
    }

    @media (max-width: 800px) {
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
    }

    .modal-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        margin-top: 10px;
        box-sizing: border-box;
        padding: 0 24px 24px 24px;
    }

    .modal-actions {
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 8px;
    }
</style>
