<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/shared/ui/modal/Modal.svelte"
    import Button from "$lib/shared/ui/Button.svelte"
    import Input from "$lib/shared/ui/Input.svelte"
    import { relinkRequest } from "../state/relinkRequest.svelte"
    import { vfsStore } from "$lib/modules/documents"
    import type { FileNode } from "$lib/modules/documents"
    import { relinkLibraryNode } from "../commands/libraryRelinkExecution"
    import { commandsStore } from "$lib/modules/commands"
    import { defineCommands } from "$lib/modules/commands"
    import { useModalCommands } from "$lib/modules/commands"

    let fileInput = $state<HTMLInputElement | null>(null)
    const nodeId = $derived(relinkRequest.nodeId)
    const node = $derived(nodeId ? (vfsStore.nodes[nodeId] as FileNode) : null)

    function handleClose() {
        relinkRequest.cancel()
    }

    async function handleRelink(fileSource: File | FileSystemFileHandle) {
        if (!node) return
        await relinkLibraryNode(node.id, fileSource)
    }

    async function handleLocateClick() {
        if (typeof window.showOpenFilePicker === "function") {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [
                        {
                            description: "PDF Ebooks",
                            accept: { "application/pdf": [".pdf"] },
                        },
                    ],
                    multiple: false,
                })
                if (handle) {
                    await handleRelink(handle)
                }
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("showOpenFilePicker failed, falling back to input", err)
                    fileInput?.click()
                }
            }
        } else {
            fileInput?.click()
        }
    }

    function handleFileChange(event: Event) {
        const target = event.target as HTMLInputElement
        const files = target.files
        if (files && files.length > 0) {
            handleRelink(files[0])
        }
    }

    const activeNodeBeforeOpen = commandsStore.activeScope
    const modalCommands = defineCommands({
        "modal.cancel": {
            id: "modal.cancel",
            label: () => m.cancel(),
            category: "commands",
            keymap: ["escape", "ctrl+c", "ctrl+[", "q"],
            allowInInputs: true,
            run: handleClose,
        },
    })
    const commandsNode = useModalCommands(Object.values(modalCommands), activeNodeBeforeOpen)
</script>

<Modal
    variant="default"
    type="float"
    size="medium"
    placement="center"
    onClose={() => void commandsNode.execute("modal.cancel")}
    title={m.relink_modal_title()}
    initialFocus="first"
    draggable
>
    <div class="relink-modal-content">
        <p class="description-text">
            {m.relink_modal_description({ name: node ? node.name : "" })}
        </p>
        <div class="modal-actions">
            <Button variant="brutalist" onclick={handleLocateClick}>{m.locate_file()}</Button>
            <Button variant="ghost" onclick={() => void commandsNode.execute("modal.cancel")}>
                {m.cancel()}
            </Button>
        </div>
    </div>
</Modal>

<Input
    unstyled
    bind:ref={fileInput}
    type="file"
    accept=".pdf"
    onchange={handleFileChange}
    style="display: none;"
/>

<style>
    .relink-modal-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        margin-top: 10px;
        box-sizing: border-box;
        padding: 0 24px 24px 24px;
    }

    .description-text {
        margin: 0;
        font-size: var(--font-size-md);
        line-height: 1.5;
        color: var(--text-color);
        font-weight: 600;
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
