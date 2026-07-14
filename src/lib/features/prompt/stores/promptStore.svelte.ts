import Fuse from "fuse.js"
import type {
    PromptOption,
    PromptRequest,
    PromptSelectionBehavior,
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
    sourceOptions: PromptOption<unknown>[]
    resolve: (value: unknown) => void
}

class PromptStore {
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
                sourceOptions: [],
                resolve,
            }
            this.manualSelectedIndex = null
            this.snapshot = {
                request: request as ErasedRequest,
                query,
                options: [],
                selectedIndex: -1,
                isLoading: typeof request.options === "function",
            }
            void this.refreshOptions(query)
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
        void this.refreshOptions(query)
    }

    refresh() {
        if (!this.snapshot) return
        void this.refreshOptions(this.snapshot.query)
    }

    moveSelection(offset: number) {
        const snapshot = this.snapshot
        if (!snapshot || snapshot.options.length === 0) return
        const current = snapshot.selectedIndex < 0 ? 0 : snapshot.selectedIndex
        this.manualSelectedIndex =
            (current + offset + snapshot.options.length) % snapshot.options.length
        this.snapshot = { ...snapshot, selectedIndex: this.manualSelectedIndex }
    }

    async selectCurrent(): Promise<void> {
        const session = this.session
        const snapshot = this.snapshot
        if (!session || !snapshot) return

        const parsed = session.request.parseQuery?.(snapshot.query)
        const selected = snapshot.options[snapshot.selectedIndex]
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

    private async refreshOptions(query: string) {
        const session = this.session
        const snapshot = this.snapshot
        if (!session || !snapshot) return
        const version = ++this.requestVersion
        const selectedOptionId = snapshot.options[snapshot.selectedIndex]?.id
        const source = session.request.options
        if (typeof source === "function") {
            this.snapshot = { ...snapshot, isLoading: true, errorLabel: undefined }
        }

        let resolved: PromptOption<unknown>[]
        try {
            resolved = await Promise.resolve(typeof source === "function" ? source(query) : source)
        } catch (error) {
            if (version !== this.requestVersion || session !== this.session || !this.snapshot)
                return
            this.snapshot = {
                ...this.snapshot,
                options: [],
                selectedIndex: -1,
                isLoading: false,
                errorLabel: session.request.errorLabel ?? m.prompt_options_load_failed(),
            }
            try {
                session.request.onOptionsError?.(error)
            } catch {
                // Error callbacks are observational and must not break Prompt recovery.
            }
            return
        }
        if (version !== this.requestVersion || session !== this.session || !this.snapshot) return
        session.sourceOptions = resolved

        let options = resolved
        if (session.request.filter !== "none" && query.trim()) {
            options = new Fuse(resolved, PROMPT_FUSE_OPTIONS)
                .search(query.trim())
                .map(({ item }) => item)
        }

        let automaticIndex = options.length > 0 ? 0 : -1
        if (this.manualSelectedIndex === null && session.request.initialSelection) {
            automaticIndex = session.request.initialSelection(options)
        }
        const preservedSelection = selectedOptionId
            ? options.findIndex((option) => option.id === selectedOptionId)
            : -1
        const selectedIndex =
            options.length === 0
                ? -1
                : this.manualSelectedIndex !== null && preservedSelection >= 0
                  ? preservedSelection
                  : this.manualSelectedIndex !== null && this.manualSelectedIndex < options.length
                    ? this.manualSelectedIndex
                    : Math.max(0, Math.min(automaticIndex, options.length - 1))

        this.snapshot = {
            ...this.snapshot,
            options,
            selectedIndex,
            isLoading: false,
            errorLabel: undefined,
        }
    }
}

export const promptStore = new PromptStore()

export type { PromptOption, PromptRequest, PromptSelectionBehavior, PromptSnapshot }
