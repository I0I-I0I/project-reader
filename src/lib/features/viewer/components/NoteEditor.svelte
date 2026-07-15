<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/core/components/ui/Button.svelte"
    import Modal from "$lib/core/components/ui/modal/Modal.svelte"
    import { commandsStore, getShortcutHint } from "$lib/features/commands/commandsStore.svelte"
    import { defineCommands } from "$lib/features/commands/commands.types"
    import { useModalCommands } from "$lib/features/commands/useModalCommands.svelte"

    let {
        editorState = $bindable(),
        onCancel,
    }: {
        editorState: any
        onCancel: () => void
    } = $props()

    const activeNodeBeforeOpen = commandsStore.activeScope ?? commandsStore.root

    const modalCommands = defineCommands({
        "modal.cancel": {
            id: "modal.cancel",
            label: () => m.cancel(),
            category: "commands",
            keymap: "escape",
            allowInInputs: true,
            run: () => onCancel(),
        },
        "viewer.note.save": {
            id: "viewer.note.save",
            label: () => m.save(),
            category: "commands",
            keymap: "ctrl+enter",
            allowInInputs: true,
            run: async (payload) => {
                await activeNodeBeforeOpen.execute("viewer.note.save", payload)
            },
        },
    })
    const editorCommandsNode = useModalCommands(
        [modalCommands["modal.cancel"], modalCommands["viewer.note.save"]],
        activeNodeBeforeOpen,
    )
    function focusEditor(textarea: HTMLTextAreaElement) {
        const frame = requestAnimationFrame(() => textarea.focus())
        return () => cancelAnimationFrame(frame)
    }
</script>

