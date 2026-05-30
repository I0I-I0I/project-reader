/**
 * Shared responsive design breakpoints (in pixels).
 * Centralizes the breakpoints used across the app to reduce maintenance burden.
 */
export const BREAKPOINTS = {
    MOBILE: 600,
    TABLET: 768,
    DESKTOP: 900,
    LARGE_DESKTOP: 1024,
    PROMPT: 640,
} as const

/**
 * Media query helper strings for consistent JS/CSS-in-JS usage.
 */
export const MEDIA_QUERIES = {
    MOBILE: `(max-width: ${BREAKPOINTS.MOBILE}px)`,
    TABLET: `(max-width: ${BREAKPOINTS.TABLET}px)`,
    DESKTOP: `(max-width: ${BREAKPOINTS.DESKTOP}px)`,
    LARGE_DESKTOP: `(max-width: ${BREAKPOINTS.LARGE_DESKTOP}px)`,
    PROMPT: `(max-width: ${BREAKPOINTS.PROMPT}px)`,
} as const
