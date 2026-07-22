import type { Attachment } from "svelte/attachments"
import {
    applyBoundResistance,
    createSettlementController,
    directionFromDelta,
    emptyHorizontalScrollState,
    isBrowserEdgeStart,
    resolveGestureMode,
    SETTLE_DURATION,
    SNAP_BACK_DURATION,
    shouldCompleteGesture,
    type GestureMode,
    type HorizontalScrollState,
    type SliderDirection,
} from "./sliderGesture"

const NATIVE_GESTURE_SELECTOR =
    "input, select, textarea, label, [contenteditable]:not([contenteditable='false']), [data-slider-ignore]"
const SCROLL_TOLERANCE = 5

export type SliderMove = () => void
export type ResolveSliderMove = (direction: SliderDirection) => SliderMove | undefined

interface SliderStateOptions {
    enabled: () => boolean
    resolveMove: ResolveSliderMove
    getHorizontalScrollContainer?: () => HTMLElement | null
    motionEnabled: () => boolean
}

function readHorizontalScrollState(
    getHorizontalScrollContainer?: () => HTMLElement | null,
): HorizontalScrollState {
    const state = emptyHorizontalScrollState()
    if (typeof window === "undefined") return state

    const viewport = window.visualViewport
    if (viewport?.scale && viewport.scale > 1.05) {
        state.isScrollable = true
        const layoutWidth = document.documentElement.clientWidth || window.innerWidth
        if (viewport.offsetLeft > SCROLL_TOLERANCE) state.atLeftEdge = false
        if (viewport.offsetLeft + viewport.width < layoutWidth - SCROLL_TOLERANCE) {
            state.atRightEdge = false
        }
    }

    const root = document.documentElement
    const body = document.body
    const scrollLeft = window.scrollX || root.scrollLeft || body?.scrollLeft || 0
    const scrollWidth = root.scrollWidth || body?.scrollWidth || 0
    const clientWidth = root.clientWidth || window.innerWidth
    if (scrollWidth > clientWidth + SCROLL_TOLERANCE) {
        state.isScrollable = true
        if (scrollLeft > SCROLL_TOLERANCE) state.atLeftEdge = false
        if (scrollLeft + clientWidth < scrollWidth - SCROLL_TOLERANCE) {
            state.atRightEdge = false
        }
    }

    const container = getHorizontalScrollContainer?.()
    if (container && container.scrollWidth > container.clientWidth + SCROLL_TOLERANCE) {
        state.isScrollable = true
        if (container.scrollLeft > SCROLL_TOLERANCE) state.atLeftEdge = false
        if (
            container.scrollLeft + container.clientWidth <
            container.scrollWidth - SCROLL_TOLERANCE
        ) {
            state.atRightEdge = false
        }
    }

    return state
}

export function createSliderState(options: SliderStateOptions) {
    let offsetX = $state("0px")
    let transition = $state("none")
    let settling = $state(false)

    let startX = 0
    let startY = 0
    let startTime = 0
    let gestureMode: GestureMode = "undecided"
    let activeSession = false

    const settlement = createSettlementController((operation: SliderMove) => {
        settling = false
        transition = "none"
        offsetX = "0px"
        operation()
    })

    function terminateSession() {
        activeSession = false
        gestureMode = "undecided"
    }

    function cancel() {
        settlement.cancel()
        settling = false
        offsetX = "0px"
        transition = "none"
        terminateSession()
    }

    function snapBack() {
        offsetX = "0px"
        transition = options.motionEnabled() ? `transform ${SNAP_BACK_DURATION}ms ease-out` : "none"
        terminateSession()
    }

    function settle(direction: SliderDirection, operation: SliderMove) {
        const animate = options.motionEnabled()
        settling = animate
        offsetX = direction === "next" ? "-33.333333%" : "33.333333%"
        transition = animate ? `transform ${SETTLE_DURATION}ms ease-out` : "none"
        terminateSession()
        settlement.begin(operation, animate ? SETTLE_DURATION : 0)
    }

    function handleTouchStart(event: TouchEvent) {
        terminateSession()
        if (event.touches.length !== 1) {
            cancel()
            return
        }
        if (!options.enabled() || settling) return

        activeSession = true
        startX = event.touches[0].clientX
        startY = event.touches[0].clientY
        startTime = Date.now()
        if (event.target instanceof Element && event.target.closest(NATIVE_GESTURE_SELECTOR)) {
            gestureMode = "native"
            return
        }

        gestureMode = isBrowserEdgeStart(startX, window.innerWidth) ? "native" : "undecided"
        offsetX = "0px"
        transition = "none"
    }

    function handleTouchMove(event: TouchEvent) {
        if (!activeSession) return
        if (!options.enabled()) {
            cancel()
            return
        }
        if (event.touches.length !== 1) {
            cancel()
            return
        }
        if (settling || gestureMode === "native") return

        const deltaX = event.touches[0].clientX - startX
        const deltaY = event.touches[0].clientY - startY
        if (gestureMode === "undecided") {
            gestureMode = resolveGestureMode(
                deltaX,
                deltaY,
                readHorizontalScrollState(options.getHorizontalScrollContainer),
            )
        }
        if (gestureMode !== "dragging") return

        if (event.cancelable) event.preventDefault()
        const direction = directionFromDelta(deltaX)
        offsetX = `${applyBoundResistance(deltaX, options.resolveMove(direction) !== undefined)}px`
        transition = "none"
    }

    function handleTouchEnd(event: TouchEvent) {
        if (!activeSession) return
        if (!options.enabled()) {
            cancel()
            return
        }
        if (event.touches.length !== 0 || event.changedTouches.length !== 1) {
            cancel()
            return
        }
        if (settling) return
        if (gestureMode !== "dragging") {
            snapBack()
            return
        }

        const deltaX = event.changedTouches[0].clientX - startX
        const deltaY = event.changedTouches[0].clientY - startY
        const viewport = window.visualViewport
        const direction = directionFromDelta(deltaX)
        const shouldCommit = shouldCompleteGesture({
            deltaX,
            deltaY,
            elapsed: Date.now() - startTime,
            viewportWidth: viewport?.width ?? window.innerWidth,
            viewportHeight: viewport?.height ?? window.innerHeight,
        })

        const operation = shouldCommit ? options.resolveMove(direction) : undefined
        if (operation) {
            if (event.cancelable) event.preventDefault()
            settle(direction, operation)
        } else {
            snapBack()
        }
    }

    const attach: Attachment<HTMLElement> = (element) => {
        const listenerOptions: AddEventListenerOptions = { passive: false }
        element.addEventListener("touchstart", handleTouchStart, listenerOptions)
        element.addEventListener("touchmove", handleTouchMove, listenerOptions)
        element.addEventListener("touchend", handleTouchEnd, listenerOptions)
        element.addEventListener("touchcancel", cancel, listenerOptions)

        return () => {
            element.removeEventListener("touchstart", handleTouchStart)
            element.removeEventListener("touchmove", handleTouchMove)
            element.removeEventListener("touchend", handleTouchEnd)
            element.removeEventListener("touchcancel", cancel)
            cancel()
        }
    }

    return {
        get offsetX() {
            return offsetX
        },
        get transition() {
            return transition
        },
        get settling() {
            return settling
        },
        attach,
        cancel,
    }
}
