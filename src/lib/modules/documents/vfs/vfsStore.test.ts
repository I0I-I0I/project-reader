import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { pdfConstructed } = vi.hoisted(() => ({ pdfConstructed: vi.fn() }))

vi.mock("$app/environment", () => ({ browser: true }))
vi.mock("$lib/modules/pdf", () => ({
    PDFDocument: class {
        constructor() {
            pdfConstructed()
        }
        async load() {
            throw new Error("corrupt PDF")
        }
        async close() {}
    },
}))

import { VFSStore } from "./vfsStore.svelte"
import type { ImportInput, VFSNodes } from "./vfsStore.types"

function handle(name: string): FileSystemFileHandle {
    return {
        kind: "file",
        name,
        getFile: vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })),
    } as unknown as FileSystemFileHandle
}

beforeEach(() => {
    pdfConstructed.mockClear()
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe("VFS initialization", () => {
    it("restores legacy metadata without parsing PDFs", async () => {
        const store = new VFSStore()
        store.db = {
            folders: { getAll: vi.fn(async () => []) },
            files: {
                getAll: vi.fn(async () => [
                    {
                        id: "legacy",
                        name: "legacy.pdf",
                        type: "file",
                        parentId: null,
                        size: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        isPinned: false,
                        metadata: { pageNumber: 1, author: undefined },
                    },
                ]),
            },
        } as never

        await store.init()

        expect(store.nodes.legacy).toBeDefined()
        expect(pdfConstructed).not.toHaveBeenCalled()
    })
})

describe("VFS pinning", () => {
    const nodes: VFSNodes = {
        "unpinned-file-new": {
            id: "unpinned-file-new",
            name: "Unpinned new.pdf",
            type: "file",
            parentId: null,
            size: 1,
            createdAt: 1,
            updatedAt: 8,
            isPinned: false,
            metadata: { pageNumber: 1 },
        },
        "pinned-folder-old": {
            id: "pinned-folder-old",
            name: "Pinned old folder",
            type: "folder",
            parentId: null,
            childrenIds: [],
            createdAt: 1,
            updatedAt: 2,
            isPinned: true,
        },
        "unpinned-folder-old": {
            id: "unpinned-folder-old",
            name: "Unpinned old folder",
            type: "folder",
            parentId: null,
            childrenIds: [],
            createdAt: 1,
            updatedAt: 3,
            isPinned: false,
        },
        "pinned-file-new": {
            id: "pinned-file-new",
            name: "Pinned new.pdf",
            type: "file",
            parentId: null,
            size: 1,
            createdAt: 1,
            updatedAt: 7,
            metadata: { pageNumber: 1 },
            isPinned: true,
        },
        "pinned-folder-new": {
            id: "pinned-folder-new",
            name: "Pinned new folder",
            type: "folder",
            parentId: null,
            childrenIds: [],
            createdAt: 1,
            updatedAt: 6,
            isPinned: true,
        },
        "unpinned-folder-new": {
            id: "unpinned-folder-new",
            name: "Unpinned new folder",
            type: "folder",
            parentId: null,
            childrenIds: [],
            createdAt: 1,
            updatedAt: 5,
            isPinned: false,
        },
        "pinned-file-old": {
            id: "pinned-file-old",
            name: "Pinned old.pdf",
            type: "file",
            parentId: null,
            size: 1,
            createdAt: 1,
            updatedAt: 1,
            metadata: { pageNumber: 1 },
            isPinned: true,
        },
        "unpinned-file-old": {
            id: "unpinned-file-old",
            name: "Unpinned old.pdf",
            type: "file",
            parentId: null,
            size: 1,
            createdAt: 1,
            updatedAt: 4,
            metadata: { pageNumber: 1 },
            isPinned: false,
        },
    }

    it("sorts by pin and node type before descending recency", () => {
        const store = new VFSStore(structuredClone(nodes))
        expect(store.sortedCurrentNodes.map(({ id }) => id)).toEqual([
            "pinned-folder-new",
            "pinned-folder-old",
            "pinned-file-new",
            "pinned-file-old",
            "unpinned-folder-new",
            "unpinned-folder-old",
            "unpinned-file-new",
            "unpinned-file-old",
        ])
    })

    it.each([
        ["pinned-file-new", "files"],
        ["pinned-folder-new", "folders"],
    ] as const)("persists %s in the correct table before publishing", async (id, table) => {
        const store = new VFSStore(structuredClone(nodes))
        let resolveWrite!: () => void
        const update = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveWrite = resolve
                }),
        )
        const otherUpdate = vi.fn()
        store.db = {
            files: { update: table === "files" ? update : otherUpdate },
            folders: { update: table === "folders" ? update : otherUpdate },
        } as never
        const before = store.nodes[id]
        const pending = store.setNodePinned(id, false)

        expect(store.nodes[id]).toBe(before)
        expect(store.nodes[id].isPinned).toBe(true)
        expect(update).toHaveBeenCalledWith(id, { isPinned: false })
        expect(otherUpdate).not.toHaveBeenCalled()

        resolveWrite()
        await pending
        expect(store.nodes[id]).toBe(before)
        expect(store.nodes[id]).toMatchObject({ isPinned: false, updatedAt: before.updatedAt })
    })

    it("serializes a delayed pin write with a concurrent metadata update", async () => {
        const store = new VFSStore(structuredClone(nodes))
        let resolveFirstWrite!: () => void
        const update = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveFirstWrite = resolve
                }),
        )
        const put = vi.fn().mockResolvedValue(undefined)
        store.db = { files: { update, put }, folders: { update: vi.fn(), put: vi.fn() } } as never

        const pin = store.setNodePinned("unpinned-file-new", true)
        const updateMetadata = store.updateFile("unpinned-file-new", {
            metadata: { author: "Concurrent author" },
        })

        expect(update).toHaveBeenCalledTimes(1)
        expect(put).not.toHaveBeenCalled()
        resolveFirstWrite()
        await Promise.all([pin, updateMetadata])

        expect(store.nodes["unpinned-file-new"]).toMatchObject({
            isPinned: true,
            metadata: { pageNumber: 1, author: "Concurrent author" },
        })
        expect(put).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isPinned: true,
                metadata: { pageNumber: 1, author: "Concurrent author" },
            }),
        )
    })

    it("skips unchanged state and leaves memory and ordering unchanged on failure", async () => {
        const store = new VFSStore(structuredClone(nodes))
        const update = vi.fn(async () => {
            throw new Error("disk full")
        })
        store.db = { files: { update }, folders: { update } } as never
        const originalOrder = store.sortedCurrentNodes.map(({ id }) => id)
        const originalNode = store.nodes["pinned-file-new"]

        await store.setNodePinned("pinned-file-new", true)
        expect(update).not.toHaveBeenCalled()

        await expect(store.setNodePinned("pinned-file-new", false)).rejects.toThrow("disk full")
        expect(store.nodes["pinned-file-new"]).toBe(originalNode)
        expect(store.sortedCurrentNodes.map(({ id }) => id)).toEqual(originalOrder)
    })
})

