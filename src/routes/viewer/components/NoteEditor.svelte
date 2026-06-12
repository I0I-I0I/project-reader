<script lang="ts">
    import { getContext } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Button from "$lib/components/ui/Button.svelte"
    import {
        useCommands,
        type CommandNode,
        getShortcutHint,
    } from "$lib/stores/commandsStore.svelte"

    let {
        editorState = $bindable(),
        editorCoords,
        onCancel,
        onSave,
    }: {
        editorState: any
        editorCoords: { x: number; y: number } | null
        onCancel: () => void
        onSave: () => void
    } = $props()

    const getActiveNode = getContext<() => CommandNode>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    const editorCommandsNode = useCommands(
        [
            {
                id: "cancel-note-edit",
                keys: ["escape"],
                action: (event) => {
                    event.preventDefault()
                    onCancel()
                },
                description: m.cancel(),
                allowInInputs: true,
            },
            {
                id: "save-note-edit",
                keys: ["ctrl+enter"],
                action: (event) => {
                    event.preventDefault()
                    onSave()
                },
                description: m.save(),
                allowInInputs: true,
            },
        ],
        activeNodeBeforeOpen,
    )
    let textareaRef = $state<HTMLTextAreaElement | undefined>()

    $effect(() => {
        if (textareaRef) {
            textareaRef.focus()
            textareaRef.select()
        }
    })
</script>

<div
    class="note-editor"
    style="position: fixed; left: {editorCoords?.x ?? 200}px; top: {(editorCoords?.y ?? 200) -
        12}px; transform: translate(-50%, -100%); z-index: 1000;"
>
    <div class="editor-card">
        <div class="editor-header">
            <h3>{"id" in editorState ? m.edit_note() : m.add_note()}</h3>
            <span class="editor-page">{m.page()} {editorState.pageNumber}</span>
        </div>

        <blockquote class="editor-quote">
            "{editorState.text}"
        </blockquote>

        <textarea
            bind:this={textareaRef}
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

        <div class="editor-actions">
            <Button
                variant="none"
                class="editor-btn cancel"
                onclick={onCancel}
                aria-label={m.cancel()}
                tooltip={`${m.cancel()}${getShortcutHint(editorCommandsNode, "cancel-note-edit")}`}
            >
                {m.cancel()}
            </Button>
            <Button
                variant="none"
                class="editor-btn save"
                onclick={onSave}
                aria-label={m.save()}
                tooltip={`${m.save()}${getShortcutHint(editorCommandsNode, "save-note-edit")}`}
            >
                {m.save()}
            </Button>
        </div>
    </div>
</div>

<style>
    .editor-card {
        width: 380px;
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

    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .editor-header h3 {
        margin: 0;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        color: var(--text-color);
    }

    .editor-page {
        font-size: 9px;
        font-weight: 900;
        background: var(--muted-bg-color);
        color: var(--muted-text-color);
        border: 1px solid var(--border-color);
        padding: 2px 6px;
        border-radius: 2px;
    }

    .editor-quote {
        margin: 0;
        font-style: italic;
        font-size: 11px;
        color: var(--text-color);
        background: rgba(0, 0, 0, 0.04);
        padding: 6px;
        border-left: 3px solid var(--border-color);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
    }

    .editor-textarea {
        width: 100%;
        height: 120px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        padding: 6px;
        border: 2px solid var(--border-color);
        box-shadow: inset 1.5px 1.5px 0 rgba(0, 0, 0, 0.1);
        background: var(--surface-color);
        color: var(--text-color);
        resize: none;
        outline: none;
        box-sizing: border-box;
    }

    .editor-textarea:focus {
        border-color: var(--border-color);
        box-shadow:
            inset 1.5px 1.5px 0 rgba(0, 0, 0, 0.15),
            2px 2px 0 var(--shadow-color);
    }

    .color-picker {
        display: flex;
        gap: 6px;
        justify-content: center;
        padding: 4px 0;
    }

    :global(.color-swatch) {
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        border: 2px solid var(--border-color) !important;
        cursor: pointer !important;
        box-shadow: 1px 1px 0 var(--shadow-color) !important;
        transition: transform 0.1s ease !important;
        padding: 0 !important;
        min-height: unset !important;
    }

    :global(.color-swatch:hover) {
        transform: scale(1.1) !important;
    }

    :global(.color-swatch.selected) {
        transform: scale(1.2) !important;
        box-shadow:
            0 0 0 2px var(--surface-color),
            0 0 0 4px var(--border-color) !important;
    }

    :global(.swatch-yellow) {
        background: rgb(255, 235, 59) !important;
    }
    :global(.swatch-green) {
        background: rgb(76, 175, 80) !important;
    }
    :global(.swatch-blue) {
        background: rgb(33, 150, 243) !important;
    }
    :global(.swatch-pink) {
        background: rgb(233, 30, 99) !important;
    }
    :global(.swatch-purple) {
        background: rgb(156, 39, 176) !important;
    }

    .editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
    }

    :global(.editor-btn) {
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

    :global(.editor-btn:hover) {
        transform: translate(-1px, -1px) !important;
        box-shadow: 3px 3px 0 var(--shadow-color) !important;
        background: var(--accent-color) !important;
    }
</style>
