import { describe, expect, it, vi } from "vitest"
import { getLanguageName } from "./locale"

describe("getLanguageName", () => {
    it("uses deterministic English aliases when Intl.DisplayNames is unavailable", () => {
        const displayNames = vi.spyOn(Intl, "DisplayNames").mockImplementation(() => {
            throw new Error("unsupported")
        })

        expect(getLanguageName("ru", "en")).toBe("Russian")
        expect(getLanguageName("en", "en")).toBe("English")
        displayNames.mockRestore()
    })
})
