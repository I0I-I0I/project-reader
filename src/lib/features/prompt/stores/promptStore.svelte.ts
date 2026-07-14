import Fuse from "fuse.js"
import type {
    PromptItem,
    PromptRequest,
    PromptService,
    PromptSnapshot,
} from "$lib/features/prompt/prompt.types"
import * as m from "$lib/paraglide/messages"

const PROMPT_FUSE_OPTIONS = {
    keys: [
        { name: "label", weight: 0.7 },
        { name: "englishLabel", weight: 0.6 },
        { name: "description", weight: 0.3 },
        { name: "englishDescription", weight: 0.2 },
        { name: "category", weight: 0.1 },
    ],
    threshold: 0.4,
}

type ErasedRequest = PromptRequest<unknown>
type SessionKind = "open" | "choose"
type Session = {
    request: ErasedRequest
    kind: SessionKind
    sourceItems: PromptItem<unknown>[]
    resolve: (value: unknown) => void
}

class PromptStore implements PromptService {
    snapshot = $state.raw<PromptSnapshot | null>(null)
    private session: Session | null = null
    private retainedQueries = new Map<string, string>()
    private requestVersion = 0
    private manualSelectedIndex: number | null = null

    get isOpen() {
        return this.snapshot !== null
    }

    open<T>(request: PromptRequest<T>): Promise<void> {
        return this.start(request, "open") as Promise<void>
    }

    choose<T>(request: PromptRequest<T>): Promise<T | undefined> {
        return this.start(request, "choose") as Promise<T | undefined>
    }

    private start<T>(request: PromptRequest<T>, kind: SessionKind): Promise<unknown> {
        this.cancelCurrent()
        const query =
            request.initialQuery ??
            (request.rememberQuery ? this.retainedQueries.get(request.id) : undefined) ??
            ""

        return new Promise<unknown>((resolve) => {
            this.session = {
                request: request as ErasedRequest,
                kind,
                sourceItems: [],
                resolve,
            }
            this.manualSelectedIndex = null
            this.snapshot = {
                request: request as ErasedRequest,
                query,
                items: [],
                selectedIndex: -1,
                isLoading: true,
            }
            void this.refreshItems(query)
        })
    }

    close() {
        this.cancelCurrent()
    }

    private cancelCurrent(value?: unknown) {
        this.requestVersion += 1
        const session = this.session
        if (!session) {
            this.snapshot = null
            return
        }
        if (session.request.rememberQuery && this.snapshot) {
            this.retainedQueries.set(session.request.id, this.snapshot.query)
        }
        this.session = null
        this.snapshot = null
        session.resolve(session.kind === "choose" ? value : undefined)
    }

    setQuery(query: string) {
        const session = this.session
        const snapshot = this.snapshot
        if (!session || !snapshot) return
        this.manualSelectedIndex = null
        this.snapshot = { ...snapshot, query, selectedIndex: -1 }
        session.request.onQueryChange?.(query)
        void this.refreshItems(query)
    }

    refresh() {
        if (!this.snapshot) return
        void this.refreshItems(this.snapshot.query)
    }

    moveSelection(offset: number) {
        const snapshot = this.snapshot
        if (!snapshot || snapshot.items.length === 0) return
        const current = snapshot.selectedIndex < 0 ? 0 : snapshot.selectedIndex
        this.manualSelectedIndex =
            (current + offset + snapshot.items.length) % snapshot.items.length
        this.snapshot = { ...snapshot, selectedIndex: this.manualSelectedIndex }
    }

    async selectCurrent(): Promise<void> {
        const session = this.session
        const snapshot = this.snapshot
        if (!session || !snapshot) return

        const parsed = session.request.parseQuery?.(snapshot.query)
        const selected = snapshot.items[snapshot.selectedIndex]
        const value = parsed ?? selected?.value
        if (value === undefined) return

        const closeBeforeSelect = session.request.closeOnSelect !== false
        if (session.kind === "choose") {
            this.cancelCurrent(value)
            return
        }

        const controls = {
            close: () => this.close(),
            setQuery: (query: string) => this.setQuery(query),
        }
        if (closeBeforeSelect) this.cancelCurrent()
        const behavior = (await session.request.onSelect?.(value, controls)) ?? "close"
        if (!closeBeforeSelect && behavior === "close") this.close()
    }

    private async refreshItems(query: string) {
        const session = this.session
        const snapshot = this.snapshot
        if (!session || !snapshot) return
        const version = ++this.requestVersion
        const selectedItemId = snapshot.items[snapshot.selectedIndex]?.id
        const provider = session.request.items
        this.snapshot = { ...snapshot, isLoading: true, errorLabel: undefined }

        let resolved: PromptItem<unknown>[]
        try {
            resolved = await Promise.resolve(provider(query))
        } catch (error) {
            if (version !== this.requestVersion || session !== this.session || !this.snapshot)
                return
            this.snapshot = {
                ...this.snapshot,
                items: [],
                selectedIndex: -1,
                isLoading: false,
                errorLabel: session.request.errorLabel ?? m.prompt_options_load_failed(),
            }
            try {
                session.request.onItemsError?.(error)
            } catch {
                // Error callbacks are observational and must not break Prompt recovery.
            }
            return
        }
        if (version !== this.requestVersion || session !== this.session || !this.snapshot) return
        session.sourceItems = resolved

        let items = resolved
        if (session.request.filter !== "none" && query.trim()) {
            items = new Fuse(resolved, PROMPT_FUSE_OPTIONS)
                .search(query.trim())
                .map(({ item }) => item)
        }

        let automaticIndex = items.length > 0 ? 0 : -1
        if (this.manualSelectedIndex === null && session.request.initialSelection) {
            automaticIndex = session.request.initialSelection(items)
        }
        const preservedSelection = selectedItemId
            ? items.findIndex((item) => item.id === selectedItemId)
            : -1
        const selectedIndex =
            items.length === 0
                ? -1
                : this.manualSelectedIndex !== null && preservedSelection >= 0
                  ? preservedSelection
                  : this.manualSelectedIndex !== null && this.manualSelectedIndex < items.length
                    ? this.manualSelectedIndex
                    : Math.max(0, Math.min(automaticIndex, items.length - 1))

        this.snapshot = {
            ...this.snapshot,
            items,
            selectedIndex,
            isLoading: false,
            errorLabel: undefined,
        }
    }
}

export const promptStore = new PromptStore()

export type {
    PromptItem,
    PromptItems,
    PromptRequest,
    PromptSelectionBehavior,
    PromptService,
    PromptSnapshot,
} from "$lib/features/prompt/prompt.types"
