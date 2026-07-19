export type TabNavigationKey = "ArrowLeft" | "ArrowRight" | "Home" | "End"

/** Resolve the next enabled tab index for automatic horizontal tab activation. */
export function getNextTabIndex(
    currentIndex: number,
    key: TabNavigationKey,
    enabledIndices: number[],
): number {
    if (enabledIndices.length === 0) return -1
    if (key === "Home") return enabledIndices[0]
    if (key === "End") return enabledIndices.at(-1)!

    const position = enabledIndices.indexOf(currentIndex)
    const safePosition = position === -1 ? 0 : position
    const delta = key === "ArrowRight" ? 1 : -1
    return enabledIndices[(safePosition + delta + enabledIndices.length) % enabledIndices.length]
}
