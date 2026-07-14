import { beforeEach, describe, expect, it, vi } from "vitest"
import { promptStore } from "./promptStore.svelte"
import * as m from "$lib/paraglide/messages"

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("promptStore", () => {
    beforeEach(() => promptStore.close())

    it("returns a typed choice and closes by default", async () => {
        const choice = promptStore.choose({
            id: "theme",
            options: [{ id: "dark", label: "Dark", value: "dark" as const }],
        })
        await flush()

        expect(promptStore.snapshot?.selectedIndex).toBe(0)
        await promptStore.selectCurrent()
        await expect(choice).resolves.toBe("dark")
        expect(promptStore.isOpen).toBe(false)
    })

    it("closes an open request before invoking its default selection callback", async () => {
        const onSelect = vi.fn(() => {
            expect(promptStore.isOpen).toBe(false)
        })
        const closed = promptStore.open({
            id: "commands",
            options: [{ id: "next", label: "Next page", value: "viewer.page.next" }],
            onSelect,
        })
        await flush()
        await promptStore.selectCurrent()

        expect(onSelect).toHaveBeenCalledWith("viewer.page.next", expect.any(Object))
        await expect(closed).resolves.toBeUndefined()
    })

    it("supports explicit keep-open interactive sessions", async () => {
        const onSelect = vi.fn(() => "keep-open" as const)
        const closed = promptStore.open({
            id: "search",
            closeOnSelect: false,
            options: [{ id: "history", label: "query", value: "query" }],
            onSelect,
        })
        await flush()
        await promptStore.selectCurrent()

        expect(promptStore.isOpen).toBe(true)
        promptStore.close()
        await expect(closed).resolves.toBeUndefined()
    })

    it("cancels a chooser when another request replaces it", async () => {
        const first = promptStore.choose({
            id: "first",
            options: [{ id: "one", label: "One", value: 1 }],
        })
        const second = promptStore.choose({
            id: "second",
            options: [{ id: "two", label: "Two", value: 2 }],
        })
        await expect(first).resolves.toBeUndefined()
        promptStore.close()
        await expect(second).resolves.toBeUndefined()
    })

    it("discards stale asynchronous option results", async () => {
        let resolveFirst!: (value: { id: string; label: string; value: string }[]) => void
        const source = vi.fn((query: string) => {
            if (query === "old") {
                return new Promise<{ id: string; label: string; value: string }[]>((resolve) => {
                    resolveFirst = resolve
                })
            }
            return Promise.resolve([{ id: query, label: query, value: query }])
        })

        void promptStore.open({ id: "async", initialQuery: "old", filter: "none", options: source })
        promptStore.setQuery("new")
        await flush()
        expect(promptStore.snapshot?.options.map(({ id }) => id)).toEqual(["new"])

        resolveFirst([{ id: "old", label: "old", value: "old" }])
        await flush()
        expect(promptStore.snapshot?.options.map(({ id }) => id)).toEqual(["new"])
    })

    it("preserves the selected option when external results refresh", async () => {
        let options = [
            { id: "one", label: "One", value: 1 },
            { id: "two", label: "Two", value: 2 },
        ]
        void promptStore.open({ id: "refresh", filter: "none", options: () => options })
        await flush()
        promptStore.moveSelection(1)
        expect(promptStore.snapshot?.options[promptStore.snapshot.selectedIndex]?.id).toBe("two")

        options = [{ id: "zero", label: "Zero", value: 0 }, ...options]
        promptStore.refresh()
        await flush()
        expect(promptStore.snapshot?.options[promptStore.snapshot.selectedIndex]?.id).toBe("two")
    })

    it("exposes async option failures and clears loading", async () => {
        const onOptionsError = vi.fn()
        void promptStore.open({
            id: "failing-options",
            options: async () => {
                throw new Error("load failed")
            },
            errorLabel: "Could not load",
            onOptionsError,
        })
        await flush()

        expect(promptStore.snapshot?.isLoading).toBe(false)
        expect(promptStore.snapshot?.errorLabel).toBe("Could not load")
        expect(onOptionsError).toHaveBeenCalledWith(expect.any(Error))
    })

    it("clears loading even when the options error callback throws", async () => {
        void promptStore.open({
            id: "throwing-error-callback",
            options: async () => {
                throw new Error("load failed")
            },
            onOptionsError: () => {
                throw new Error("callback failed")
            },
        })
        await flush()

        expect(promptStore.snapshot?.isLoading).toBe(false)
        expect(promptStore.snapshot?.errorLabel).toBe(m.prompt_options_load_failed())
    })

    it("does not apply stale async errors to replacement requests", async () => {
        let rejectFirst!: (error: Error) => void
        void promptStore.open({
            id: "stale-error",
            options: () =>
                new Promise<never[]>((_, reject) => {
                    rejectFirst = reject
                }),
        })
        void promptStore.open({
            id: "replacement",
            options: [{ id: "ok", label: "OK", value: "ok" }],
        })
        rejectFirst(new Error("stale"))
        await flush()

        expect(promptStore.snapshot?.request.id).toBe("replacement")
        expect(promptStore.snapshot?.errorLabel).toBeUndefined()
    })

    it("clears a prior option error after a successful refresh", async () => {
        let shouldFail = true
        void promptStore.open({
            id: "recovering-options",
            options: async () => {
                if (shouldFail) throw new Error("failed")
                return [{ id: "ok", label: "OK", value: "ok" }]
            },
        })
        await flush()
        shouldFail = false
        promptStore.refresh()
        await flush()

        expect(promptStore.snapshot?.errorLabel).toBeUndefined()
        expect(promptStore.snapshot?.options).toHaveLength(1)
    })

    it("finds a localized option by its English alias", async () => {
        void promptStore.open({
            id: "localized-alias",
            initialQuery: "import book",
            options: [
                {
                    id: "import",
                    label: "Импортировать книгу",
                    englishLabel: "Import book",
                    value: "import",
                },
                { id: "other", label: "Другая команда", value: "other" },
            ],
            filter: "fuzzy",
        })
        await flush()

        expect(promptStore.snapshot?.options.map(({ id }) => id)).toEqual(["import"])
        promptStore.setQuery("импортировать")
        await flush()
        expect(promptStore.snapshot?.options.map(({ id }) => id)).toEqual(["import"])
    })

    it("parses free-form submissions", async () => {
        const result = promptStore.choose({
            id: "page",
            initialQuery: "12",
            options: [],
            parseQuery: (query) => Number(query),
        })
        await flush()
        await promptStore.selectCurrent()
        await expect(result).resolves.toBe(12)
    })
})
