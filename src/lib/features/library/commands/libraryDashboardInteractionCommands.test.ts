import { describe, expect, it, vi } from "vitest"
import { createLibraryDashboardInteractionCommands } from "./libraryDashboardInteractionCommands"

const labelSet = {
    down: () => "Down",
    up: () => "Up",
    left: () => "Left",
    right: () => "Right",
    openPicker: () => "Open picker",
    focusPicker: () => "Focus picker",
    selectionPicker: () => "Selection picker",
    upFolder: () => "Up folder",
}

describe("library dashboard command aliases", () => {
    it("gives every dashboard command a non-empty English alias", () => {
        const commands = createLibraryDashboardInteractionCommands({
            gridDisabled: () => false,
            moveGrid: vi.fn(),
            startOpenPicker: vi.fn(),
            startFocusPicker: vi.fn(),
            startSelectionPicker: vi.fn(),
            goUpFolder: vi.fn(),
            labels: labelSet,
            englishLabels: labelSet,
        })

        for (const command of commands) {
            expect(command.englishLabel?.().trim(), command.id).toBeTruthy()
        }
    })
})
