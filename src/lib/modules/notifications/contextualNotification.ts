import type { NotificationData } from "./state.svelte"

export interface ContextualNotificationInput {
    isViewerPage: boolean
    isLibrarySelectionActive: boolean
    selectedCount: number
    isViewerSearchActive: boolean
    currentMatchIndex: number
    matchCount: number
    importCount: number
    selectedLabel: string
    matchedLabel: string
    importingLabel: string
}

export function resolveContextualNotification(
    input: ContextualNotificationInput,
): NotificationData | null {
    if (!input.isViewerPage && input.isLibrarySelectionActive && input.selectedCount > 0) {
        return { line1: `${input.selectedCount}`, line2: input.selectedLabel }
    }
    if (input.isViewerPage && input.isViewerSearchActive && input.matchCount > 0) {
        return {
            line1: `${input.currentMatchIndex + 1} / ${input.matchCount}`,
            line2: input.matchedLabel,
        }
    }
    if (!input.isViewerPage && input.importCount > 0) {
        return { line1: `${input.importCount}`, line2: input.importingLabel }
    }
    return null
}
