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

export const MEDIA_QUERIES = {
    PHONE: `(max-width: ${BREAKPOINTS.PHONE}px)`,
    COMPACT: `(max-width: ${BREAKPOINTS.COMPACT}px)`,
    DOCKED: `(min-width: ${BREAKPOINTS.DOCKED}px)`,
    SHORT: `(max-height: ${BREAKPOINTS.SHORT_HEIGHT}px)`,
    COARSE_POINTER: "(pointer: coarse)",
    PROMPT: `(max-width: ${BREAKPOINTS.PROMPT}px), (max-height: 800px)`,

    /* Compatibility queries. Layout remains width-only. */
    MOBILE: `(max-width: ${BREAKPOINTS.COMPACT}px)`,
    TABLET: `(max-width: ${BREAKPOINTS.COMPACT}px)`,
    DESKTOP: `(max-width: ${BREAKPOINTS.COMPACT}px)`,
    LARGE_DESKTOP: `(max-width: ${BREAKPOINTS.DOCKED - 1}px)`,
} as const
