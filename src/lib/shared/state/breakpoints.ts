/** Shared width breakpoints used by both TypeScript and custom-media.css. */
export const BREAKPOINTS = {
    PHONE: 480,
    COMPACT: 800,
    DOCKED: 1200,
    PROMPT: 640,
    SHORT_HEIGHT: 500,

    /* Compatibility names for modules that have not yet migrated. */
    MOBILE: 800,
    TABLET: 800,
    DESKTOP: 800,
    LARGE_DESKTOP: 1200,
} as const

const PHONE_LANDSCAPE_QUERY = `(pointer: coarse) and (orientation: landscape) and (max-height: ${BREAKPOINTS.PHONE}px)`

export const MEDIA_QUERIES = {
    PHONE: `(max-width: ${BREAKPOINTS.PHONE}px)`,
    PHONE_LANDSCAPE: PHONE_LANDSCAPE_QUERY,
    COMPACT: `(max-width: ${BREAKPOINTS.COMPACT}px), ${PHONE_LANDSCAPE_QUERY}`,
    DOCKED: `(min-width: ${BREAKPOINTS.DOCKED}px)`,
    SHORT: `(max-height: ${BREAKPOINTS.SHORT_HEIGHT}px)`,
    COARSE_POINTER: "(pointer: coarse)",
    PROMPT: `(max-width: ${BREAKPOINTS.PROMPT}px), (max-height: 800px)`,

    /* Compatibility queries retained while component styles migrate. */
    MOBILE: `(max-width: ${BREAKPOINTS.COMPACT}px), ${PHONE_LANDSCAPE_QUERY}`,
    TABLET: `(max-width: ${BREAKPOINTS.COMPACT}px), ${PHONE_LANDSCAPE_QUERY}`,
    DESKTOP: `(max-width: ${BREAKPOINTS.COMPACT}px), ${PHONE_LANDSCAPE_QUERY}`,
    LARGE_DESKTOP: `(max-width: ${BREAKPOINTS.DOCKED - 1}px)`,
} as const
