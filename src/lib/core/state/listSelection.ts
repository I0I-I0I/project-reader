export function resolveSelectionIndex(
    manualIndex: number | null,
    itemCount: number,
    automaticIndex: number,
): number {
    if (itemCount <= 0) return -1
    if (manualIndex !== null && manualIndex >= 0 && manualIndex < itemCount) {
        return manualIndex
    }
    return Math.max(-1, Math.min(automaticIndex, itemCount - 1))
}

export function findNearestPageIndex(
    items: Array<{ pageNumber?: number }>,
    startPage: number,
): number {
    if (items.length === 0) return -1

    let nearestIndex = 0
    let minimumDistance = Infinity
    for (let index = 0; index < items.length; index++) {
        const pageNumber = items[index].pageNumber
        if (pageNumber === undefined) continue
        const distance = Math.abs(pageNumber - startPage)
        if (distance < minimumDistance) {
            minimumDistance = distance
            nearestIndex = index
        }
    }
    return nearestIndex
}
