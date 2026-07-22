import { describe, expect, it, vi } from "vitest"
import { focusLeavesSearchControl } from "./sidebarSearchFocus"

describe("sidebar search focus", () => {
    it("stays focused while moving from the input to the clear button", () => {
        const clearButton = {} as EventTarget
        const control = { contains: vi.fn((target) => target === clearButton) }
        expect(focusLeavesSearchControl(control as Pick<Node, "contains">, clearButton)).toBe(false)
    })

    it("reports blur when focus leaves the whole search control", () => {
        const control = { contains: vi.fn(() => false) }
        expect(focusLeavesSearchControl(control as Pick<Node, "contains">, {} as EventTarget)).toBe(
            true,
        )
        expect(focusLeavesSearchControl(control as Pick<Node, "contains">, null)).toBe(true)
    })
})
