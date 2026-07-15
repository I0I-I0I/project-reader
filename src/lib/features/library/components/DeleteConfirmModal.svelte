<script lang="ts">
    import * as m from "$lib/paraglide/messages"
    import Modal from "$lib/core/components/ui/modal/Modal.svelte"

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
</script>

<Modal
    variant="confirmation"
    type="float"
    size="small"
    placement="center"
    {title}
    {message}
    confirmLabel={m.delete()}
    cancelLabel={m.cancel()}
    confirmTone="danger"
    {onConfirm}
    onClose={(reason) => {
        if (reason !== "confirmed") onCancel()
    }}
/>