describe("VFS metadata enrichment ownership", () => {
    it("does not parse a legacy file solely because its optional author is unchecked", async () => {
        const idleCallbacks: IdleRequestCallback[] = []
        vi.stubGlobal(
            "requestIdleCallback",
            vi.fn((callback: IdleRequestCallback) => {
                idleCallbacks.push(callback)
                return 1
            }),
        )
        vi.stubGlobal("cancelIdleCallback", vi.fn())
        vi.stubGlobal("document", {
            visibilityState: "visible",
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })

        const store = new VFSStore({
            legacy: {
                id: "legacy",
                name: "legacy.pdf",
                type: "file",
                parentId: null,
                size: 1,
                createdAt: 1,
                updatedAt: 1,
                isPinned: false,
                metadata: { pageNumber: 1, totalPages: 10, author: undefined },
            },
        })
        store.initialized = true

        const release = store.acquireMetadataEnrichment()
        idleCallbacks[0]({ didTimeout: false, timeRemaining: () => 50 })
        await Promise.resolve()
        await Promise.resolve()

        expect(pdfConstructed).not.toHaveBeenCalled()
        release()
    })

    it("cancels queued enrichment when the library releases ownership", () => {
        const cancelIdleCallback = vi.fn()
        vi.stubGlobal(
            "requestIdleCallback",
            vi.fn(() => 7),
        )
        vi.stubGlobal("cancelIdleCallback", cancelIdleCallback)
        vi.stubGlobal("document", {
            visibilityState: "visible",
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })

        const store = new VFSStore()
        const release = store.acquireMetadataEnrichment()
        release()

        expect(cancelIdleCallback).toHaveBeenCalledWith(7)
    })
})

