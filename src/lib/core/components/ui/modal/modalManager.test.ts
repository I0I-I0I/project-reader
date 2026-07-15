import { afterEach, describe, expect, it, vi } from "vitest"
import { ModalManager } from "./modalManager.svelte"

function record(id: string, state: "blocking" | "modeless" = "blocking") {
    return {
        id,
        state,
        element: null,
        close: vi.fn(),
        restoreFocusTo: null,
    }
}

describe("ModalManager", () => {
    const manager = new ModalManager()

    afterEach(() => manager.reset())

    it("registers, unregisters, and rejects duplicate ids", () => {
        const cleanup = manager.register(record("one"))
        expect(manager.hasAnyModal).toBe(true)
        expect(() => manager.register(record("one"))).toThrow(/already mounted/)
        expect(cleanup()?.id).toBe("one")
        expect(manager.hasAnyModal).toBe(false)
    })

    it("keeps deterministic z-order when a modeless window is raised", () => {
        manager.register(record("one", "modeless"))
        manager.register(record("two", "modeless"))
        manager.bringToFront("one")
        expect(manager.records.map(({ id, zOrder }) => [id, zOrder])).toEqual([
            ["two", 0],
            ["one", 1],
        ])
        expect(manager.zIndex("one")).toBe(1002)
    })

    it("selects the top blocking modal from a mixed stack", () => {
        manager.register(record("blocking-one"))
        manager.register(record("window", "modeless"))
        manager.register(record("blocking-two"))
        manager.bringToFront("window")
        expect(manager.topmostModal?.id).toBe("window")
        expect(manager.topmostBlockingModal?.id).toBe("blocking-two")
    })

    it("turns a blocking modal modeless and routes close reasons", () => {
        const modal = record("one")
        manager.register(modal)
        manager.setModeless("one")
        expect(manager.hasBlockingModal).toBe(false)
        expect(manager.get("one")?.state).toBe("modeless")
        manager.requestClose("one", "escape")
        expect(modal.close).toHaveBeenCalledWith("escape")
    })
})
