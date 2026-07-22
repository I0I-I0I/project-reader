import { describe, expect, it, vi } from "vitest"
import { CommandScope, CommandsStore } from "./commandsStore.svelte"
import { defineCommands } from "./commands.types"

describe("typed commands", () => {
    it("executes typed payloads and reports unavailable commands", async () => {
        const store = new CommandsStore()
        const run = vi.fn()
        store.register(
            store.root,
            defineCommands({
                "settings.theme": {
                    id: "settings.theme",
                    label: () => "Theme",
                    category: "settings",
                    run,
                },
            }),
        )

        await expect(store.execute("settings.theme", { value: "dark" })).resolves.toEqual({
            status: "executed",
            id: "settings.theme",
        })
        expect(run).toHaveBeenCalledWith({ value: "dark" })
        await expect(store.execute("viewer.page.next")).resolves.toEqual({
            status: "unavailable",
            id: "viewer.page.next",
        })
    })

    it("uses the nearest enabled override and falls back past a disabled child", async () => {
        const parentRun = vi.fn()
        const childRun = vi.fn()
        const parent = new CommandScope()
        parent.registerAll(
            Object.values(
                defineCommands({
                    "viewer.page.next": {
                        id: "viewer.page.next",
                        label: () => "Next",
                        category: "navigation",
                        keymap: "n",
                        run: parentRun,
                    },
                }),
            ),
        )
        const child = new CommandScope(parent)
        child.registerAll(
            Object.values(
                defineCommands({
                    "viewer.page.next": {
                        id: "viewer.page.next",
                        label: () => "Next override",
                        category: "navigation",
                        keymap: "n",
                        disabled: () => true,
                        run: childRun,
                    },
                }),
            ),
        )

        expect(child.listActive().map(({ id }) => id)).toEqual(["viewer.page.next"])
        await child.execute("viewer.page.next")
        expect(parentRun).toHaveBeenCalledOnce()
        expect(childRun).not.toHaveBeenCalled()
    })

    it("resolves targeted shortcuts without materializing unrelated metadata", () => {
        const scope = new CommandScope()
        const targetDisabled = vi.fn(() => false)
        const unrelatedDisabled = vi.fn(() => false)
        const targetLabel = vi.fn(() => "Next")
        const unrelatedLabel = vi.fn(() => "Previous")
        const subtitle = vi.fn(() => "Subtitle")
        scope.registerAll(
            Object.values(
                defineCommands({
                    "viewer.page.next": {
                        id: "viewer.page.next",
                        label: targetLabel,
                        subtitle,
                        category: "navigation",
                        keymap: "n",
                        disabled: targetDisabled,
                        run: () => {},
                    },
                    "viewer.page.previous": {
                        id: "viewer.page.previous",
                        label: unrelatedLabel,
                        category: "navigation",
                        keymap: "p",
                        disabled: unrelatedDisabled,
                        run: () => {},
                    },
                }),
            ),
        )

        vi.clearAllMocks()
        expect(scope.getShortcut("viewer.page.next")).toBe("n")
        expect(targetDisabled).toHaveBeenCalledOnce()
        expect(unrelatedDisabled).not.toHaveBeenCalled()
        expect(targetLabel).not.toHaveBeenCalled()
        expect(unrelatedLabel).not.toHaveBeenCalled()
        expect(subtitle).not.toHaveBeenCalled()
    })

    it("does not check availability twice during direct execution", async () => {
        const scope = new CommandScope()
        const disabled = vi.fn(() => false)
        scope.register(
            defineCommands({
                "viewer.page.next": {
                    id: "viewer.page.next",
                    label: () => "Next",
                    category: "navigation",
                    disabled,
                    run: () => {},
                },
            })["viewer.page.next"],
        )

        await scope.execute("viewer.page.next")
        expect(disabled).toHaveBeenCalledOnce()
    })

    it("rejects duplicate IDs and normalized keys within one scope", () => {
        const scope = new CommandScope()
        const first = defineCommands({
            "viewer.page.next": {
                id: "viewer.page.next",
                label: () => "Next",
                category: "navigation",
                keymap: "Shift+N",
                run: () => {},
            },
        })["viewer.page.next"]
        scope.register(first)

        expect(() => scope.register(first)).toThrow(/already registered/)
        expect(() =>
            scope.register(
                defineCommands({
                    "viewer.page.previous": {
                        id: "viewer.page.previous",
                        label: () => "Previous",
                        category: "navigation",
                        keymap: "n+shift",
                        run: () => {},
                    },
                })["viewer.page.previous"],
            ),
        ).toThrow(/Key n\+shift is already registered/)
    })

    it("applies input eligibility and default prevention in the keyboard adapter", async () => {
        const store = new CommandsStore()
        const run = vi.fn()
        store.root.register(
            defineCommands({
                "viewer.search": {
                    id: "viewer.search",
                    label: () => "Search",
                    category: "commands",
                    keymap: "/",
                    run,
                },
            })["viewer.search"],
        )
        const preventDefault = vi.fn()
        const event = {
            key: "/",
            code: "Slash",
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            target: { tagName: "INPUT", isContentEditable: false },
            preventDefault,
        } as unknown as KeyboardEvent

        await store.handleKeydown(event, store.root)
        expect(run).not.toHaveBeenCalled()
        expect(preventDefault).not.toHaveBeenCalled()
    })

    it("checks key eligibility before preventing the browser default", async () => {
        const store = new CommandsStore()
        const run = vi.fn()
        store.root.register(
            defineCommands({
                "viewer.sidebar.close": {
                    id: "viewer.sidebar.close",
                    label: () => "Close sidebar",
                    category: "navigation",
                    keymap: ["q", "escape"],
                    allowInInputs: true,
                    shouldHandleKey: (event) => event.key !== "q",
                    run,
                },
            })["viewer.sidebar.close"],
        )
        const createEvent = (key: string) =>
            ({
                key,
                code: key === "q" ? "KeyQ" : "Escape",
                ctrlKey: false,
                metaKey: false,
                altKey: false,
                shiftKey: false,
                target: { tagName: "INPUT", isContentEditable: false },
                preventDefault: vi.fn(),
            }) as unknown as KeyboardEvent
        const rejectedEvent = createEvent("q")
        const acceptedEvent = createEvent("Escape")

        await store.handleKeydown(rejectedEvent, store.root)
        await store.handleKeydown(acceptedEvent, store.root)

        expect(rejectedEvent.preventDefault).not.toHaveBeenCalled()
        expect(acceptedEvent.preventDefault).toHaveBeenCalledOnce()
        expect(run).toHaveBeenCalledOnce()
    })

    it("falls back past disabled child keymaps to enabled parent commands", async () => {
        const store = new CommandsStore()
        const parentRun = vi.fn()
        const childRun = vi.fn()
        store.root.register(
            defineCommands({
                "viewer.scroll.step": {
                    id: "viewer.scroll.step",
                    label: () => "Scroll",
                    category: "navigation",
                    keymap: "j",
                    run: parentRun,
                },
            })["viewer.scroll.step"],
        )
        const child = store.createScope(store.root)
        child.register(
            defineCommands({
                "viewer.list.next": {
                    id: "viewer.list.next",
                    label: () => "Next item",
                    category: "navigation",
                    keymap: "j",
                    disabled: () => true,
                    run: childRun,
                },
            })["viewer.list.next"],
        )
        const event = {
            key: "j",
            code: "KeyJ",
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            target: { tagName: "BUTTON", isContentEditable: false },
            preventDefault: vi.fn(),
        } as unknown as KeyboardEvent

        await store.handleKeydown(event, child)

        expect(event.preventDefault).toHaveBeenCalledOnce()
        expect(childRun).not.toHaveBeenCalled()
        expect(parentRun).toHaveBeenCalledOnce()
    })

    it("isolates modal keyboard scopes while preserving typed parent execution", async () => {
        const store = new CommandsStore()
        const parentRun = vi.fn()
        store.root.register(
            defineCommands({
                "prompt.open": {
                    id: "prompt.open",
                    label: () => "Open commands",
                    category: "commands",
                    keymap: "ctrl+k",
                    allowInInputs: true,
                    run: parentRun,
                },
            })["prompt.open"],
        )
        const modalScope = store.createScope(store.root, { keyboardBoundary: true })
        const event = {
            key: "k",
            code: "KeyK",
            ctrlKey: true,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            target: { tagName: "INPUT", isContentEditable: false },
            preventDefault: vi.fn(),
        } as unknown as KeyboardEvent

        await store.handleKeydown(event, modalScope)
        expect(parentRun).not.toHaveBeenCalled()
        expect(event.preventDefault).not.toHaveBeenCalled()

        await modalScope.execute("prompt.open")
        expect(parentRun).toHaveBeenCalledOnce()
    })

    it("omits palette-ineligible commands without disabling typed execution", async () => {
        const scope = new CommandScope()
        const run = vi.fn()
        scope.register(
            defineCommands({
                "library.node.relink": {
                    id: "library.node.relink",
                    label: () => "Relink",
                    category: "commands",
                    palette: false,
                    run,
                },
            })["library.node.relink"],
        )

        expect(scope.listPaletteCommands()).toEqual([])
        await scope.execute("library.node.relink", { nodeId: "book" })
        expect(run).toHaveBeenCalledWith({ nodeId: "book" })
    })

    it("invalidates inherited handles when their owning parent scope is destroyed", async () => {
        const parent = new CommandScope()
        const child = new CommandScope(parent)
        const run = vi.fn()
        parent.register(
            defineCommands({
                "viewer.close": {
                    id: "viewer.close",
                    label: () => "Close viewer",
                    category: "commands",
                    run,
                },
            })["viewer.close"],
        )
        const handle = child.get("viewer.close")
        parent.destroy()

        await expect(handle?.execute()).resolves.toEqual({
            status: "unavailable",
            id: "viewer.close",
        })
        expect(run).not.toHaveBeenCalled()
    })

    it("invalidates command-palette handles when their captured scope is destroyed", async () => {
        const scope = new CommandScope()
        const run = vi.fn()
        scope.register(
            defineCommands({
                "viewer.close": {
                    id: "viewer.close",
                    label: () => "Close viewer",
                    category: "commands",
                    run,
                },
            })["viewer.close"],
        )
        const handle = scope.get("viewer.close")
        scope.destroy()

        await expect(handle?.execute()).resolves.toEqual({
            status: "unavailable",
            id: "viewer.close",
        })
        expect(run).not.toHaveBeenCalled()
    })

    it("keeps async failures observable", async () => {
        const scope = new CommandScope()
        scope.register(
            defineCommands({
                "viewer.close": {
                    id: "viewer.close",
                    label: () => "Close viewer",
                    category: "commands",
                    run: async () => {
                        throw new Error("close failed")
                    },
                },
            })["viewer.close"],
        )
        await expect(scope.execute("viewer.close")).rejects.toThrow("close failed")
    })
})
