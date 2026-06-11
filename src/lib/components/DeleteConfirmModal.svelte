<script lang="ts">
    import { getContext } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Modal from "./ui/Modal.svelte"
    import Button from "./ui/Button.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { useCommands, type CommandNode } from "$lib/stores/commandsStore.svelte"

    async function handleConfirm() {
        const ids = [...uiStore.nodesToDeleteIds]

        // Close modal first for better UX
        uiStore.isDeleteModalOpen = false

        for (const id of ids) {
            await vfsStore.deleteNode(id)
        }

        // Reset state
        uiStore.nodesToDeleteIds = []
        if (uiStore.isSelectionMode && vfsStore.selectedIds.size === 0) {
            uiStore.isSelectionMode = false
        }
    }

    function handleCancel() {
        uiStore.isDeleteModalOpen = false
        uiStore.nodesToDeleteIds = []
    }

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useCommands(
        [
            {
                keys: "enter",
                action: (event) => {
                    event.preventDefault()
                    handleConfirm()
                },
                description: m.delete(),
            },
            {
                keys: ["escape", "ctrl+c", "ctrl+["],
                action: (event) => {
                    event.preventDefault()
                    handleCancel()
                },
                description: m.cancel(),
                allowInInputs: true,
            },
            {
                id: "close-alt",
                keys: "q",
                action: (event) => {
                    event.preventDefault()
                    handleCancel()
                },
                description: m.cancel(),
                allowInInputs: false,
            },
        ],
        activeNodeBeforeOpen,
    )
</script>

<Modal autofocusClose={false} onClose={handleCancel} title={m.delete_confirmation_title()}>
    <div class="modal-content">
        <p class="confirmation-message">
            {#if uiStore.nodesToDeleteIds.length > 1}
                {m.delete_confirmation_multiple({ count: uiStore.nodesToDeleteIds.length })}
            {:else}
                {m.delete_confirmation_single()}
            {/if}
        </p>

        <div class="modal-actions">
            <Button variant="brutalist" class="modal-delete-btn" onclick={handleConfirm}>
                {m.delete()}
            </Button>
            <Button variant="ghost" onclick={handleCancel}>
                {m.cancel()}
            </Button>
        </div>
    </div>
</Modal>

<style>
    .modal-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 100%;
        margin-top: 10px;
        box-sizing: border-box;
        padding: 0 24px 24px 24px;
    }

    .confirmation-message {
        font-size: 16px;
        line-height: 1.5;
        color: var(--text-color);
        margin: 0;
    }

    .modal-actions {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
    }

    :global(.modal-delete-btn) {
        background-color: #d63031 !important;
        color: white !important;
        border-color: var(--border-color) !important;
    }

    :global(html.dark .modal-delete-btn) {
        background-color: #ef4444 !important;
        color: white !important;
    }

    :global(.modal-delete-btn:hover) {
        background-color: #ff4d4d !important;
        color: white !important;
    }

    :global(html.dark .modal-delete-btn:hover) {
        background-color: #f87171 !important;
        color: white !important;
    }
</style>
