import { getContext, setContext, onMount } from "svelte"

export type Command = {
    id?: string
    keys?: string
    action: (event: KeyboardEvent) => void
    description: string
    allowInInputs?: boolean
    category?: "commands" | "settings" | "navigation" | "menu"
    subtitle?: () => string
    preventDefault?: boolean
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

export class CommandNode {
    parent = $state.raw<CommandNode | null>(null)
    commands = $state.raw<Command[]>([])

    constructor(parent: CommandNode | null = null) {
        this.parent = parent
    }

    register(command: Command) {
        if (command.keys) {
            const normalizedKey = this.normalizeKeyString(command.keys)
            const existing = this.commands.find(
                (c) => c.keys && this.normalizeKeyString(c.keys) === normalizedKey,
            )
            if (existing) {
                throw new Error(`Key ${command.keys} is already registered`)
            }
        }
        this.commands = [...this.commands, command]
        return () => {
            this.commands = this.commands.filter((c) => c !== command)
        }
    }

    registerAll(commands: Command[]) {
        const registered: (() => void)[] = []
        for (const command of commands) {
            registered.push(this.register(command))
        }
        return () => {
            for (const unregister of registered) {
                unregister()
            }
        }
    }

    findAction(keyString: string): Command | null {
        const localMatch = this.commands.find(
            (c) => c.keys && this.normalizeKeyString(c.keys) === keyString,
        )
        if (localMatch) return localMatch
        if (this.parent) return this.parent.findAction(keyString)
        return null
    }

    getAllCommands(): Command[] {
        const commandsMap = new Map<string, Command>()
        this.collectCommands(commandsMap)
        return Array.from(commandsMap.values())
    }

    private collectCommands(commandsMap: Map<string, Command>) {
        for (const command of this.commands) {
            const key = command.keys
                ? this.normalizeKeyString(command.keys)
                : command.id || command.description
            if (!commandsMap.has(key)) {
                commandsMap.set(key, command)
            }
        }
        if (this.parent) {
            this.parent.collectCommands(commandsMap)
        }
    }

    public isAncestorOf(other: CommandNode | null): boolean {
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
        if (!match && !event.ctrlKey && !event.metaKey && !event.altKey) {
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

            if (match.preventDefault === true || match.preventDefault === undefined) {
                event.preventDefault()
            }

            match.action(event)
        }
    }
}

export const COMMANDS_CONTEXT_KEY = Symbol("commands-context")

export function useCommands(shortcuts: Command[], overrideParent?: CommandNode | null) {
    const parentNode =
        overrideParent !== undefined
            ? overrideParent
            : getContext<CommandNode>(COMMANDS_CONTEXT_KEY)
    const node = new CommandNode(parentNode)
    setContext(COMMANDS_CONTEXT_KEY, node)

    const setActiveNode = getContext<(node: CommandNode | null) => void>("set_active_commands_node")
    const getActiveNode = getContext<(() => CommandNode | null) | undefined>(
        "get_active_commands_node",
    )

    onMount(() => {
        if (setActiveNode) {
            if (getActiveNode) {
                const currentActive = getActiveNode()
                if (!currentActive || !node.isAncestorOf(currentActive)) {
                    // To support sibling components calling useCommands concurrently (e.g. in #each loops),
                    // we chain our node onto the current active node if it shares our context parent.
                    let isSiblingDescendant = false
                    let curr: CommandNode | null = currentActive
                    while (curr) {
                        if (curr === parentNode) {
                            isSiblingDescendant = true
                            break
                        }
                        curr = curr.parent
                    }

                    if (isSiblingDescendant) {
                        node.parent = currentActive
                    }

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
                        setActiveNode(node.parent)
                    }
                } else {
                    setActiveNode(node.parent)
                }
            }
        }
    })

    return node
}

export function getRawShortcutHint(commandNode: CommandNode | null, id: string): string {
    if (!commandNode) return ""
    const commands = commandNode.getAllCommands()
    const actions = commands.filter((a) => a.id === id && a.keys)
    if (actions.length === 0) return ""

    const primaryAction = actions.reduce((best, current) => {
        if (!best.keys) return current
        if (!current.keys) return best
        if (current.keys.includes("arrow")) return current
        return best.keys.length <= current.keys.length ? best : current
    })

    return formatKeyString(primaryAction.keys!)
}

export function getShortcutHint(commandNode: CommandNode | null, id: string): string {
    const raw = getRawShortcutHint(commandNode, id)
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