{#snippet header()}
    <div class="editor-header">
        <h3 class="modal-title">{"id" in editorState ? m.edit_note() : m.add_note()}</h3>
        <div class="header-actions">
            <span class="editor-page">{m.page()} {editorState.pageNumber}</span>
            <button
                class="close-btn"
                onclick={() => void editorCommandsNode.execute("modal.cancel")}
                aria-label={m.cancel()}
            >
                &times;
            </button>
        </div>
    </div>
{/snippet}

<Modal
    variant="default"
    type="float"
    size="medium"
    placement="center"
    title={"id" in editorState ? m.edit_note() : m.add_note()}
    onClose={() => void editorCommandsNode.execute("modal.cancel")}
    {header}
    showCloseButton={false}
    initialFocus="first"
    draggable
>
    <div class="editor-body">
        <blockquote class="editor-quote">
            "{editorState.text}"
        </blockquote>

        <textarea
            {@attach focusEditor}
            class="editor-textarea"
            placeholder="Write your note here..."
            bind:value={editorState.noteContent}
        ></textarea>

        <div class="color-picker">
            {#each ["yellow", "green", "blue", "pink", "purple"] as color (color)}
                {@const swatchTooltip =
                    color === "yellow"
                        ? m.select_color_yellow()
                        : color === "green"
                          ? m.select_color_green()
                          : color === "blue"
                            ? m.select_color_blue()
                            : color === "pink"
                              ? m.select_color_pink()
                              : m.select_color_purple()}
                <Button
                    variant="none"
                    class={`color-swatch swatch-${color} ${editorState.color === color ? "selected" : ""}`}
                    onclick={() => (editorState.color = color as any)}
                    aria-label={swatchTooltip}
                    tooltip={swatchTooltip}
                />
            {/each}
        </div>
    </div>

    {#snippet footer()}
        <div class="editor-actions">
            <Button
                variant="none"
                class="editor-btn cancel"
                onclick={() => void editorCommandsNode.execute("modal.cancel")}
                aria-label={m.cancel()}
                tooltip={`${m.cancel()}${getShortcutHint(editorCommandsNode, "modal.cancel")}`}
            >
                {m.cancel()}
            </Button>
            <Button
                variant="none"
                class="editor-btn save"
                onclick={() => void editorCommandsNode.execute("viewer.note.save")}
                aria-label={m.save()}
                tooltip={`${m.save()}${getShortcutHint(editorCommandsNode, "viewer.note.save")}`}
            >
                {m.save()}
            </Button>
        </div>
    {/snippet}
</Modal>

<style>
    @media (--mobile) {
        .editor-textarea {
            font-size: var(--font-size-xl) !important;
            height: 200px !important;
        }
    }

    :global(.modal-title) {
        font-family: Georgia, "Times New Roman", Times, serif !important;
        font-weight: 900 !important;
        font-size: var(--font-size-4xl) !important;
    }

    .editor-body {
        overflow-y: hidden !important;
        padding: 16px 24px;
        background: var(--bg-color);
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    @media (--mobile) {
        .editor-body {
            padding: 12px 16px;
        }
    }

    .editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-color);
        position: relative;
        z-index: var(--z-10);
    }

    @media (--mobile) {
        .editor-header {
            padding: 12px 16px;
        }
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: var(--font-size-5xl);
        font-weight: bold;
        color: var(--text-color);
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        transition: transform 0.1s ease;
    }

    @media (hover: hover) {
        .close-btn:hover {
            transform: scale(1.15);
        }
    }

    .close-btn:active {
        transform: scale(0.95);
    }

    .editor-page {
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        padding: 4px 8px;
        font-size: var(--font-size-xs);
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .editor-quote {
        margin: 0;
        margin-bottom: 8px;
        font-style: italic;
        font-size: var(--font-size-md);
        color: var(--text-color);
        background: rgba(0, 0, 0, 0.03);
        padding: 12px 16px;
        border-left: 4px solid var(--border-color);
        max-height: 100px;
        word-break: break-word;
        line-height: 1.4;
    }

    @media (--mobile) {
        .editor-quote {
            padding: 8px 12px;
            margin-bottom: 4px;
        }
    }

    .editor-textarea {
        width: 100%;
        height: 160px;
        font-family: inherit;
        font-size: var(--font-size-xl);
        font-weight: 600;
        padding: 16px;
        border: 2px solid var(--border-color);
        background: var(--surface-color);
        color: var(--text-color);
        resize: none;
        outline: none;
        box-sizing: border-box;
        margin-bottom: 8px;
        transition: all 0.1s ease;
    }

    @media (--mobile) {
        .editor-textarea {
            padding: 12px;
            margin-bottom: 4px;
        }
    }

    .editor-textarea:focus {
        border-color: var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
    }

    .color-picker {
        display: flex;
        gap: 8px;
        justify-content: center;
        padding: 12px 0;
    }

    @media (--mobile) {
        .color-picker {
            padding: 8px 0;
            gap: 6px;
        }
    }

    :global(.color-swatch) {
        width: 28px !important;
        height: 28px !important;
        border-radius: var(--radius-full) !important;
        border: 2px solid var(--border-color) !important;
        cursor: pointer !important;
        transition: transform 0.1s ease !important;
        padding: 0 !important;
        min-height: unset !important;
        position: relative !important;
    }

    :global(.color-swatch:hover) {
        transform: scale(1.1) !important;
    }

    :global(.color-swatch.selected) {
        transform: scale(1.15) !important;
        box-shadow:
            0 0 0 2px var(--surface-color),
            0 0 0 5px var(--border-color) !important;
    }

    :global(.swatch-yellow) {
        background: #ffde4d !important;
    }
    :global(.swatch-green) {
        background: #2ecc71 !important;
    }
    :global(.swatch-blue) {
        background: #3498db !important;
    }
    :global(.swatch-pink) {
        background: #ff7675 !important;
    }
    :global(.swatch-purple) {
        background: #a78bfa !important;
    }

    .editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    @media (--mobile) {
        .editor-actions {
            gap: 8px;
        }
    }

    :global(.editor-btn) {
        padding: 8px 20px !important;
        font-family: inherit !important;
        font-size: var(--font-size-lg) !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        cursor: pointer !important;
        border: 2px solid var(--border-color) !important;
        background: var(--surface-color) !important;
        color: var(--text-color) !important;
        box-shadow: 3px 3px 0 var(--shadow-color) !important;
        transition: all 0.1s ease !important;
        min-height: unset !important;
    }

    :global(.editor-btn:hover) {
        transform: translate(-1px, -1px) !important;
        box-shadow: 4px 4px 0 var(--shadow-color) !important;
        background: var(--accent-color) !important;
    }

    :global(.editor-btn:active) {
        transform: translate(1px, 1px) !important;
        box-shadow: 1px 1px 0 var(--shadow-color) !important;
    }

    :global(.editor-btn.cancel:hover) {
        background: var(--danger-color) !important;
        color: white !important;
    }
</style>
