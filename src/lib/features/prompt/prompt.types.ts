import type { Component } from "svelte"

export interface PromptOption<T> {
    id: string
    label: string
    englishLabel?: string
    description?: string
    englishDescription?: string
    category?: string
    keymap?: string | string[]
    value: T
    presentation?: {
        kind?: string
        // Renderers own their application-specific prop contracts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        leading?: Component<any>
        leadingProps?: Record<string, unknown>
    }
}

export type PromptSelectionBehavior = "close" | "keep-open"

export interface PromptSelectionControls {
    close(): void
    setQuery(query: string): void
}

export interface PromptRequest<T> {
    id: string
    placeholder?: string
    initialQuery?: string
    options: PromptOption<T>[] | ((query: string) => PromptOption<T>[] | Promise<PromptOption<T>[]>)
    filter?: "fuzzy" | "none"
    closeOnSelect?: boolean
    rememberQuery?: boolean
    initialSelection?: (options: PromptOption<T>[]) => number
    onQueryChange?: (query: string) => void
    parseQuery?: (query: string) => T | undefined
    onSelect?: (
        value: T,
        controls: PromptSelectionControls,
    ) => PromptSelectionBehavior | void | Promise<PromptSelectionBehavior | void>
    loadingLabel?: string
    emptyLabel?: string
    errorLabel?: string
    onOptionsError?: (error: unknown) => void
}

export interface PromptSnapshot<T = unknown> {
    request: PromptRequest<T>
    query: string
    options: PromptOption<T>[]
    selectedIndex: number
    isLoading: boolean
    errorLabel?: string
}
