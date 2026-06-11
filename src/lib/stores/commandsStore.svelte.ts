import { getContext, setContext, onMount } from "svelte"

export type Command = {
    id?: string
    keys?: string | string[]
    action: (event: KeyboardEvent) => void
    description: string
    englishDescription?: string
    allowInInputs?: boolean
    category?: "commands" | "settings" | "navigation" | "menu" | "books"
    subtitle?: () => string
    preventDefault?: boolean
    disabled?: boolean | (() => boolean)
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

export class KeyboardHandler {
    static isMac(): boolean {
        if (typeof window === "undefined") return false
        const platform = (navigator as any).userAgentData?.platform || navigator.platform || ""
        return /Mac|iPod|iPhone|iPad/i.test(platform) || /Macintosh/i.test(navigator.userAgent)
    }

    static normalize(keys: string): string {
        let trimmedKeys = keys.trim()
        if (trimmedKeys === "") {
            if (keys === " ") return "space"
            return ""
        }

        let parts: string[]
        const lowerKeys = trimmedKeys.toLowerCase()
        if (lowerKeys === "+") {
            parts = ["+"]
        } else if (lowerKeys.endsWith("+")) {
            let base = lowerKeys.slice(0, -1).trim()
            if (base.endsWith("+")) {
                base = base.slice(0, -1).trim()
            }
            parts = [...base.split("+"), "+"]
        } else {
            parts = lowerKeys.split("+")
        }

        const isMacPlatform = KeyboardHandler.isMac()
        return parts
            .map((k) => {
                const trimmed = k.trim()
                if (trimmed === "mod") {
                    return isMacPlatform ? "meta" : "ctrl"
                }
                if (trimmed === "space" || trimmed === "spacebar") {
                    return "space"
                }
                return trimmed
            })
            .filter(Boolean)
            .sort()
            .join("+")
    }

    static fromEvent(event: KeyboardEvent, useCode: boolean): string {
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

    static matches(event: KeyboardEvent, keys: string | string[]): boolean {
        if (Array.isArray(keys)) {
            return keys.some((k) => KeyboardHandler.matches(event, k))
        }
        const normalizedTarget = KeyboardHandler.normalize(keys)

        // 1. Try physical mapping (event.code) - for layout independence (e.g. Russian)
        const pressedPhysical = KeyboardHandler.fromEvent(event, true)
        if (pressedPhysical === normalizedTarget) {
            return true
        }

        // 2. Try character mapping (event.key) - for literal shortcuts like '?' or '/'
        const pressedCharacter = KeyboardHandler.fromEvent(event, false)
        if (pressedCharacter === normalizedTarget) {
            return true
        }

        // 3. Fallback to just the key character if no modifiers are pressed
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            const isShiftLetter =
                event.shiftKey && event.key.toLowerCase() !== event.key.toUpperCase()
            if (!isShiftLetter) {
                const keyLower = event.key.toLowerCase()
                const singleKey = keyLower === " " || keyLower === "spacebar" ? "space" : keyLower

                // If Shift is pressed, we should not fall back to the unshifted version of a named key
                // (like "space", "enter", "arrowup", etc.) since Shift acts as a distinct modifier for them.
                const isShiftNamedKey = event.shiftKey && singleKey.length > 1

                if (!isShiftNamedKey && singleKey === normalizedTarget) {
                    return true
                }
            }
        }

        return false
    }

    static format(keys: string | string[]): string {
        if (Array.isArray(keys)) {
            return keys.map((k) => KeyboardHandler.format(k)).join("/")
        }
        const isMacPlatform = KeyboardHandler.isMac()
        const MODIFIERS = ["ctrl", "meta", "mod", "alt", "shift"]
        const parts = keys.split("+")
        parts.sort((a, b) => {
            const aLower = a.toLowerCase().trim()
            const bLower = b.toLowerCase().trim()
            const aIdx = MODIFIERS.indexOf(aLower)
            const bIdx = MODIFIERS.indexOf(bLower)

            if (aIdx !== -1 && bIdx !== -1) {
                return aIdx - bIdx
            }
            if (aIdx !== -1) {
                return -1
            }
            if (bIdx !== -1) {
                return 1
            }
            return aLower.localeCompare(bLower)
        })
        return parts
            .map((part) => {
                const lower = part.toLowerCase().trim()
                if (lower === "arrowleft") return "←"
                if (lower === "arrowright") return "→"
                if (lower === "arrowup") return "↑"
                if (lower === "arrowdown") return "↓"
                if (lower === "ctrl") return "Ctrl"
                if (lower === "meta") return isMacPlatform ? "⌘" : "Win"
                if (lower === "mod") return isMacPlatform ? "⌘" : "Ctrl"
                if (lower === "shift") return "Shift"
                if (lower === "alt") return isMacPlatform ? "⌥" : "Alt"
                if (lower === "space") return "Space"
                if (lower === "escape") return "Esc"
                return part.toUpperCase()
            })
            .join("+")
    }
}

export class CommandRegistry {
    parent = $state.raw<CommandRegistry | null>(null)
    commands = $state.raw<Command[]>([])

    get allCommands(): Command[] {
        const list: Command[] = []
        const seenIds = new Set<string>()
        const seenKeys = new Set<string>()
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current: CommandRegistry | null = this
        while (current) {
            for (const command of current.commands) {
                const id = command.id || command.description
                if (seenIds.has(id)) {
                    continue
                }
                seenIds.add(id)

                if (command.keys) {
                    const cmdKeys = Array.isArray(command.keys) ? command.keys : [command.keys]
                    const remainingKeys = cmdKeys.filter(
                        (k) => !seenKeys.has(KeyboardHandler.normalize(k)),
                    )
                    if (remainingKeys.length === 0) {
                        list.push({ ...command, keys: undefined })
                    } else {
                        remainingKeys.forEach((k) => seenKeys.add(KeyboardHandler.normalize(k)))
                        list.push({
                            ...command,
                            keys: Array.isArray(command.keys) ? remainingKeys : remainingKeys[0],
                        })
                    }
                } else {
                    list.push(command)
                }
            }
            current = current.parent
        }
        return list
    }

    constructor(parent: CommandRegistry | null = null) {
        this.parent = parent
    }

    register(command: Command) {
        if (command.keys) {
            const cmdKeys = Array.isArray(command.keys) ? command.keys : [command.keys]
            for (const key of cmdKeys) {
                const normalizedKey = KeyboardHandler.normalize(key)
                const existing = this.commands.find((c) => {
                    if (!c.keys) return false
                    const cKeys = Array.isArray(c.keys) ? c.keys : [c.keys]
                    return cKeys.some((ck) => KeyboardHandler.normalize(ck) === normalizedKey)
                })
                if (existing) {
                    throw new Error(`Key ${key} is already registered on this registry node`)
                }
            }
        }
        this.commands = [...this.commands, command]
        return () => {
            this.commands = this.commands.filter((c) => c !== command)
        }
    }

    registerAll(commands: Command[]) {
        const newCommands: Command[] = []
        for (const command of commands) {
            if (command.keys) {
                const cmdKeys = Array.isArray(command.keys) ? command.keys : [command.keys]
                for (const key of cmdKeys) {
                    const normalizedKey = KeyboardHandler.normalize(key)
                    const existing = [...this.commands, ...newCommands].find((c) => {
                        if (!c.keys) return false
                        const cKeys = Array.isArray(c.keys) ? c.keys : [c.keys]
                        return cKeys.some((ck) => KeyboardHandler.normalize(ck) === normalizedKey)
                    })
                    if (existing) {
                        throw new Error(`Key ${key} is already registered on this registry node`)
                    }
                }
            }
            newCommands.push(command)
        }
        this.commands = [...this.commands, ...newCommands]
        return () => {
            this.commands = this.commands.filter((c) => !newCommands.includes(c))
        }
    }

    getAllCommands(): Command[] {
        return this.allCommands
    }

    isAncestorOf(other: CommandRegistry | null): boolean {
        let current = other
        while (current) {
            if (current === this) return true
            current = current.parent
        }
        return false
    }

    handleKeydown(event: KeyboardEvent) {
        const oldActive = commandDispatcher.activeRegistry
        commandDispatcher.activeRegistry = this
        try {
            commandDispatcher.handle(event)
        } finally {
            commandDispatcher.activeRegistry = oldActive
        }
    }
}

// Alias for backwards compatibility
export { CommandRegistry as CommandNode }

export class CommandDispatcher {
    activeRegistry = $state.raw<CommandRegistry | null>(null)

    handle(event: KeyboardEvent) {
        if (!this.activeRegistry) return

        const match = this.activeRegistry.allCommands.find((cmd) => {
            if (!cmd.keys) return false

            const isDisabled = typeof cmd.disabled === "function" ? cmd.disabled() : !!cmd.disabled
            if (isDisabled) return false

            return KeyboardHandler.matches(event, cmd.keys)
        })

        if (match) {
            const target = event.target as HTMLElement | null
            const isInput =
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)

            if (isInput && !match.allowInInputs) {
                return
            }

            if (match.preventDefault !== false) {
                event.preventDefault()
            }

            match.action(event)
        }
    }
}

