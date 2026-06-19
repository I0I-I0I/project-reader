<script lang="ts">
    import { tick, getContext } from "svelte"
    import type { Snippet } from "svelte"
    import {
        CommandRegistry,
        commandDispatcher,
        COMMANDS_CONTEXT_KEY,
    } from "$lib/stores/commandsStore.svelte"

    interface Props {
        /** The trigger element/button. Spreads accessibility attributes and visual states. */
        trigger: Snippet<
            [
                {
                    id: string
                    onclick: (e: MouseEvent) => void
                    onkeydown: (e: KeyboardEvent) => void
                    "aria-haspopup": "menu"
                    "aria-expanded": boolean
                    "aria-controls": string
                    open: boolean
                },
            ]
        >
        /** The content of the dropdown menu (e.g. dropdown items). */
        children: Snippet
        /** Optional class names for the dropdown container. */
        class?: string
        /** Optional class names for the menu container. */
        menuClass?: string
        /** Alignment of the menu relative to the trigger. Defaults to 'right'. */
        align?: "left" | "right"
        /** Controlled open/close state of the dropdown. */
        isOpen?: boolean
    }

    let {
        trigger,
        children,
        class: className = "",
        menuClass = "",
        align = "right",
        isOpen = $bindable(false),
    }: Props = $props()

    let triggerContainer = $state<HTMLElement | null>(null)
    let menuElement = $state<HTMLElement | null>(null)

    const triggerId = `dropdown-trigger-${Math.random().toString(36).substring(2, 9)}`
    const menuId = `dropdown-menu-${Math.random().toString(36).substring(2, 9)}`

    // Capture the commands context at initialization time
    const parentCommandNode = getContext<CommandRegistry>(COMMANDS_CONTEXT_KEY)
    const setActiveNode = getContext<(node: CommandRegistry | null) => void>(
        "set_active_commands_node",
    )

    let previouslyFocusedElement: HTMLElement | null = null

    function toggleMenu(e: MouseEvent) {
        e.stopPropagation()
        isOpen = !isOpen
    }

    function closeMenu() {
        isOpen = false
    }

    function handleTriggerClick(e: MouseEvent) {
        toggleMenu(e)
    }

    function handleTriggerKeyDown(e: KeyboardEvent) {
        // Trigger keydowns are caught globally by layout, but kept for signature compatibility
    }

    function getMenuItems(): HTMLElement[] {
        if (!menuElement) return []
        return Array.from(
            menuElement.querySelectorAll('[role="menuitem"], button, a'),
        ) as HTMLElement[]
    }

    function focusItem(index: number) {
        const items = getMenuItems()
        if (items.length > 0 && index >= 0 && index < items.length) {
            items[index].focus()
        }
    }

    function handleWindowPointerDown(e: PointerEvent) {
        const target = e.target as HTMLElement
        const clickedInsideTrigger = triggerContainer?.contains(target)
        const clickedInsideMenu = menuElement?.contains(target)

        if (!clickedInsideTrigger && !clickedInsideMenu) {
            isOpen = false
        }
    }

    function handleMenuClick(e: MouseEvent) {
        const target = e.target as HTMLElement
        const clickedItem = target.closest('[role="menuitem"], button, a')
        if (clickedItem) {
            isOpen = false
        }
    }

    $effect(() => {
        if (isOpen) {
            // Track the element that had focus before the menu opened
            previouslyFocusedElement = document.activeElement as HTMLElement

            // Create a sub-node in the command registry chain
            const node = new CommandRegistry(parentCommandNode)

            // Activate the node
            if (setActiveNode) {
                setActiveNode(node)
            } else {
                commandDispatcher.activeRegistry = node
            }

            // Register keymaps for navigating/closing the dropdown
            const unregisterAll = node.registerAll([
                {
                    keys: ["arrowdown", "j"],
                    action: (e) => {
                        e.preventDefault()
                        const items = getMenuItems()
                        const activeEl = document.activeElement as HTMLElement
                        const currentIndex = items.indexOf(activeEl)
                        const nextIndex = (currentIndex + 1) % items.length
                        focusItem(nextIndex)
                    },
                    description: "Focus next dropdown item",
                },
                {
                    keys: ["arrowup", "k"],
                    action: (e) => {
                        e.preventDefault()
                        const items = getMenuItems()
                        const activeEl = document.activeElement as HTMLElement
                        const currentIndex = items.indexOf(activeEl)
                        const prevIndex = (currentIndex - 1 + items.length) % items.length
                        focusItem(prevIndex)
                    },
                    description: "Focus previous dropdown item",
                },
                {
                    keys: ["home"],
                    action: (e) => {
                        e.preventDefault()
                        focusItem(0)
                    },
                    description: "Focus first dropdown item",
                },
                {
                    keys: ["end"],
                    action: (e) => {
                        e.preventDefault()
                        const items = getMenuItems()
                        focusItem(items.length - 1)
                    },
                    description: "Focus last dropdown item",
                },
                {
                    keys: ["escape"],
                    action: (e) => {
                        e.preventDefault()
                        closeMenu()
                    },
                    description: "Close dropdown menu",
                },
                {
                    keys: ["enter", "space"],
                    action: (e) => {
                        const activeEl = document.activeElement as HTMLElement
                        const items = getMenuItems()
                        if (items.includes(activeEl)) {
                            e.preventDefault()
                            activeEl.click()
                        }
                    },
                    description: "Select dropdown item",
                },
            ])

            // Focus the first item once DOM renders
            tick().then(() => {
                focusItem(0)
            })

            return () => {
                node.isDestroyed = true
                unregisterAll()
                commandDispatcher.removeRegistry(node)
                if (setActiveNode) {
                    setActiveNode(parentCommandNode)
                }
            }
        } else if (!isOpen && previouslyFocusedElement) {
            // Restore focus back to the launcher element when closing
            previouslyFocusedElement.focus()
            previouslyFocusedElement = null
        }
    })
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

