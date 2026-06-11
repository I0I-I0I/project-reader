import { getContext, setContext, onMount } from "svelte"

export interface SearchItem {
    id: string
    title: string
    subtitle?: string
    category: "books" | "commands" | "settings" | "navigation" | "menu"
    keys?: string | string[]
    action: () => void
    pageNumber?: number
    englishTitle?: string
    englishSubtitle?: string
}

export type PromptProvider = (context: { value: string; mode: string }) => SearchItem[]

export class PromptNode {
    parent = $state.raw<PromptNode | null>(null)
    providers = $state.raw<PromptProvider[]>([])

    constructor(parent: PromptNode | null = null) {
        this.parent = parent
    }

    register(provider: PromptProvider) {
        this.providers = [...this.providers, provider]
        return () => {
            this.providers = this.providers.filter((p) => p !== provider)
        }
    }

    getAllItems(context: { value: string; mode: string }): SearchItem[] {
        let items: SearchItem[] = []
        for (const provider of this.providers) {
            items = [...items, ...provider(context)]
        }
        if (this.parent) {
            items = [...items, ...this.parent.getAllItems(context)]
        }
        return items
    }

    public isAncestorOf(other: PromptNode | null): boolean {
        let current = other
        while (current) {
            if (current === this) return true
            current = current.parent
        }
        return false
    }
}

export const PROMPT_CONTEXT_KEY = Symbol("prompt-context")

export function usePrompt(provider: PromptProvider, overrideParent?: PromptNode | null) {
    const parentNode =
        overrideParent !== undefined ? overrideParent : getContext<PromptNode>(PROMPT_CONTEXT_KEY)
    const node = new PromptNode(parentNode)
    setContext(PROMPT_CONTEXT_KEY, node)

    const setActiveNode = getContext<(node: PromptNode | null) => void>("set_active_prompt_node")
    const getActiveNode = getContext<(() => PromptNode | null) | undefined>(
        "get_active_prompt_node",
    )

    onMount(() => {
        if (setActiveNode) {
            if (getActiveNode) {
                const currentActive = getActiveNode()
                if (!currentActive || !node.isAncestorOf(currentActive)) {
                    setActiveNode(node)
                }
            } else {
                setActiveNode(node)
            }
        }
        const unregister = node.register(provider)
        return () => {
            unregister()
            if (setActiveNode) {
                if (getActiveNode) {
                    const currentActive = getActiveNode()
                    if (currentActive === node) {
                        setActiveNode(parentNode)
                    }
                } else {
                    setActiveNode(parentNode)
                }
            }
        }
    })

    return node
}
