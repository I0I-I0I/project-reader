<script lang="ts">
    import { onMount, tick } from "svelte"
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/core/components/ui/modal/Modal.svelte"
    import Button from "$lib/core/components/ui/Button.svelte"
    import Input from "$lib/core/components/ui/Input.svelte"
    import { uiStore } from "$lib/core/stores/uiStore.svelte"
    import { vfsStore } from "$lib/core/vfs/vfsStore.svelte"
    import { commandsStore } from "$lib/features/commands/commandsStore.svelte"
    import { useModalCommands } from "$lib/features/commands/useModalCommands.svelte"
    import { defineCommands } from "$lib/features/commands/commands.types"
    import { updateLibraryBookMetadata } from "$lib/features/library/commands/libraryMetadataExecution"

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

    const activeNodeBeforeOpen = commandsStore.activeScope

    const modalCommands = defineCommands({
        "modal.confirm": {
            id: "modal.confirm",
            keymap: "enter",
            label: () => m.save(),
            category: "commands",
            allowInInputs: true,
            run: handleSave,
        },
        "modal.cancel": {
            id: "modal.cancel",
            keymap: ["escape", "ctrl+c", "ctrl+[", "q"],
            label: () => m.cancel(),
            category: "commands",
            allowInInputs: true,
            run: handleClose,
        },
    })

    const commandsNode = useModalCommands(Object.values(modalCommands), activeNodeBeforeOpen)

    onMount(async () => {
        if (node && node.type === "file") {
            name = node.name
            author = node.metadata.author || ""
            pageNumber = node.metadata.pageNumber || 1
        }

        // Focus the title input when modal opens
        await tick()
        const input = document.getElementById("book-title-input") as HTMLInputElement | null
        if (input) {
            input.focus()
            input.select()
        }
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

        await updateLibraryBookMetadata({
            nodeId,
            name: name.trim(),
            author: author.trim() || null,
            pageNumber,
        })
    }

    function handleClose() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        uiStore.isEditMetadataModalOpen = false
    }
</script>

<Modal
    variant="default"
    type="float"
    size="medium"
    placement="center"
    onClose={() => void commandsNode.execute("modal.cancel")}
    title={m.edit_book_metadata()}
    initialFocus={() => document.getElementById("book-title-input")}
    draggable
>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-form"
        onkeydown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                void commandsNode.execute("modal.confirm")
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
            <Button variant="brutalist" onclick={() => void commandsNode.execute("modal.confirm")}
                >{m.save()}</Button
            >
            <Button variant="ghost" onclick={() => void commandsNode.execute("modal.cancel")}
                >{m.cancel()}</Button
            >
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
