import { onDestroy } from "svelte"

export interface SwipeOptions {
    /**
     * Reactively controls whether swipe logic is active.
     */
    enabled?: () => boolean

    /**
     * Determines whether swiping is disabled by the current layout.
     */
    disabledByLayout?: () => boolean

    /**
     * Check if swiping is possible in the given direction.
     * "left" means swiping/dragging to the right (showing previous page).
     * "right" means swiping/dragging to the left (showing next page).
     */
    canSwipe: (direction: "left" | "right") => boolean

    /**
     * Callback triggered when a swipe gesture is successfully completed.
     */
    onSwipeComplete: (direction: "left" | "right") => void

    /**
     * List of CSS selectors to ignore touch events on.
     */
    ignoredSelectors?: string[]

    /**
     * Optional scroll container getter to check horizontal scroll boundaries when zoomed.
     */
    getScrollContainer?: () => HTMLElement | null

    /**
     * Transition offset string when turning to the next page.
     * Default: "-33.333333%"
     */
    nextSwipeOffset?: string

    /**
     * Transition offset string when turning to the previous page.
     * Default: "33.333333%"
     */
    prevSwipeOffset?: string
}

export function createSwipeState(elementGetter: () => HTMLElement | null, options: SwipeOptions) {
    let swipeOffsetX = $state("0px")
    let swipeTransition = $state("none")
    let isTransitioning = $state(false)

    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0
    let swipeState: "undecided" | "swiping" | "native" = "undecided"
    let swipeTimeoutId: any = null
    let pendingPageTurnAction: (() => void) | null = null

    const nextSwipeOffset = options.nextSwipeOffset ?? "-33.333333%"
    const prevSwipeOffset = options.prevSwipeOffset ?? "33.333333%"

    function checkScrollAndZoomState() {
        let isScrollable = false
        let atLeftEdge = true
        let atRightEdge = true

        if (typeof window !== "undefined") {
            // 1. Check browser visual viewport (pinch-to-zoom)
            if (window.visualViewport) {
                const vv = window.visualViewport
                if (vv.scale > 1.05) {
                    isScrollable = true
                    const layoutWidth = document.documentElement.clientWidth || window.innerWidth
                    if (vv.offsetLeft > 5) {
                        atLeftEdge = false
                    }
                    if (vv.offsetLeft + vv.width < layoutWidth - 5) {
                        atRightEdge = false
                    }
                }
            }

            // 2. Check document/window horizontal scroll
            const scrollLeft =
                window.scrollX ||
                document.documentElement.scrollLeft ||
                document.body.scrollLeft ||
                0
            const scrollWidth =
                document.documentElement.scrollWidth || document.body.scrollWidth || 0
            const clientWidth = document.documentElement.clientWidth || window.innerWidth || 0
            if (scrollWidth > clientWidth + 5) {
                isScrollable = true
                if (scrollLeft > 5) {
                    atLeftEdge = false
                }
                if (scrollLeft + clientWidth < scrollWidth - 5) {
                    atRightEdge = false
                }
            }

            // 3. Check internal scroll container (e.g. canvas-frame)
            const scrollContainer = options.getScrollContainer?.()
            if (scrollContainer) {
                const sLeft = scrollContainer.scrollLeft
                const sWidth = scrollContainer.scrollWidth
                const cWidth = scrollContainer.clientWidth
                if (sWidth > cWidth + 5) {
                    isScrollable = true
                    if (sLeft > 5) {
                        atLeftEdge = false
                    }
                    if (sLeft + cWidth < sWidth - 5) {
                        atRightEdge = false
                    }
                }
            }
        }

        return { isScrollable, atLeftEdge, atRightEdge }
    }

    function handleTouchStart(e: TouchEvent) {
        if (options.enabled && !options.enabled()) return

        // If a transition is in progress, instantly complete the page turn to avoid lag/race conditions
        if (isTransitioning && swipeTimeoutId && pendingPageTurnAction) {
            clearTimeout(swipeTimeoutId)
            pendingPageTurnAction()
            swipeTransition = "none"
            swipeOffsetX = "0px"
            isTransitioning = false
            swipeTimeoutId = null
            pendingPageTurnAction = null
        }

        if (e.touches.length !== 1) return

        // Don't trigger if touching any button, input, or ignored elements
        const target = e.target as HTMLElement
        if (options.ignoredSelectors && options.ignoredSelectors.length > 0) {
            const selector = options.ignoredSelectors.join(", ")
            if (target.closest(selector)) {
                return
            }
        }

        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartTime = Date.now()
        swipeState = "undecided"

        // Reset positions
        swipeOffsetX = "0px"
        swipeTransition = "none"
    }

    function handleTouchMove(e: TouchEvent) {
        if (options.enabled && !options.enabled()) return
        if (isTransitioning) return
        if (options.disabledByLayout && options.disabledByLayout()) return
        if (e.touches.length !== 1) return

        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        const diffX = currentX - touchStartX
        const diffY = currentY - touchStartY

        if (swipeState === "native") {
            return
        }

        if (swipeState === "undecided") {
            const absX = Math.abs(diffX)
            const absY = Math.abs(diffY)
            // Use a smaller threshold (4px) to lock into swiping faster and prevent double-movement jitter
            if (absX > 4 || absY > 4) {
                if (absX > absY) {
                    const { isScrollable, atLeftEdge, atRightEdge } = checkScrollAndZoomState()
                    if (isScrollable) {
                        // When zoomed in, only allow swipes in the direction of the edge
                        if (diffX > 0 && atLeftEdge) {
                            swipeState = "swiping"
                        } else if (diffX < 0 && atRightEdge) {
                            swipeState = "swiping"
                        } else {
                            swipeState = "native"
                        }
                    } else {
                        swipeState = "swiping"
                    }
                } else {
                    swipeState = "native"
                }
            }
        }

        if (swipeState === "swiping") {
            if (e.cancelable) {
                e.preventDefault()
            }

            let deltaX = diffX
            const hasPrev = options.canSwipe("left")
            const hasNext = options.canSwipe("right")

            if (deltaX > 0 && !hasPrev) {
                // Dragging right, but no prev page -> rubber band
                deltaX = deltaX * 0.3
            } else if (deltaX < 0 && !hasNext) {
                // Dragging left, but no next page -> rubber band
                deltaX = deltaX * 0.3
            }

            swipeOffsetX = `${deltaX}px`
            swipeTransition = "none"
        }
    }

    function handleTouchEnd(e: TouchEvent) {
        if (options.enabled && !options.enabled()) return
        if (isTransitioning) return
        if (options.disabledByLayout && options.disabledByLayout()) return
        if (e.changedTouches.length !== 1) return

        if (swipeState !== "swiping") {
            swipeTransition = "transform 0.2s ease-out"
            swipeOffsetX = "0px"
            swipeState = "undecided"
            return
        }

        const deltaX = e.changedTouches[0].clientX - touchStartX
        const deltaY = e.changedTouches[0].clientY - touchStartY
        const deltaTime = Date.now() - touchStartTime

        const threshold = 50 // minimum distance in px
        const maxTime = 300 // maximum duration in ms

        // Use visual viewport width for the threshold if zoomed in, to make it easier to swipe
        const viewportWidth = window.visualViewport
            ? window.visualViewport.width
            : window.innerWidth
        const viewportHeight = window.visualViewport
            ? window.visualViewport.height
            : window.innerHeight
        const maxDiagonal = Math.min(100, viewportHeight * 0.2) // tighter diagonal threshold when zoomed in

        const isSwipe =
            (deltaTime < maxTime &&
                Math.abs(deltaX) > threshold &&
                Math.abs(deltaY) < maxDiagonal) ||
            Math.abs(deltaX) > viewportWidth * 0.3

        if (isSwipe) {
            const isNext = deltaX < 0
            const direction = isNext ? "right" : "left"
            const canTurn = options.canSwipe(direction)

            if (canTurn) {
                isTransitioning = true
                // Slide to the next/prev slide (faster 150ms transition)
                swipeTransition = "transform 0.15s ease-out"
                swipeOffsetX = isNext ? nextSwipeOffset : prevSwipeOffset

                const action = () => {
                    options.onSwipeComplete(direction)
                }
                pendingPageTurnAction = action

                swipeTimeoutId = setTimeout(() => {
                    action()
                    // Instantly snap track back to center (0px offset)
                    swipeTransition = "none"
                    swipeOffsetX = "0px"
                    isTransitioning = false
                    swipeTimeoutId = null
                    pendingPageTurnAction = null
                }, 150)

                if (e.cancelable) {
                    e.preventDefault()
                }
                swipeState = "undecided"
                return
            }
        }

        // Animate back to center
        swipeTransition = "transform 0.2s ease-out"
        swipeOffsetX = "0px"
        swipeState = "undecided"
    }

    $effect(() => {
        const el = elementGetter()
        if (!el) return

        const opts = { passive: false }
        el.addEventListener("touchstart", handleTouchStart, opts)
        el.addEventListener("touchmove", handleTouchMove, opts)
        el.addEventListener("touchend", handleTouchEnd, opts)

        return () => {
            el.removeEventListener("touchstart", handleTouchStart)
            el.removeEventListener("touchmove", handleTouchMove)
            el.removeEventListener("touchend", handleTouchEnd)
            if (swipeTimeoutId) {
                clearTimeout(swipeTimeoutId)
            }
        }
    })

    return {
        get swipeOffsetX() {
            return swipeOffsetX
        },
        get swipeTransition() {
            return swipeTransition
        },
        get isTransitioning() {
            return isTransitioning
        },
    }
}
