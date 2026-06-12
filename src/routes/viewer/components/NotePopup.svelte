<script lang="ts">
    import { getContext } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import {
        useCommands,
        type CommandNode,
        getShortcutHint,
    } from "$lib/stores/commandsStore.svelte"
    import type { UserNote } from "$lib/stores/vfsStore.types"

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

<div
    class="note-popup"
    style="position: fixed; left: clamp(200px, {activePopup.x}px, calc(100vw - 200px)); top: {activePopup.y -
        12}px; transform: translate(-50%, -100%); z-index: 1000;"
>
    <div class="popup-card">
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
</div>

<style>
    .note-popup {
        transition:
            top 0.2s ease,
            left 0.2s ease;
    }

    @media (--mobile) {
        .note-popup {
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: calc(100vw - 32px) !important;
            max-width: 380px;
        }

        .popup-card {
            width: 100% !important;
        }
    }

    .popup-card {
        box-sizing: border-box;
        width: 380px;
        max-height: calc(100vh - 40px);
        background: color-mix(in srgb, var(--surface-color) 92%, transparent);
        backdrop-filter: blur(12px);
        border: 3px solid var(--border-color);
        box-shadow: 6px 6px 0 var(--shadow-color);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: inherit;
    }

    .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .popup-page {
        font-size: 9px;
        font-weight: 900;
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        border: 1px solid var(--border-color);
        padding: 2px 6px;
        border-radius: 2px;
    }

    :global(.popup-close) {
        background: none !important;
        border: none !important;
        font-size: 16px !important;
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
        font-size: 11px;
        color: var(--text-color);
        background: rgba(0, 0, 0, 0.04);
        padding: 6px;
        border-left: 3px solid var(--border-color);
        max-height: 120px;
        word-break: break-word;
    }

    .popup-content {
        font-size: 13px;
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
        font-size: 10px !important;
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
