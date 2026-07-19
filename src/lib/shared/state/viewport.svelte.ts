import { browser } from "$app/environment"
import { BREAKPOINTS, MEDIA_QUERIES } from "./breakpoints"

export function isCompactViewport(width: number): boolean {
    return width <= BREAKPOINTS.COMPACT
}

export function isDockedViewport(width: number): boolean {
    return width >= BREAKPOINTS.DOCKED
}

export function isShortViewport(height: number): boolean {
    return height <= BREAKPOINTS.SHORT_HEIGHT
}

export function isPhoneLandscapeViewport(
    width: number,
    height: number,
    hasCoarsePointer: boolean,
): boolean {
    return hasCoarsePointer && width > height && height <= BREAKPOINTS.PHONE
}

class Viewport {
    #innerWidth = $state(browser ? window.innerWidth : 1024)
    #innerHeight = $state(browser ? window.innerHeight : 768)
    #hasCoarsePointer = $state(false)
    #coarsePointerMql: MediaQueryList | null = null
    #listening = false

    #updateSize = () => {
        this.#innerWidth = window.innerWidth
        this.#innerHeight = window.innerHeight
    }

    #updatePointer = () => {
        this.#hasCoarsePointer =
            (this.#coarsePointerMql?.matches ?? false) || navigator.maxTouchPoints > 0
    }

    constructor() {
        this.setup()
    }

    setup(): void {
        if (!browser || this.#listening) return
        this.#listening = true
        this.#coarsePointerMql = window.matchMedia(MEDIA_QUERIES.COARSE_POINTER)
        this.#updateSize()
        this.#updatePointer()
        window.addEventListener("resize", this.#updateSize)
        this.#coarsePointerMql.addEventListener("change", this.#updatePointer)
    }

    dispose(): void {
        if (!browser || !this.#listening) return
        window.removeEventListener("resize", this.#updateSize)
        this.#coarsePointerMql?.removeEventListener("change", this.#updatePointer)
        this.#coarsePointerMql = null
        this.#listening = false
    }

    get innerWidth(): number {
        return this.#innerWidth
    }

    get innerHeight(): number {
        return this.#innerHeight
    }

    /** Phone landscape keeps the touch-first composition even when its long edge exceeds 800px. */
    get isCompact(): boolean {
        return isCompactViewport(this.#innerWidth) || this.isPhoneLandscape
    }

    get isPhoneLandscape(): boolean {
        return isPhoneLandscapeViewport(this.#innerWidth, this.#innerHeight, this.#hasCoarsePointer)
    }

    get isPhone(): boolean {
        return this.#innerWidth <= BREAKPOINTS.PHONE || this.isPhoneLandscape
    }

    get isDocked(): boolean {
        return isDockedViewport(this.#innerWidth)
    }

    /** Height only controls density, not mobile/desktop composition. */
    get isShortHeight(): boolean {
        return isShortViewport(this.#innerHeight)
    }

    /** Pointer capability is reserved for target size, hover, and optional gestures. */
    get hasCoarsePointer(): boolean {
        return this.#hasCoarsePointer
    }
}

export const viewport = new Viewport()

if (import.meta.hot) import.meta.hot.dispose(() => viewport.dispose())
