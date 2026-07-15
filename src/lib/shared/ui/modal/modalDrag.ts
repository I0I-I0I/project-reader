export const MODAL_DRAG_THRESHOLD = 4
export const RECOVERABLE_HEADER_WIDTH = 72
export const RECOVERABLE_HEADER_HEIGHT = 40

export type ViewportBounds = {
    left: number
    top: number
    width: number
    height: number
}

export type ModalPosition = { x: number; y: number }

export function getVisualViewportBounds(): ViewportBounds {
    const viewport = window.visualViewport
    return viewport
        ? {
              left: viewport.offsetLeft,
              top: viewport.offsetTop,
              width: viewport.width,
              height: viewport.height,
          }
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
}

export function exceededDragThreshold(dx: number, dy: number): boolean {
    return Math.hypot(dx, dy) >= MODAL_DRAG_THRESHOLD
}

export function clampModalPosition(
    position: ModalPosition,
    surface: Pick<DOMRect, "width" | "height">,
    viewport: ViewportBounds,
): ModalPosition {
    const minX = viewport.left - Math.max(0, surface.width - RECOVERABLE_HEADER_WIDTH)
    const maxX = viewport.left + viewport.width - RECOVERABLE_HEADER_WIDTH
    const minY = viewport.top
    const maxY = viewport.top + viewport.height - RECOVERABLE_HEADER_HEIGHT
    return {
        x: Math.min(Math.max(position.x, minX), Math.max(minX, maxX)),
        y: Math.min(Math.max(position.y, minY), Math.max(minY, maxY)),
    }
}