describe("VFS preview ownership", () => {
    it("deduplicates concurrent cache reads and retains the URL until the last release", async () => {
        const store = new VFSStore()
        let resolvePreview!: (value: { id: string; data: Blob }) => void
        const get = vi.fn(
            () =>
                new Promise<{ id: string; data: Blob }>((resolve) => {
                    resolvePreview = resolve
                }),
        )
        store.db = { previews: { get } } as never
        const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
        const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)

        const first = store.getPreviewUrl("book")
        const second = store.getPreviewUrl("book")
        resolvePreview({ id: "book", data: new Blob(["preview"]) })

        await expect(Promise.all([first, second])).resolves.toEqual([
            "blob:preview",
            "blob:preview",
        ])
        expect(get).toHaveBeenCalledOnce()
        expect(createObjectURL).toHaveBeenCalledOnce()

        store.revokePreviewUrl("book")
        expect(revokeObjectURL).not.toHaveBeenCalled()
        store.revokePreviewUrl("book")
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview")
    })

    it("revokes a URL created after its only consumer releases", async () => {
        const store = new VFSStore()
        let resolvePreview!: (value: { id: string; data: Blob }) => void
        store.db = {
            previews: {
                get: () =>
                    new Promise<{ id: string; data: Blob }>((resolve) => {
                        resolvePreview = resolve
                    }),
            },
        } as never
        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:late")
        const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)

        const pending = store.getPreviewUrl("book")
        store.revokePreviewUrl("book")
        resolvePreview({ id: "book", data: new Blob(["preview"]) })

        await expect(pending).resolves.toBe("")
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:late")
        expect(store.previewUrls.book).toBeUndefined()
    })
})

describe("folder names", () => {
    const folders = {
        parent: {
            id: "parent",
            name: "Parent",
            type: "folder" as const,
            parentId: null,
            childrenIds: ["folder", "sibling"],
            createdAt: 1,
            updatedAt: 1,
            isPinned: false,
        },
        folder: {
            id: "folder",
            name: "Old name",
            type: "folder" as const,
            parentId: "parent",
            childrenIds: ["book"],
            createdAt: 2,
            updatedAt: 2,
            isPinned: false,
        },
        sibling: {
            id: "sibling",
            name: "Taken",
            type: "folder" as const,
            parentId: "parent",
            childrenIds: [],
            createdAt: 3,
            updatedAt: 3,
            isPinned: false,
        },
    }

    it("creates folders as explicitly unpinned", async () => {
        const store = new VFSStore()
        const put = vi.fn(async () => "folder")
        store.db = {
            folders: { put },
            transaction: vi.fn(async (_mode, _tables, callback) => callback()),
        } as never

        const id = await store.createFolder("New folder", null)

        expect(put).toHaveBeenCalledWith(expect.objectContaining({ id, isPinned: false }))
        expect(store.nodes[id].isPinned).toBe(false)
    })

    it("persists before atomically publishing a normalized rename", async () => {
        const store = new VFSStore(structuredClone(folders))
        const put = vi.fn(async () => "folder")
        store.db = { folders: { put } } as never

        await store.renameFolder("folder", "  New name  ")

        expect(put).toHaveBeenCalledWith(expect.objectContaining({ name: "New name" }))
        expect(store.nodes.folder).toMatchObject({
            id: "folder",
            name: "New name",
            parentId: "parent",
            childrenIds: ["book"],
            createdAt: 2,
        })
    })

    it.each(["   ", "a/b", "taken", "TAKEN"])("rejects invalid name %j", async (name) => {
        const store = new VFSStore(structuredClone(folders))
        store.db = { folders: { put: vi.fn() } } as never
        await expect(store.renameFolder("folder", name)).rejects.toThrow()
        expect(store.nodes.folder.name).toBe("Old name")
    })

    it("does not write an unchanged normalized name", async () => {
        const store = new VFSStore(structuredClone(folders))
        const put = vi.fn()
        store.db = { folders: { put } } as never
        await store.renameFolder("folder", "Old name")
        expect(put).not.toHaveBeenCalled()
        expect(store.nodes.folder.updatedAt).toBe(2)
    })

    it("keeps memory unchanged when persistence fails", async () => {
        const store = new VFSStore(structuredClone(folders))
        store.db = {
            folders: {
                put: vi.fn(async () => {
                    throw new Error("disk full")
                }),
            },
        } as never
        await expect(store.renameFolder("folder", "New name")).rejects.toThrow("disk full")
        expect(store.nodes.folder.name).toBe("Old name")
    })

    it("serializes a delayed parent pin with a concurrent child move", async () => {
        const store = new VFSStore(structuredClone(folders))
        let resolvePin!: () => void
        const update = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolvePin = resolve
                }),
        )
        const put = vi.fn(async () => "folder")
        const transaction = vi.fn(async (_mode, _tables, callback) => callback())
        store.db = { folders: { update, put }, transaction } as never

        const pin = store.setNodePinned("parent", true)
        const move = store.moveNode("folder", null)

        expect(update).toHaveBeenCalledWith("parent", { isPinned: true })
        expect(transaction).not.toHaveBeenCalled()
        resolvePin()
        await Promise.all([pin, move])

        expect(store.nodes.parent).toMatchObject({ isPinned: true, childrenIds: ["sibling"] })
        expect(put).toHaveBeenCalledWith(
            expect.objectContaining({ id: "parent", isPinned: true, childrenIds: ["sibling"] }),
        )
    })
})

