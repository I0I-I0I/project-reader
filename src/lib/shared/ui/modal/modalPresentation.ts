import type {
    MobilePresentation,
    ModalPresentation,
    ModalSize,
    ModalState,
    ModalType,
} from "./modal.types"

type ResolveModalPresentationOptions = {
    isCompact: boolean
    mobilePresentation: MobilePresentation
    type: ModalType
    size: ModalSize
    state: ModalState
}

export function resolveModalPresentation({
    isCompact,
    mobilePresentation,
    type,
    size,
    state,
}: ResolveModalPresentationOptions): ModalPresentation {
    if (state === "modeless") return "dialog"
    if (!isCompact) return size === "fullscreen" ? "fullscreen" : "dialog"
    if (mobilePresentation !== "auto") return mobilePresentation
    if (size === "fullscreen" || (type === "layout" && size === "large")) return "fullscreen"
    return "sheet"
}
