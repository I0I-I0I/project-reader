export type ShortcutAction = {
    keys: string
    action: (event: KeyboardEvent) => void
    description: string
    preventDefault?: boolean
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

    public normalizeKeyString(keys: string): string {
        return keys.toLowerCase().split("+").sort().join("+")
    }

    public getEventString(event: KeyboardEvent): string {
        const parts: string[] = []
        if (event.ctrlKey) parts.push("ctrl")
        if (event.metaKey) parts.push("meta")
        if (event.altKey) parts.push("alt")
        if (event.shiftKey) parts.push("shift")
        parts.push(event.key.toLowerCase())
        return parts.sort().join("+")
    }

    public handleKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement
        if (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        ) {
            return
        }

        const pressedString = this.getEventString(event)
        const match = this.findAction(pressedString)

        if (match) {
            if (match.preventDefault !== false) event.preventDefault()
            match.action(event)
        }
    }
}

export const KEYMAP_CONTEXT_KEY = Symbol("keymap-context")
