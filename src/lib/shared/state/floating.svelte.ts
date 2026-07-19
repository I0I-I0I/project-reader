interface FloatingOptions {
    verticalThreshold?: number
    horizontalThreshold?: number
    defaultVertical?: "top" | "bottom" | (() => "top" | "bottom")
    defaultHorizontal?: "left" | "right" | "center" | (() => "left" | "right" | "center")
}

export function createFloatingState(
    anchorGetterOrOptions: (() => HTMLElement | null) | FloatingOptions = {},
    suppliedOptions: FloatingOptions = {},
) {
    const anchorGetter =
        typeof anchorGetterOrOptions === "function" ? anchorGetterOrOptions : () => null
    const options =
        typeof anchorGetterOrOptions === "function" ? suppliedOptions : anchorGetterOrOptions
    const getVal = <T>(valOrFn: T | (() => T)): T => {
        return typeof valOrFn === "function" ? (valOrFn as () => T)() : valOrFn
    }

    let vertical = $state<"top" | "bottom">(
        options.defaultVertical !== undefined ? getVal(options.defaultVertical) : "bottom",
    )
    let horizontal = $state<"left" | "right" | "center">(
        options.defaultHorizontal !== undefined ? getVal(options.defaultHorizontal) : "center",
    )
    let anchor: HTMLElement | null = null

    function updatePosition() {
        const currentAnchor = anchor ?? anchorGetter()
        if (typeof window === "undefined" || !currentAnchor) return

        const rect = currentAnchor.getBoundingClientRect()
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

    function attach(node: HTMLElement) {
        anchor = node
        updatePosition()

        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition, { capture: true, passive: true })

        return () => {
            window.removeEventListener("resize", updatePosition)
            window.removeEventListener("scroll", updatePosition, { capture: true })
            if (anchor === node) anchor = null
        }
    }

    return {
        get vertical() {
            return vertical
        },
        get horizontal() {
            return horizontal
        },
        setVertical(value: "top" | "bottom") {
            vertical = value
        },
        update: updatePosition,
        attach,
    }
}
