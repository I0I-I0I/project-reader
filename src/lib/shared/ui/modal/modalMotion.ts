export function shouldEnableModalPresentationMotion({
    appMotionEnabled,
    prefersReducedMotion,
    movementCritical,
}: {
    appMotionEnabled: boolean
    prefersReducedMotion: boolean
    movementCritical: boolean
}): boolean {
    if (prefersReducedMotion) return false
    return appMotionEnabled || movementCritical
}