<div
    bind:this={triggerContainer}
    class={["dropdown-container", className].filter(Boolean).join(" ")}
>
    {@render trigger({
        id: triggerId,
        onclick: handleTriggerClick,
        onkeydown: handleTriggerKeyDown,
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
        "aria-controls": menuId,
        open: isOpen,
    })}

    {#if isOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
        <div
            id={menuId}
            bind:this={menuElement}
            role="menu"
            aria-labelledby={triggerId}
            class={["dropdown-menu", align === "left" ? "align-left" : "align-right", menuClass]
                .filter(Boolean)
                .join(" ")}
            tabindex="-1"
            onclick={handleMenuClick}
        >
            {@render children()}
        </div>
    {/if}
</div>

<style>
    .dropdown-container {
        position: relative;
        display: inline-block;
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        background: var(--surface-color);
        border: 2px solid var(--border-color);
        box-shadow: 4px 4px 0 var(--shadow-color);
        min-width: 160px;
        z-index: var(--z-sticky);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .dropdown-menu.align-right {
        right: 0;
    }

    .dropdown-menu.align-left {
        left: 0;
    }

    /* Styles for nested items to look uniform */
    .dropdown-menu :global(.dropdown-item) {
        width: 100%;
        padding: 10px 12px;
        display: grid;
        grid-template-columns: 24px 1fr;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        background: transparent;
        border: none;
        color: var(--text-color);
        font-family: inherit;
        font-size: var(--font-size-base);
        font-weight: 800;
        text-transform: uppercase;
        cursor: pointer;
        text-align: left;
        transition: background-color 0.1s ease;
        box-sizing: border-box;
    }

    @media (hover: hover) {
        .dropdown-menu :global(.dropdown-item):hover,
        .dropdown-menu :global(.dropdown-item):focus-visible {
            background-color: var(--surface-hover-color);
            color: var(--danger-active-color);
            outline: none;
        }
    }

    .dropdown-menu :global(.dropdown-item):active {
        background-color: var(--surface-hover-color);
    }

    .dropdown-menu :global(.dropdown-icon) {
        width: 16px;
        height: 16px;
    }

    @media (--mobile-width) {
        .dropdown-menu {
            min-width: 140px;
            box-shadow: 2px 2px 0 var(--shadow-color);
        }

        .dropdown-menu :global(.dropdown-item) {
            padding: 8px 10px;
            font-size: var(--font-size-sm);
        }
    }
</style>
