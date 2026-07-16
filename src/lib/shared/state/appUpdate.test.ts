import { afterEach, describe, expect, it, vi } from "vitest"
import { activateWaitingWorker } from "./appUpdate.svelte"

function installServiceWorkerContainer() {
    const serviceWorker = new EventTarget()
    vi.stubGlobal("navigator", { serviceWorker })
    vi.stubGlobal("window", {
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
    })
    return serviceWorker
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe("activateWaitingWorker", () => {
    it("returns immediately when the latest worker is already active", async () => {
        installServiceWorkerContainer()
        const update = vi.fn().mockResolvedValue(undefined)
        const registration = {
            update,
            waiting: null,
            installing: null,
        } as unknown as ServiceWorkerRegistration

        await activateWaitingWorker(registration)

        expect(update).toHaveBeenCalledOnce()
    })

    it("activates a waiting worker and resolves on controller change", async () => {
        const serviceWorker = installServiceWorkerContainer()
        const postMessage = vi.fn(() => {
            serviceWorker.dispatchEvent(new Event("controllerchange"))
        })
        const registration = {
            update: vi.fn().mockResolvedValue(undefined),
            waiting: { postMessage },
            installing: null,
        } as unknown as ServiceWorkerRegistration

        await activateWaitingWorker(registration)

        expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
    })
})
