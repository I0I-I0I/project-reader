import { describe, expect, it, vi } from "vitest"

vi.mock("$lib/modules/pdf", () => ({
    PDFDocument: class {
        async load() {
            throw new Error("corrupt PDF")
        }
        async close() {}
    },
}))

import { VFSStore } from "./vfsStore.svelte"
import type { ImportInput } from "./vfsStore.types"

function handle(name: string): FileSystemFileHandle {
    return {
        kind: "file",
        name,
        getFile: vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })),
    } as unknown as FileSystemFileHandle
}

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
