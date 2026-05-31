<script lang="ts">
    import FolderIcon from "./icons/FolderIcon.svelte"
    import NewFolderIcon from "./icons/NewFolderIcon.svelte"
    import Modal from "./ui/Modal.svelte"
    import Button from "./ui/Button.svelte"
    import Input from "./ui/Input.svelte"

    interface Props {
        type?: "new-folder" | "folder"
    }

    const { type = "folder" }: Props = $props()

    let isCreatingFolder = $state(false)
    let folderName = $state("")
    let errors = $state<string[]>([])

    function onCreateFolder() {
        isCreatingFolder = true
        folderName = ""
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
            // errors = [m.folder_name_required()]
            errors = ["Folder name is required"]
            return
        }

        errors = []
        isCreatingFolder = false
    }
</script>

<div class="card">
    <Button
        variant="none"
        size="none"
        onclick={type === "new-folder" ? onCreateFolder : undefined}
        type="button"
        class="card-main-button"
    >
        <div class="card-cover-container"></div>
        <div class="card-icon" aria-hidden="true">
            {#if type === "new-folder"}
                <NewFolderIcon />
            {:else}
                <FolderIcon />
            {/if}
        </div>
        <div class="card-metadata">
            <p class="card-title">Create a new folder</p>
        </div>
    </Button>
</div>

{#if isCreatingFolder}
    <Modal onClose={() => (isCreatingFolder = false)} title="Create a new folder">
        <div class="modal-form">
            <Input
                placeholder="e.g. My Favorite Books"
                label="Folder Name"
                bind:value={folderName}
                onfocusout={validateInput}
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
        background: var(--card-bg);
        position: relative;
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
    }

    @media (hover: hover) {
        .card:hover {
            transform: translate(-4px, -4px);
            box-shadow: 8px 8px 0 var(--shadow-color);
            background-color: var(--card-hover-bg);
        }
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
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        color: inherit;
        box-sizing: border-box;
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

    @media (max-width: 800px) {
        .card-metadata {
            padding: 8px;
            gap: 2px;
        }

        .card-title {
            font-size: 11px;
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
    }

    .modal-actions {
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 8px;
    }

    .modal-errors {
        color: var(--text-color);
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        margin: 0;
        padding: 4px;
        background-color: var(--error-bg);
        border-radius: 4px;
    }
</style>
