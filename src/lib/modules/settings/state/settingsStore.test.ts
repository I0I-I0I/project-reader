import { afterEach, describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, sanitizeSettings, settingsStore } from "./settingsStore.svelte"

afterEach(() => {
    settingsStore.preferPdfTitle = DEFAULT_SETTINGS.preferPdfTitle
})

describe("PDF title preference", () => {
    it("defaults to enabled", () => {
        expect(DEFAULT_SETTINGS.preferPdfTitle).toBe(true)
    })

    it("accepts only boolean persisted values", () => {
        expect(sanitizeSettings({ preferPdfTitle: false }).preferPdfTitle).toBe(false)
        expect(sanitizeSettings({ preferPdfTitle: "false" }).preferPdfTitle).toBeUndefined()
        expect(sanitizeSettings({ preferPdfTitle: 0 }).preferPdfTitle).toBeUndefined()
    })

    it("switches reactively through the store", () => {
        settingsStore.preferPdfTitle = false
        expect(settingsStore.preferPdfTitle).toBe(false)
        settingsStore.preferPdfTitle = true
        expect(settingsStore.preferPdfTitle).toBe(true)
    })
})
