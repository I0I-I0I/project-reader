import type { ModalProps } from "./modal.types"

const onClose = () => {}

export const validModalFixtures = [
    { title: "Help", onClose, draggable: true },
    {
        ariaLabel: "Anchored tools",
        onClose,
        placement: "anchor",
        anchor: document.body,
    },
    {
        variant: "confirmation",
        title: "Delete book",
        message: "This cannot be undone.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        onConfirm: () => {},
        onClose,
    },
] satisfies ModalProps[]

// @ts-expect-error Confirmation dialogs cannot be dragged.
export const draggableConfirmation: ModalProps = {
    variant: "confirmation",
    title: "Delete",
    message: "Delete?",
    confirmLabel: "Delete",
    onConfirm: () => {},
    onClose,
    draggable: true,
}

// @ts-expect-error Confirmation dialogs cannot be fullscreen.
export const fullscreenConfirmation: ModalProps = {
    variant: "confirmation",
    title: "Delete",
    message: "Delete?",
    confirmLabel: "Delete",
    onConfirm: () => {},
    onClose,
    size: "fullscreen",
}

// @ts-expect-error Anchored placement requires an anchor.
export const missingAnchor: ModalProps = { title: "Tools", onClose, placement: "anchor" }

// @ts-expect-error Draggable dialogs require a header.
export const headerlessDrag: ModalProps = {
    title: "Tools",
    onClose,
    draggable: true,
    showHeader: false,
}

// @ts-expect-error Every dialog requires a title or ariaLabel.
export const unlabeled: ModalProps = { onClose }

// @ts-expect-error Confirmation dialogs require message, confirmLabel, and onConfirm.
export const incompleteConfirmation: ModalProps = {
    variant: "confirmation",
    title: "Delete",
    onClose,
}
