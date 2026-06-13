export function createFloatingState(
    anchorGetter: () => HTMLElement | null,
    options: {
        verticalThreshold?: number
        horizontalThreshold?: number
        defaultVertical?: "top" | "bottom" | (() => "top" | "bottom")
        defaultHorizontal?: "left" | "right" | "center" | (() => "left" | "right" | "center")
    } = {},
) {
    const getVal = <T>(valOrFn: T | (() => T)): T => {
        return typeof valOrFn === "function" ? (valOrFn as () => T)() : valOrFn
    }

    let vertical = $state<"top" | "bottom">(
        options.defaultVertical !== undefined ? getVal(options.defaultVertical) : "bottom",
    )
    let horizontal = $state<"left" | "right" | "center">(
        options.defaultHorizontal !== undefined ? getVal(options.defaultHorizontal) : "center",
    )

    function updatePosition() {
        if (typeof window === "undefined") return

        const anchor = anchorGetter()
        if (!anchor) return
        const rect = anchor.getBoundingClientRect()
        const viewportWidth = window.innerWidth

        const vThreshold = options.verticalThreshold ?? 120
        const hThreshold = options.horizontalThreshold ?? 250

        if (rect.top < vThreshold) {
            vertical = "bottom"
        } else {
            vertical = "top"
        }

        const defaultH =
            options.defaultHorizontal !== undefined ? getVal(options.defaultHorizontal) : "center"

        const isCloseLeft = rect.left < hThreshold
        const isCloseRight = viewportWidth - rect.right < hThreshold

        if (isCloseLeft && isCloseRight) {
            if (defaultH === "left" || defaultH === "right") {
                horizontal = defaultH
            } else {
                horizontal = rect.left > viewportWidth - rect.right ? "left" : "right"
            }
        } else if (isCloseLeft) {
            horizontal = "left"
        } else if (isCloseRight) {
            horizontal = "right"
        } else {
            horizontal = defaultH
        }
    }

    $effect(() => {
        const anchor = anchorGetter()
        if (!anchor) return

        updatePosition()

        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition, { capture: true, passive: true })

        return () => {
            window.removeEventListener("resize", updatePosition)
            window.removeEventListener("scroll", updatePosition, { capture: true })
        }
    })

    return {
        get vertical() {
            return vertical
        },
        get horizontal() {
            return horizontal
        },
        update: updatePosition,
    }
}
