import type { Action } from "svelte/action"

export interface TooltipParams {
    text: string
    align?: "left" | "right" | "center"
    position?: "top" | "bottom"
}

let tooltipElement: HTMLDivElement | null = null
let activeAnchor: HTMLElement | null = null
let hideTimeout: any = null

function getOrCreateTooltip(): HTMLDivElement {
    if (tooltipElement) return tooltipElement

    tooltipElement = document.createElement("div")
    tooltipElement.className = "global-tooltip"
    tooltipElement.setAttribute("role", "tooltip")

    // Initial styles
    Object.assign(tooltipElement.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "100000",
    })

    document.body.appendChild(tooltipElement)
    return tooltipElement
}

function updatePosition(
    anchor: HTMLElement,
    text: string,
    align: "left" | "right" | "center",
    position: "top" | "bottom",
) {
    const tooltipEl = getOrCreateTooltip()

    // Set text first so we can measure the element's actual rendered size
    tooltipEl.innerText = text

    // Temp class for initial measurement styling
    tooltipEl.className = `global-tooltip tooltip-${position}`

    // Measure coordinates
    const rect = anchor.getBoundingClientRect()
    const tooltipRect = tooltipEl.getBoundingClientRect()
    const gap = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let resolvedPosition = position
    let top = 0

    // Vertical placement & viewport edge flipping
    if (position === "top") {
        top = rect.top - tooltipRect.height - gap
        if (top < 8) {
            top = rect.bottom + gap
            resolvedPosition = "bottom"
        }
    } else {
        top = rect.bottom + gap
        if (top + tooltipRect.height > viewportHeight - 8) {
            top = rect.top - tooltipRect.height - gap
            resolvedPosition = "top"
        }
    }

    // Horizontal placement
    let left = 0
    if (align === "center") {
        left = rect.left + rect.width / 2 - tooltipRect.width / 2
    } else if (align === "left") {
        left = rect.left
    } else {
        left = rect.right - tooltipRect.width
    }

    // Constrain horizontally within the viewport (with 8px padding)
    const minLeft = 8
    const maxLeft = viewportWidth - tooltipRect.width - 8
    left = Math.max(minLeft, Math.min(left, maxLeft))

    // Calculate arrow position relative to the tooltip (so it always points to anchor center)
    const anchorCenter = rect.left + rect.width / 2
    const arrowLeft = anchorCenter - left
    const minArrowLeft = 12
    const maxArrowLeft = tooltipRect.width - 12
    const constrainedArrowLeft = Math.max(minArrowLeft, Math.min(arrowLeft, maxArrowLeft))

    // Update properties and variables
    tooltipEl.className = `global-tooltip tooltip-${resolvedPosition}`
    tooltipEl.style.top = `${top}px`
    tooltipEl.style.left = `${left}px`
    tooltipEl.style.setProperty("--arrow-left", `${constrainedArrowLeft}px`)
}

function showTooltip(anchor: HTMLElement, params: TooltipParams) {
    if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
    }
    activeAnchor = anchor

    const tooltipEl = getOrCreateTooltip()
    updatePosition(anchor, params.text, params.align ?? "center", params.position ?? "top")

    // Trigger transition next frame/tick
    requestAnimationFrame(() => {
        if (activeAnchor === anchor) {
            tooltipEl.classList.add("visible")
        }
    })
}

function hideTooltip(anchor: HTMLElement) {
    if (activeAnchor === anchor) {
        activeAnchor = null
    }

    if (hideTimeout) clearTimeout(hideTimeout)

    hideTimeout = setTimeout(() => {
        if (!activeAnchor) {
            const tooltipEl = getOrCreateTooltip()
            tooltipEl.classList.remove("visible")
        }
    }, 16) // ~1 frame delay to support seamless transitions between sibling hover items
}

export const tooltip: Action<HTMLElement, string | TooltipParams | undefined> = (node, params) => {
    let currentParams = params

    function getParams(): TooltipParams | null {
        if (!currentParams) return null
        if (typeof currentParams === "string") {
            return { text: currentParams, align: "center", position: "top" }
        }
        return {
            text: currentParams.text,
            align: currentParams.align ?? "center",
            position: currentParams.position ?? "top",
        }
    }

    function handleMouseEnter() {
        const parsed = getParams()
        if (parsed && parsed.text) {
            showTooltip(node, parsed)
        }
    }

    function handleMouseLeave() {
        hideTooltip(node)
    }

    function handleScrollResize() {
        if (activeAnchor === node) {
            const parsed = getParams()
            if (parsed && parsed.text) {
                updatePosition(
                    node,
                    parsed.text,
                    parsed.align ?? "center",
                    parsed.position ?? "top",
                )
            }
        }
    }

    node.addEventListener("mouseenter", handleMouseEnter)
    node.addEventListener("mouseleave", handleMouseLeave)
    node.addEventListener("focusin", handleMouseEnter)
    node.addEventListener("focusout", handleMouseLeave)
    node.addEventListener("click", handleMouseLeave)

    window.addEventListener("scroll", handleScrollResize, { capture: true, passive: true })
    window.addEventListener("resize", handleScrollResize, { passive: true })

    return {
        update(newParams) {
            currentParams = newParams
            const parsed = getParams()
            if (activeAnchor === node) {
                if (parsed && parsed.text) {
                    updatePosition(
                        node,
                        parsed.text,
                        parsed.align ?? "center",
                        parsed.position ?? "top",
                    )
                } else {
                    hideTooltip(node)
                }
            }
        },
        destroy() {
            node.removeEventListener("mouseenter", handleMouseEnter)
            node.removeEventListener("mouseleave", handleMouseLeave)
            node.removeEventListener("focusin", handleMouseEnter)
            node.removeEventListener("focusout", handleMouseLeave)
            node.removeEventListener("click", handleMouseLeave)

            window.removeEventListener("scroll", handleScrollResize, { capture: true })
            window.removeEventListener("resize", handleScrollResize)

            if (activeAnchor === node) {
                hideTooltip(node)
            }
        },
    }
}
