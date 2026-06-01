<script lang="ts">
    import { flushSync } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Modal from "./ui/Modal.svelte"
    import Button from "./ui/Button.svelte"
    import Input from "./ui/Input.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"

    interface Props {
        onCreate?: (name: string) => void
    }

    const { onCreate }: Props = $props()

    let folderName = $state("")
    let errors = $state<string[]>([])

    $effect(() => {
        if (uiStore.isNewFolderModalOpen) {
            folderName = ""
            errors = []
            
            // Focus the input when modal opens
            setTimeout(() => {
                const input = document.getElementById("folder-name-input") as HTMLInputElement | null
                if (input) {
                    input.focus()
                    input.select()
                }
            }, 0)
        }
    })

    function validateInput() {
        if (folderName.length <= 0) {
            errors = [m.folder_name_required()]
            return false
        }

        errors = []
        return true
    }

    function handleCreate() {
        if (folderName.length <= 0) {
            errors = [m.folder_name_required()]
            return
        }

        errors = []
        uiStore.isNewFolderModalOpen = false

        if (onCreate) {
            onCreate(folderName)
        }
    }
</script>

{#if uiStore.isNewFolderModalOpen}
    <Modal
        onClose={() => (uiStore.isNewFolderModalOpen = false)}
        title={m.new_folder()}
        autofocusClose={false}
    >
        <div class="modal-form">
            <Input
                id="folder-name-input"
                placeholder={m.folder_name_placeholder()}
                label={m.folder_name()}
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
                <Button variant="brutalist" onclick={handleCreate}>{m.create()}</Button>
                <Button variant="ghost" onclick={() => (uiStore.isNewFolderModalOpen = false)}>{m.cancel()}</Button>
            </div>
        </div>
    </Modal>
{/if}

<style>
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
