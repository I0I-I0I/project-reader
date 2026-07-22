export type SliderDirection = "previous" | "next"

export type GestureMode = "undecided" | "dragging" | "native"

export interface HorizontalScrollState {
    isScrollable: boolean
    atLeftEdge: boolean
    atRightEdge: boolean
}

export const DIRECTION_LOCK_DISTANCE = 4
export const BROWSER_EDGE_RESERVATION = 40
export const FAST_SWIPE_DISTANCE = 50
export const FAST_SWIPE_DURATION = 300
export const VIEWPORT_DISTANCE_RATIO = 0.3
export const UNAVAILABLE_DIRECTION_RESISTANCE = 0.3
export const SETTLE_DURATION = 150
export const SNAP_BACK_DURATION = 200

export function isBrowserEdgeStart(
    clientX: number,
    viewportWidth: number,
    reservation = BROWSER_EDGE_RESERVATION,
): boolean {
    return viewportWidth > 0 && (clientX < reservation || clientX > viewportWidth - reservation)
}

export function directionFromDelta(deltaX: number): SliderDirection {
    return deltaX < 0 ? "next" : "previous"
}

export function resolveGestureMode(
    deltaX: number,
    deltaY: number,
    scroll: HorizontalScrollState,
): GestureMode {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX <= DIRECTION_LOCK_DISTANCE && absY <= DIRECTION_LOCK_DISTANCE) {
        return "undecided"
    }
    if (absX <= absY) return "native"
    if (!scroll.isScrollable) return "dragging"
    if (deltaX > 0 && scroll.atLeftEdge) return "dragging"
    if (deltaX < 0 && scroll.atRightEdge) return "dragging"
    return "native"
}

export function applyBoundResistance(deltaX: number, canMove: boolean): number {
    return canMove ? deltaX : deltaX * UNAVAILABLE_DIRECTION_RESISTANCE
}

export interface CompletionInput {
    deltaX: number
    deltaY: number
    elapsed: number
    viewportWidth: number
    viewportHeight: number
}

export function shouldCompleteGesture({
    deltaX,
    deltaY,
    elapsed,
    viewportWidth,
    viewportHeight,
}: CompletionInput): boolean {
    const maxDiagonal = Math.min(100, viewportHeight * 0.2)
    const isFastSwipe =
        elapsed < FAST_SWIPE_DURATION &&
        Math.abs(deltaX) > FAST_SWIPE_DISTANCE &&
        Math.abs(deltaY) < maxDiagonal
    const isLongDrag =
        Math.abs(deltaX) > viewportWidth * VIEWPORT_DISTANCE_RATIO && Math.abs(deltaY) < maxDiagonal
    return isFastSwipe || isLongDrag
}

export function emptyHorizontalScrollState(): HorizontalScrollState {
    return { isScrollable: false, atLeftEdge: true, atRightEdge: true }
}

interface SettlementScheduler {
    schedule: (callback: () => void, delay: number) => unknown
    cancel: (handle: unknown) => void
}

const timeoutScheduler: SettlementScheduler = {
    schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export function createSettlementController<T>(
    onCommit: (payload: T) => void,
    scheduler: SettlementScheduler = timeoutScheduler,
) {
    let pending: T | null = null
    let handle: unknown = null

    function cancel() {
        if (handle !== null) scheduler.cancel(handle)
        handle = null
        pending = null
    }

    function finish() {
        const payload = pending
        if (payload === null) return
        handle = null
        pending = null
        onCommit(payload)
    }

    function begin(payload: T, delay: number) {
        cancel()
        pending = payload
        if (delay <= 0) finish()
        else handle = scheduler.schedule(finish, delay)
    }

    return {
        begin,
        cancel,
        finish,
        get pending() {
            return pending
        },
    }
}
