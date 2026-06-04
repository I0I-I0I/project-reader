<script lang="ts">
    import { onMount, getContext } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Modal from "./ui/Modal.svelte"
    import Button from "./ui/Button.svelte"
    import Input from "./ui/Input.svelte"
    import { uiStore } from "$lib/stores/uiStore.svelte"
    import { vfsStore } from "$lib/stores/vfsStore.svelte"
    import { viewerStore } from "$lib/stores/viewerStore.svelte"
    import { useCommands } from "$lib/stores/commandsStore.svelte"

    interface Props {
        nodeId: string
    }

    const { nodeId }: Props = $props()

    const node = $derived(vfsStore.nodes[nodeId])

    let name = $state("")
    let author = $state("")
    let pageNumber = $state(1)

    let errors = $state<{
        name?: string[]
        author?: string[]
        pageNumber?: string[]
    }>({})

    const getActiveNode = getContext<() => any>("get_active_commands_node")
    const activeNodeBeforeOpen = getActiveNode ? getActiveNode() : null

    useCommands(
        [
            {
                keys: "escape",
                action: (event) => {
                    event.preventDefault()
                    handleClose()
                },
                description: m.cancel(),
                allowInInputs: true,
            },
        ],
        activeNodeBeforeOpen,
    )

    onMount(() => {
        if (node && node.type === "file") {
            name = node.name
            author = node.metadata.author || ""
            pageNumber = node.metadata.pageNumber || 1
        }

        // Focus the title input when modal opens
        setTimeout(() => {
            const input = document.getElementById("book-title-input") as HTMLInputElement | null
            if (input) {
                input.focus()
                input.select()
            }
        }, 0)
    })

    function validateForm() {
        let isValid = true
        const newErrors: typeof errors = {}

        if (!name.trim()) {
            newErrors.name = [m.title_required()]
            isValid = false
        }

        if (
            pageNumber === null ||
            pageNumber === undefined ||
            isNaN(pageNumber) ||
            pageNumber < 1
        ) {
            newErrors.pageNumber = [m.invalid_page_number()]
            isValid = false
        }

        errors = newErrors
        return isValid
    }

    async function handleSave() {
        if (!validateForm()) return

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }

        uiStore.isEditMetadataModalOpen = false

        if (node && node.type === "file") {
            const currentBook = viewerStore.getCurrentBook()
            if (currentBook && currentBook.id === nodeId) {
                await viewerStore.updateBook({
                    ...currentBook,
                    name: name.trim(),
                    pageNumber,
                    author: author.trim() || null,
                })
            } else {
                await vfsStore.updateFile(nodeId, {
                    name: name.trim(),
                    metadata: {
                        ...node.metadata,
                        author: author.trim() || null,
                        pageNumber,
                    },
                })
            }
        }
    }

    function handleClose() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        uiStore.isEditMetadataModalOpen = false
    }
</script>

<Modal onClose={handleClose} title={m.edit_book_metadata()} autofocusClose={false}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-form"
        onkeydown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault()
                handleSave()
            }
        }}
    >
        <Input
            id="book-title-input"
            placeholder={m.title()}
            label={m.title()}
            bind:value={name}
            errors={errors.name}
        />
        <Input
            id="book-author-input"
            placeholder={m.author()}
            label={m.author()}
            bind:value={author}
            errors={errors.author}
        />
        <Input
            id="book-page-input"
            type="number"
            min="1"
            placeholder={m.current_page()}
            label={m.current_page()}
            bind:value={pageNumber}
            errors={errors.pageNumber}
        />
        <div class="modal-actions">
            <Button variant="brutalist" onclick={handleSave}>{m.save()}</Button>
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
