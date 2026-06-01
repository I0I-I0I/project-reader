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

        if (rect.left < hThreshold) {
            horizontal = "left"
        } else if (viewportWidth - rect.right < hThreshold) {
            horizontal = "right"
        } else {
            horizontal = "center"
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