export const commandDispatcher = new CommandDispatcher()

export const COMMANDS_CONTEXT_KEY = Symbol("commands-context")

export function useCommands(shortcuts: Command[], overrideParent?: CommandRegistry | null) {
    const parentNode =
        overrideParent !== undefined
            ? overrideParent
            : getContext<CommandRegistry>(COMMANDS_CONTEXT_KEY)
    const node = new CommandRegistry(parentNode)
    setContext(COMMANDS_CONTEXT_KEY, node)

    const setActiveNode = getContext<(node: CommandRegistry | null) => void>(
        "set_active_commands_node",
    )
    const getActiveNode = getContext<(() => CommandRegistry | null) | undefined>(
        "get_active_commands_node",
    )

    onMount(() => {
        if (setActiveNode) {
            setActiveNode(node)
        } else {
            commandDispatcher.activeRegistry = node
        }

        const unregisterAll = node.registerAll(shortcuts)
        return () => {
            unregisterAll()
            const activeNow = getActiveNode ? getActiveNode() : commandDispatcher.activeRegistry
            if (activeNow === node) {
                if (setActiveNode) {
                    setActiveNode(node.parent)
                } else {
                    commandDispatcher.activeRegistry = node.parent
                }
            }
        }
    })

    return node
}

export function getPrimaryKeysString(keys: string | string[]): string {
    if (Array.isArray(keys)) {
        const arrowKey = keys.find((k) => k.toLowerCase().includes("arrow"))
        return arrowKey || keys[0] || ""
    }
    return keys
}

export function getRawShortcutHint(commandNode: CommandRegistry | null, id: string): string {
    if (!commandNode) return ""
    const commands = commandNode.getAllCommands()
    const actions = commands.filter((a) => a.id === id && a.keys)
    if (actions.length === 0) return ""

    const primaryAction = actions.reduce((best, current) => {
        if (!best.keys) return current
        if (!current.keys) return best
        const bestKeysStr = getPrimaryKeysString(best.keys)
        const currentKeysStr = getPrimaryKeysString(current.keys)
        if (currentKeysStr.includes("arrow")) return current
        return bestKeysStr.length <= currentKeysStr.length ? best : current
    })

    return formatKeyString(primaryAction.keys!)
}

export function getShortcutHint(commandNode: CommandRegistry | null, id: string): string {
    const raw = getRawShortcutHint(commandNode, id)
    return raw ? ` [${raw}]` : ""
}

export function formatKeyString(keys: string | string[]): string {
    return KeyboardHandler.format(keys)
}
