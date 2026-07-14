import { beforeEach, describe, expect, it, vi } from "vitest"
import { promptStore } from "./promptStore.svelte"
import * as m from "$lib/paraglide/messages"

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("promptStore", () => {
    beforeEach(() => promptStore.close())

    it("returns a typed choice and closes by default", async () => {
        const choice = promptStore.choose({
            id: "theme",
            items: () => [{ id: "dark", label: "Dark", value: "dark" as const }],
        })
        await flush()

        expect(promptStore.snapshot?.selectedIndex).toBe(0)
        await promptStore.selectCurrent()
        await expect(choice).resolves.toBe("dark")
        expect(promptStore.isOpen).toBe(false)
    })

    it("exposes and retains the current query after selection", async () => {
        const closed = promptStore.open({
            id: "query-state",
            initialQuery: "previous",
            filter: "none",
            items: () => [{ id: "item", label: "Item", value: "item" }],
        })

        expect(promptStore.snapshot?.query).toBe("previous")
        promptStore.setQuery("latest")
        expect(promptStore.snapshot?.query).toBe("latest")
        await flush()
        await promptStore.selectCurrent()

        await expect(closed).resolves.toBeUndefined()
        expect(promptStore.getQuery()).toBe("latest")
    })

    it("navigates remembered queries from newest to oldest", async () => {
        const remember = async (query: string) => {
            promptStore.open({
                id: "query-history",
                initialQuery: query,
                rememberQuery: true,
                filter: "none",
                items: () => [{ id: "item", label: "Item", value: "item" }],
            })
            await flush()
            await promptStore.selectCurrent()
        }
        await remember("first")
        await remember("second")

        const onQueryChange = vi.fn()
        promptStore.open({
            id: "query-history",
            rememberQuery: true,
            filter: "none",
            items: () => [{ id: "item", label: "Item", value: "item" }],
            onQueryChange,
        })

        promptStore.historyBack()
        expect(promptStore.getQuery()).toBe("second")
        promptStore.historyBack()
        expect(promptStore.getQuery()).toBe("first")
        promptStore.historyBack()
        expect(promptStore.getQuery()).toBe("first")
        promptStore.historyForward()
        expect(promptStore.getQuery()).toBe("second")
        promptStore.historyForward()
        expect(promptStore.getQuery()).toBe("second")
        expect(onQueryChange.mock.calls.map(([query]) => query)).toEqual([
            "second",
            "first",
            "second",
        ])
    })

    it("restores the last query when an empty initial query is provided", async () => {
        const first = promptStore.open({
            id: "empty-initial-query",
            initialQuery: "remember me",
            rememberQuery: true,
            filter: "none",
            items: () => [{ id: "item", label: "Item", value: "item" }],
        })
        await flush()
        await promptStore.selectCurrent()
        await first

        void promptStore.open({
            id: "empty-initial-query",
            initialQuery: "",
            rememberQuery: true,
            filter: "none",
            items: () => [{ id: "item", label: "Item", value: "item" }],
        })

        expect(promptStore.getQuery()).toBe("remember me")
    })

    it("resets local history when reopening a request whose latest query is unchanged", async () => {
        const remember = async (id: string, query: string) => {
            promptStore.open({
                id,
                initialQuery: query,
                rememberQuery: true,
                filter: "none",
                items: () => [{ id: "item", label: "Item", value: "item" }],
            })
            await flush()
            await promptStore.selectCurrent()
        }

        await remember("history-reset-a", "alpha")
        await remember("history-reset-b", "beta")
        await remember("history-reset-a", "alpha")
        promptStore.open({
            id: "history-reset-a",
            initialQuery: "draft",
            rememberQuery: true,
            filter: "none",
            items: () => [{ id: "item", label: "Item", value: "item" }],
        })

        promptStore.historyBack()
        expect(promptStore.getQuery()).toBe("alpha")
        promptStore.historyBack()
        expect(promptStore.getQuery()).toBe("alpha")
    })

    it("closes an open request before invoking its default selection callback", async () => {
        const onSelect = vi.fn(() => {
            expect(promptStore.isOpen).toBe(false)
        })
        const closed = promptStore.open({
            id: "commands",
            items: () => [{ id: "next", label: "Next page", value: "viewer.page.next" }],
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
            items: () => [{ id: "history", label: "query", value: "query" }],
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
            items: () => [{ id: "one", label: "One", value: 1 }],
        })
        const second = promptStore.choose({
            id: "second",
            items: () => [{ id: "two", label: "Two", value: 2 }],
        })
        await expect(first).resolves.toBeUndefined()
        promptStore.close()
        await expect(second).resolves.toBeUndefined()
    })

    it("discards stale asynchronous item results", async () => {
        let resolveFirst!: (value: { id: string; label: string; value: string }[]) => void
        const source = vi.fn((query: string) => {
            if (query === "old") {
                return new Promise<{ id: string; label: string; value: string }[]>((resolve) => {
                    resolveFirst = resolve
                })
            }
            return Promise.resolve([{ id: query, label: query, value: query }])
        })

        void promptStore.open({ id: "async", initialQuery: "old", filter: "none", items: source })
        expect(promptStore.snapshot?.isLoading).toBe(true)
        promptStore.setQuery("new")
        await flush()
        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["new"])

        resolveFirst([{ id: "old", label: "old", value: "old" }])
        await flush()
        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["new"])
    })

    it("preserves the selected item when external results refresh", async () => {
        let items = [
            { id: "one", label: "One", value: 1 },
            { id: "two", label: "Two", value: 2 },
        ]
        void promptStore.open({ id: "refresh", filter: "none", items: () => items })
        await flush()
        promptStore.moveSelection(1)
        expect(promptStore.snapshot?.items[promptStore.snapshot.selectedIndex]?.id).toBe("two")

        items = [{ id: "zero", label: "Zero", value: 0 }, ...items]
        promptStore.refresh()
        await flush()
        expect(promptStore.snapshot?.items[promptStore.snapshot.selectedIndex]?.id).toBe("two")
    })

    it("exposes async item failures and clears loading", async () => {
        const onItemsError = vi.fn()
        void promptStore.open({
            id: "failing-options",
            items: async () => {
                throw new Error("load failed")
            },
            errorLabel: "Could not load",
            onItemsError,
        })
        await flush()

        expect(promptStore.snapshot?.isLoading).toBe(false)
        expect(promptStore.snapshot?.errorLabel).toBe("Could not load")
        expect(onItemsError).toHaveBeenCalledWith(expect.any(Error))
    })

    it("clears loading even when the items error callback throws", async () => {
        void promptStore.open({
            id: "throwing-error-callback",
            items: async () => {
                throw new Error("load failed")
            },
            onItemsError: () => {
                throw new Error("callback failed")
            },
        })
        await flush()

        expect(promptStore.snapshot?.isLoading).toBe(false)
        expect(promptStore.snapshot?.errorLabel).toBe(m.prompt_options_load_failed())
    })

    it("does not apply stale async errors after the query changes", async () => {
        let rejectFirst!: (error: Error) => void
        const items = (query: string) => {
            if (query === "old") {
                return new Promise<never[]>((_, reject) => {
                    rejectFirst = reject
                })
            }
            return Promise.resolve([{ id: "new", label: "New", value: "new" }])
        }
        void promptStore.open({ id: "stale-query-error", initialQuery: "old", items })
        promptStore.setQuery("new")
        await flush()
        rejectFirst(new Error("stale"))
        await flush()

        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["new"])
        expect(promptStore.snapshot?.errorLabel).toBeUndefined()
    })

    it("does not apply stale async errors to replacement requests", async () => {
        let rejectFirst!: (error: Error) => void
        void promptStore.open({
            id: "stale-error",
            items: () =>
                new Promise<never[]>((_, reject) => {
                    rejectFirst = reject
                }),
        })
        void promptStore.open({
            id: "replacement",
            items: () => [{ id: "ok", label: "OK", value: "ok" }],
        })
        rejectFirst(new Error("stale"))
        await flush()

        expect(promptStore.snapshot?.request.id).toBe("replacement")
        expect(promptStore.snapshot?.errorLabel).toBeUndefined()
    })

    it("clears a prior item error after a successful refresh", async () => {
        let shouldFail = true
        void promptStore.open({
            id: "recovering-options",
            items: async () => {
                if (shouldFail) throw new Error("failed")
                return [{ id: "ok", label: "OK", value: "ok" }]
            },
        })
        await flush()
        shouldFail = false
        promptStore.refresh()
        await flush()

        expect(promptStore.snapshot?.errorLabel).toBeUndefined()
        expect(promptStore.snapshot?.items).toHaveLength(1)
    })

    it("finds a localized item by its English alias", async () => {
        void promptStore.open({
            id: "localized-alias",
            initialQuery: "import book",
            items: () => [
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

        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["import"])
        promptStore.setQuery("импортировать")
        await flush()
        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["import"])
    })

    it("restores a suspended parent when navigating back from a child", async () => {
        let child!: Promise<string | undefined>
        const parent = promptStore.open({
            id: "parent",
            initialQuery: "commands",
            filter: "none",
            items: () => [
                { id: "one", label: "One", value: "one" },
                { id: "child", label: "Child", value: "child" },
            ],
            onSelect: async () => {
                child = promptStore.choose({
                    id: "child",
                    items: () => [{ id: "value", label: "Value", value: "value" }],
                })
                await child
            },
        })
        await flush()
        promptStore.moveSelection(1)
        const parentSnapshot = promptStore.snapshot
        void promptStore.selectCurrent()
        await flush()

        expect(promptStore.snapshot?.request.id).toBe("child")
        expect(promptStore.canNavigateBack).toBe(true)
        promptStore.navigateBack()

        await expect(child).resolves.toBeUndefined()
        expect(promptStore.snapshot).toBe(parentSnapshot)
        expect(promptStore.snapshot).toMatchObject({
            query: "commands",
            selectedIndex: 1,
        })
        expect(promptStore.snapshot?.items[1].id).toBe("child")
        expect(promptStore.isOpen).toBe(true)
        promptStore.close()
        await expect(parent).resolves.toBeUndefined()
    })

    it("does not navigate back while the child query is non-empty", async () => {
        let child!: Promise<string | undefined>
        void promptStore.open({
            id: "parent-nonempty",
            items: () => [{ id: "open", label: "Open", value: "open" }],
            onSelect: async () => {
                child = promptStore.choose({ id: "child-nonempty", items: () => [] })
                await child
            },
        })
        await flush()
        void promptStore.selectCurrent()
        await flush()
        promptStore.setQuery("x")

        expect(promptStore.canNavigateBack).toBe(false)
        promptStore.navigateBack()
        expect(promptStore.snapshot?.request.id).toBe("child-nonempty")
    })

    it("selecting a child completes and closes the suspended parent flow", async () => {
        let child!: Promise<string | undefined>
        const parent = promptStore.open({
            id: "parent-complete",
            items: () => [{ id: "open", label: "Open", value: "open" }],
            onSelect: async () => {
                child = promptStore.choose({
                    id: "child-complete",
                    items: () => [{ id: "done", label: "Done", value: "done" }],
                })
                await child
            },
        })
        await flush()
        void promptStore.selectCurrent()
        await flush()
        await promptStore.selectCurrent()

        await expect(child).resolves.toBe("done")
        await expect(parent).resolves.toBeUndefined()
        expect(promptStore.isOpen).toBe(false)
        expect(promptStore.canNavigateBack).toBe(false)
    })

    it("close resolves active and suspended sessions", async () => {
        let child!: Promise<string | undefined>
        const parent = promptStore.open({
            id: "parent-close",
            items: () => [{ id: "open", label: "Open", value: "open" }],
            onSelect: async () => {
                child = promptStore.choose({ id: "child-close", items: () => [] })
                await child
            },
        })
        await flush()
        void promptStore.selectCurrent()
        await flush()
        promptStore.close()

        await expect(child).resolves.toBeUndefined()
        await expect(parent).resolves.toBeUndefined()
        expect(promptStore.canNavigateBack).toBe(false)
    })

    it("does not let stale child results overwrite a restored parent", async () => {
        let resolveChild!: (items: { id: string; label: string; value: string }[]) => void
        let child!: Promise<string | undefined>
        void promptStore.open({
            id: "parent-stale-child",
            items: () => [{ id: "open", label: "Open", value: "open" }],
            onSelect: async () => {
                child = promptStore.choose({
                    id: "stale-child",
                    items: () =>
                        new Promise((resolve) => {
                            resolveChild = resolve
                        }),
                })
                await child
            },
        })
        await flush()
        void promptStore.selectCurrent()
        await flush()
        promptStore.navigateBack()
        resolveChild([{ id: "stale", label: "Stale", value: "stale" }])
        await flush()

        expect(promptStore.snapshot?.request.id).toBe("parent-stale-child")
        expect(promptStore.snapshot?.items.map(({ id }) => id)).toEqual(["open"])
    })

    it("parses free-form submissions", async () => {
        const result = promptStore.choose({
            id: "page",
            initialQuery: "12",
            items: () => [],
            parseQuery: (query) => Number(query),
        })
        await flush()
        await promptStore.selectCurrent()
        await expect(result).resolves.toBe(12)
    })
})
