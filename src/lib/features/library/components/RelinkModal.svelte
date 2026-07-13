<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/core/components/ui/Modal.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
    import { viewerStore } from "$lib/features/viewer/stores/viewerStore.svelte"
    import { fileNodeToBook } from "$lib/features/viewer/stores/viewerStore.types"
    import { goto } from "$app/navigation"
    import { localizedPath } from "$lib/core/language/language"
    import type { FileNode } from "$lib/core/vfs/vfsStore.types"

    let fileInput = $state<HTMLInputElement | null>(null)
    const nodeId = $derived(uiStore.relinkNodeId)
    const node = $derived(nodeId ? (vfsStore.nodes[nodeId] as FileNode) : null)

    function handleClose() {
        uiStore.isRelinkModalOpen = false
        uiStore.relinkNodeId = null
    }

    async function handleRelink(fileSource: File | FileSystemFileHandle) {
        if (!node) return

        const originalName = node.name
        const newName = fileSource.name

        if (originalName && newName && originalName !== newName) {
            const warning = m.relink_warning({ newName, originalName })
            const confirmed = confirm(warning)
            if (!confirmed) return
        }

        try {
            await vfsStore.relinkFile(node.id, fileSource)
            uiStore.isRelinkModalOpen = false
            uiStore.relinkNodeId = null

            // Open the book directly
            await viewerStore.setCurrentBook(fileNodeToBook(node))
            goto(localizedPath("/viewer"))
        } catch (err) {
            console.error("Failed to relink file:", err)
            alert(m.relink_failed())
        }
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
</script>

<Modal onClose={handleClose} title={m.relink_modal_title()} autofocusClose={false}>
    <div class="relink-modal-content">
        <p class="description-text">
            {m.relink_modal_description({ name: node ? node.name : "" })}
        </p>
        <div class="modal-actions">
            <Button variant="brutalist" onclick={handleLocateClick}>{m.locate_file()}</Button>
            <Button variant="ghost" onclick={handleClose}>{m.cancel()}</Button>
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
