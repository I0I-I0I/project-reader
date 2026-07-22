export function focusLeavesSearchControl(
    control: Pick<Node, "contains">,
    nextTarget: EventTarget | null,
): boolean {
    if (!nextTarget) return true
    try {
        return !control.contains(nextTarget as Node)
    } catch {
        return true
    }
}