describe("VFS import registration", () => {
    it("exposes a complete batch synchronously and captures its parent", async () => {
        const store = new VFSStore()
        store.db = {
            transaction: vi.fn(async () => {
                throw new Error("disk full")
            }),
        } as never
        const failures: string[] = []
        const inputs: ImportInput[] = [
            { name: "one.pdf", source: handle("one.pdf") },
            { name: "two.pdf", source: handle("two.pdf") },
            { name: "three.pdf", source: handle("three.pdf") },
        ]

        const completion = store.importFiles(inputs, "folder-a", {
            onFailure: ({ name }, phase) => failures.push(`${phase}:${name}`),
        })

        expect(store.importJobs).toHaveLength(3)
        expect(store.importJobs.map(({ name }) => name)).toEqual([
            "one.pdf",
            "two.pdf",
            "three.pdf",
        ])
        expect(store.importJobs.every(({ parentId }) => parentId === "folder-a")).toBe(true)
        expect(store.activeImportCount).toBe(3)

        await completion
        expect(store.importJobs.every(({ stage }) => stage === "failed")).toBe(true)
        expect(failures).toEqual([
            "persistence:one.pdf",
            "persistence:two.pdf",
            "persistence:three.pdf",
        ])
    })

    it("rejects a non-PDF without blocking a valid sibling", async () => {
        const store = new VFSStore()
        store.db = {
            transaction: vi.fn(async () => {
                throw new Error("expected persistence failure")
            }),
        } as never

        const completion = store.importFiles(
            [
                { name: "notes.txt", source: handle("notes.txt") },
                { name: "book.pdf", source: handle("book.pdf") },
            ],
            null,
        )

        expect(store.importJobs.map(({ name }) => name)).toEqual(["book.pdf"])
        await expect(completion).resolves.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "notes.txt", status: "rejected" }),
                expect.objectContaining({ name: "book.pdf", status: "failed" }),
            ]),
        )
    })

    it("retains a persisted node when metadata enrichment fails", async () => {
        const store = new VFSStore()
        store.db = {
            files: { put: vi.fn(async () => "book") },
            fileContents: { put: vi.fn(async () => "book") },
            folders: { put: vi.fn(async () => "folder") },
            previews: { put: vi.fn(async () => "preview") },
            transaction: vi.fn(async (_mode, _tables, callback) => callback()),
        } as never
        const phases: string[] = []

        const [result] = await store.importFiles(
            [{ name: "corrupt.pdf", source: handle("corrupt.pdf") }],
            null,
            { onFailure: (_result, phase) => phases.push(phase) },
        )

        expect(result.status).toBe("imported")
        expect(store.nodes[result.id]).toMatchObject({
            id: result.id,
            name: "corrupt.pdf",
            metadata: { pageNumber: 1 },
            isPinned: false,
        })
        expect(store.importJobs).toHaveLength(0)
        expect(phases).toEqual(["metadata"])
    })

    it("clears only transient failed cards", () => {
        const store = new VFSStore()
        store.importJobs = [
            { id: "queued", name: "queued.pdf", parentId: null, stage: "queued" },
            { id: "failed", name: "failed.pdf", parentId: null, stage: "failed" },
        ]
        store.clearFailedImports()
        expect(store.importJobs.map(({ id }) => id)).toEqual(["queued"])
    })
})
