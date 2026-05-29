import { getContext, setContext, onMount } from "svelte"

export type ShortcutAction = {
    keys: string
    action: (event: KeyboardEvent) => void
    description: string
    allowInInputs?: boolean
    category?: "commands" | "settings" | "navigation"
    subtitle?: () => string
}

export class KeymapNode {
    parent: KeymapNode | null = null
    bindings: Map<string, ShortcutAction> = new Map()

    constructor(parent: KeymapNode | null = null) {
        this.parent = parent
    }

    register(shortcut: ShortcutAction) {
        const normalizedKey = this.normalizeKeyString(shortcut.keys)
        if (this.bindings.has(normalizedKey)) {
            throw new Error(`Key ${shortcut.keys} is already registered`)
        }
        this.bindings.set(normalizedKey, shortcut)
        return () => this.bindings.delete(normalizedKey)
    }

    registerAll(shortcuts: ShortcutAction[]) {
        let registered = []
        for (const shortcut of shortcuts) {
            registered.push(this.register(shortcut))
        }
        return () => {
            for (const unregister of registered) {
                unregister()
            }
        }
    }

    findAction(keyString: string): ShortcutAction | null {
        const localMatch = this.bindings.get(keyString)
        if (localMatch) return localMatch
        if (this.parent) return this.parent.findAction(keyString)
        return null
    }

    getAllKeymaps(): ShortcutAction[] {
        const keymapsMap = new Map<string, ShortcutAction>()
        this.collectKeymaps(keymapsMap)
        return Array.from(keymapsMap.values())
    }

    private collectKeymaps(keymapsMap: Map<string, ShortcutAction>) {
        for (const [key, shortcut] of this.bindings.entries()) {
            if (!keymapsMap.has(key)) {
                keymapsMap.set(key, shortcut)
            }
        }
        if (this.parent) {
            this.parent.collectKeymaps(keymapsMap)
        }
    }

    public isAncestorOf(other: KeymapNode | null): boolean {
        let current = other
        while (current) {
            if (current === this) return true
            current = current.parent
        }
        return false
    }

    public normalizeKeyString(keys: string): string {
        const lowerKeys = keys.toLowerCase()
        let parts: string[]
        if (lowerKeys === "+") {
            parts = ["+"]
        } else if (lowerKeys.endsWith("++")) {
            const base = lowerKeys.slice(0, -2)
            parts = [...base.split("+"), "+"]
        } else {
            parts = lowerKeys.split("+")
        }
        return parts
            .map((k) => (k === " " || k === "spacebar" ? "space" : k))
            .sort()
            .join("+")
    }

    public getEventString(event: KeyboardEvent): string {
        const parts: string[] = []
        if (event.ctrlKey) parts.push("ctrl")
        if (event.metaKey) parts.push("meta")
        if (event.altKey) parts.push("alt")
        if (event.shiftKey) parts.push("shift")
        const key =
            event.key === " " || event.key === "Spacebar" ? "space" : event.key.toLowerCase()
        parts.push(key)
        return parts.sort().join("+")
    }

    public handleKeydown(event: KeyboardEvent) {
        const pressedString = this.getEventString(event)
        let match = this.findAction(pressedString)

        if (!match) {
            const keyLower = event.key.toLowerCase()
            if (keyLower !== pressedString) {
                match = this.findAction(keyLower)
            }
        }

        if (match) {
            const target = event.target as HTMLElement
            const isInput =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable

            if (isInput && !match.allowInInputs) {
                return
            }

            match.action(event)
        }
    }
}

export const KEYMAP_CONTEXT_KEY = Symbol("keymap-context")

export function useKeymap(shortcuts: ShortcutAction[], overrideParent?: KeymapNode | null) {
    const parentNode =
        overrideParent !== undefined ? overrideParent : getContext<KeymapNode>(KEYMAP_CONTEXT_KEY)
    const node = new KeymapNode(parentNode)
    setContext(KEYMAP_CONTEXT_KEY, node)

    const setActiveNode = getContext<(node: KeymapNode | null) => void>("set_active_keymap_node")
    const getActiveNode = getContext<(() => KeymapNode | null) | undefined>(
        "get_active_keymap_node",
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
        const unregisterAll = node.registerAll(shortcuts)
        return () => {
            unregisterAll()
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
