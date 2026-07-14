<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/core/components/ui/Modal.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import { commandsStore, getShortcutHint } from "$lib/features/commands/commandsStore.svelte"
    import { defineCommands } from "$lib/features/commands/commands.types"
    import { useModalCommands } from "$lib/features/commands/useModalCommands.svelte"

    let {
        title = m.delete_confirmation_title(),
        message,
        onConfirm,
        onCancel,
    } = $props<{
        title?: string
        message: string
        onConfirm: () => void | Promise<void>
        onCancel: () => void
    }>()

    async function handleConfirm() {
        await onConfirm()
    }

    function handleCancel() {
        onCancel()
    }

    const activeNodeBeforeOpen = commandsStore.activeScope

    const modalCommands = defineCommands({
        "modal.confirm": {
            id: "modal.confirm",
            keymap: "enter",
            label: () => m.delete(),
            category: "commands",
            run: handleConfirm,
        },
        "modal.cancel": {
            id: "modal.cancel",
            keymap: ["escape", "ctrl+c", "ctrl+[", "q"],
            label: () => m.cancel(),
            category: "commands",
            allowInInputs: true,
            run: handleCancel,
        },
    })

    const commandsNode = useModalCommands(Object.values(modalCommands), activeNodeBeforeOpen)
</script>

<Modal autofocusClose={false} onClose={handleCancel} {title}>
    <div class="modal-content">
        <p class="confirmation-message">
            {message}
        </p>

        <div class="modal-actions">
            <Button
                variant="brutalist"
                class="modal-delete-btn"
                onclick={() => void commandsNode.execute("modal.confirm")}
                tooltip={`${m.delete()}${getShortcutHint(commandsNode, "modal.confirm")}`}
            >
                {m.delete()}
            </Button>
            <Button
                variant="ghost"
                onclick={() => void commandsNode.execute("modal.cancel")}
                tooltip={`${m.cancel()}${getShortcutHint(commandsNode, "modal.cancel")}`}
                tooltipAlign="right"
            >
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
        font-size: var(--font-size-xl);
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
