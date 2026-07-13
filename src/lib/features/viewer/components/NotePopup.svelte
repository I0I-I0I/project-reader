<script lang="ts">
    import { getContext, onMount } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/core/components/ui/Button.svelte"
    import Float from "$lib/core/components/ui/Float.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import {
        useCommands,
        type CommandNode,
        getShortcutHint,
    } from "$lib/features/prompt/stores/commandsStore.svelte"
    import type { UserNote } from "$lib/core/vfs/vfsStore.types"

    let {
        activePopup,
        onClose,
        onEdit,
        onDelete,
    }: {
        activePopup: { x: number; y: number; note: UserNote }
        onClose: () => void
        onEdit: () => void
        onDelete: () => void
    } = $props()

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    onMount(() => uiStore.registerModal(() => true))

    const popupCommandsNode = useCommands(
        [
            {
                id: "close-note-popup",
                keys: ["escape", "q"],
                action: (event) => {
                    event.preventDefault()
                    onClose()
                },
                description: m.close(),
                allowInInputs: true,
            },
            {
                id: "edit-note",
                keys: ["e"],
                action: (event) => {
                    event.preventDefault()
                    onEdit()
                },
                description: m.edit_note(),
                allowInInputs: false,
            },
            {
                id: "delete-note",
                keys: ["d"],
                action: (event) => {
                    event.preventDefault()
                    onDelete()
                },
                description: m.delete(),
                allowInInputs: false,
            },
        ],
        activeNodeBeforeOpen,
    )
</script>

<Float {onClose}>
    <div class="note-popup-content">
        <div class="popup-header">
            <span class="popup-page">{m.page()} {activePopup.note.pageNumber}</span>
            <Button
                variant="none"
                class="popup-close"
                onclick={onClose}
                aria-label={m.close()}
                tooltip={`${m.close()}${getShortcutHint(popupCommandsNode, "close-note-popup")}`}
            >
                ×
            </Button>
        </div>

        <blockquote class="popup-quote">
            "{activePopup.note.text}"
        </blockquote>

        {#if activePopup.note.noteContent}
            <div class="popup-content">
                {activePopup.note.noteContent}
            </div>
        {/if}

        <div class="popup-footer">
            <Button
                variant="none"
                class="popup-btn edit"
                onclick={onEdit}
                aria-label={m.edit_note()}
                tooltip={`${m.edit_note()}${getShortcutHint(popupCommandsNode, "edit-note")}`}
            >
                {m.edit_note()}
            </Button>
            <Button
                variant="none"
                class="popup-btn delete"
                onclick={onDelete}
                aria-label={m.delete()}
                tooltip={`${m.delete()}${getShortcutHint(popupCommandsNode, "delete-note")}`}
            >
                {m.delete()}
            </Button>
        </div>
    </div>
</Float>

<style>
    :global(.float-card:has(.note-popup-content)) {
        max-width: 380px !important;
        background: color-mix(in srgb, var(--surface-color) 92%, transparent) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
    }

    .note-popup-content {
        box-sizing: border-box;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: inherit;
        width: 100%;
        max-height: calc(100vh - 40px);
    }

    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .popup-page {
        font-size: var(--font-size-base);
        font-weight: 900;
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        border: 1px solid var(--border-color);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
    }

    :global(.popup-close) {
        background: none !important;
        border: none !important;
        font-size: var(--font-size-2xl) !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        color: var(--text-color) !important;
        padding: 0 4px !important;
        opacity: 0.7 !important;
        box-shadow: none !important;
        min-height: unset !important;
    }

    :global(.popup-close:hover) {
        opacity: 1 !important;
        background: none !important;
    }

    .popup-quote {
        margin: 0;
        font-style: italic;
        font-size: var(--font-size-lg);
        overflow-y: auto;
        color: var(--text-color);
        background: rgba(0, 0, 0, 0.04);
        padding: 6px;
        border-left: 3px solid var(--border-color);
        max-height: 240px;
        word-break: break-word;
    }

    .popup-content {
        font-size: var(--font-size-xl);
        font-weight: 700;
        color: var(--text-color);
        line-height: 1.4;
        word-break: break-word;
        max-height: 180px;
    }

    .popup-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
    }

    :global(.popup-btn) {
        padding: 4px 8px !important;
        font-family: inherit !important;
        font-size: var(--font-size-xs) !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        cursor: pointer !important;
        border: 2px solid var(--border-color) !important;
        background: var(--surface-color) !important;
        color: var(--text-color) !important;
        box-shadow: 2px 2px 0 var(--shadow-color) !important;
        transition: all 0.1s ease !important;
        min-height: unset !important;
    }

    :global(.popup-btn:hover) {
        transform: translate(-1px, -1px) !important;
        box-shadow: 3px 3px 0 var(--shadow-color) !important;
        background: var(--accent-color) !important;
    }

    :global(.popup-btn.delete:hover) {
        color: #e53935 !important;
        background: rgba(229, 57, 53, 0.1) !important;
    }
</style>
