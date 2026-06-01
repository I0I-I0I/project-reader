import { getContext, setContext, onMount } from "svelte"
import { SvelteMap } from "svelte/reactivity"

export type ShortcutAction = {
    id?: string // Unique identifier for dynamic lookup
    keys: string
    action: (event: KeyboardEvent) => void
    description: string
    allowInInputs?: boolean
    category?: "commands" | "settings" | "navigation" | "menu"
    subtitle?: () => string
}

const CODE_TO_KEY: Record<string, string> = {
    Digit1: "1",
    Digit2: "2",
    Digit3: "3",
    Digit4: "4",
    Digit5: "5",
    Digit6: "6",
    Digit7: "7",
    Digit8: "8",
    Digit9: "9",
    Digit0: "0",
    KeyA: "a",
    KeyB: "b",
    KeyC: "c",
    KeyD: "d",
    KeyE: "e",
    KeyF: "f",
    KeyG: "g",
    KeyH: "h",
    KeyI: "i",
    KeyJ: "j",
    KeyK: "k",
    KeyL: "l",
    KeyM: "m",
    KeyN: "n",
    KeyO: "o",
    KeyP: "p",
    KeyQ: "q",
    KeyR: "r",
    KeyS: "s",
    KeyT: "t",
    KeyU: "u",
    KeyV: "v",
    KeyW: "w",
    KeyX: "x",
    KeyY: "y",
    KeyZ: "z",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Semicolon: ";",
    Quote: "'",
    Backquote: "`",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    Enter: "enter",
    Escape: "escape",
    Space: "space",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    PageUp: "pageup",
    PageDown: "pagedown",
}

export class KeymapNode {
    parent = $state<KeymapNode | null>(null)
    bindings = new SvelteMap<string, ShortcutAction>()

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

    public getEventString(event: KeyboardEvent, useCode: boolean = false): string {
        const parts: string[] = []
        if (event.ctrlKey) parts.push("ctrl")
        if (event.metaKey) parts.push("meta")
        if (event.altKey) parts.push("alt")
        if (event.shiftKey) parts.push("shift")

        let key: string
        if (useCode) {
            key = CODE_TO_KEY[event.code] || event.key.toLowerCase()
        } else {
            key = event.key === " " || event.key === "Spacebar" ? "space" : event.key.toLowerCase()
        }

        parts.push(key)
        return parts.sort().join("+")
    }

    public handleKeydown(event: KeyboardEvent) {
        // 1. Try physical mapping (event.code) - for layout independence (e.g. Russian)
        const pressedPhysical = this.getEventString(event, true)
        let match = this.findAction(pressedPhysical)

        // 2. Try character mapping (event.key) - for literal shortcuts like '?' or '/'
        if (!match) {
            const pressedCharacter = this.getEventString(event, false)
            if (pressedCharacter !== pressedPhysical) {
                match = this.findAction(pressedCharacter)
            }
        }

        // 3. Fallback to just the key character
        if (!match) {
            const keyLower = event.key.toLowerCase()
            if (keyLower !== event.code.toLowerCase()) {
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

export function getRawShortcutHint(keymapNode: KeymapNode | null, id: string): string {
    if (!keymapNode) return ""
    const keymaps = keymapNode.getAllKeymaps()
    const actions = keymaps.filter((a) => a.id === id)
    if (actions.length === 0) return ""

    const primaryAction = actions.reduce((best, current) => {
        if (current.keys.includes("arrow")) return current
        return best.keys.length <= current.keys.length ? best : current
    })

    return formatKeyString(primaryAction.keys)
}

export function getShortcutHint(keymapNode: KeymapNode | null, id: string): string {
    const raw = getRawShortcutHint(keymapNode, id)
    return raw ? ` [${raw}]` : ""
}

export function formatKeyString(keys: string): string {
    return keys
        .split("+")
        .map((part) => {
            const lower = part.toLowerCase().trim()
            if (lower === "arrowleft") return "←"
            if (lower === "arrowright") return "→"
            if (lower === "arrowup") return "↑"
            if (lower === "arrowdown") return "↓"
            if (lower === "ctrl") return "Ctrl"
            if (lower === "shift") return "Shift"
            if (lower === "alt") return "Alt"
            if (lower === "space") return "Space"
            if (lower === "escape") return "Esc"
            return part.toUpperCase()
        })
        .join("+")
}
