<script lang="ts">
    import { onMount, getContext, tick } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/core/components/ui/Modal.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { useCommands, type CommandNode } from "$lib/features/prompt/stores/commandsStore.svelte"

    interface Props {
        onCreate?: (name: string) => void
    }

    const { onCreate }: Props = $props()

    let folderName = $state("")
    let errors = $state<string[]>([])

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useCommands(
        [
            {
                id: "close",
                keys: ["escape", "ctrl+c", "ctrl+["],
                action: (event) => {
                    event.preventDefault()
                    handleClose()
                },
                description: m.cancel(),
                allowInInputs: true,
            },
            {
                id: "close-alt",
                keys: "q",
                action: (event) => {
                    event.preventDefault()
                    handleClose()
                },
                description: m.cancel(),
                allowInInputs: false,
            },
        ],
        activeNodeBeforeOpen,
    )

    onMount(async () => {
        folderName = ""
        errors = []

        // Focus the input when modal opens
        await tick()
        const input = document.getElementById("folder-name-input") as HTMLInputElement | null
        if (input) {
            input.focus()
            input.select()
        }
    })

    function validateInput() {
        if (folderName.length <= 0) {
            errors.push(m.folder_name_required())
        }

        if (errors.length > 0) {
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

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }

        errors = []
        uiStore.isNewFolderModalOpen = false

        if (onCreate) {
            onCreate(folderName)
        }
    }
    function handleClose() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        uiStore.isNewFolderModalOpen = false
    }
</script>

<Modal onClose={handleClose} title={m.new_folder()} autofocusClose={false}>
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
            <Button variant="ghost" onclick={handleClose}>{m.cancel()}</Button>
        </div>
    </div>
</Modal>

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
