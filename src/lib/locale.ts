/**
 * Returns the native capitalized name of the language for a given locale,
 * using the standard Intl.DisplayNames API with a fallback.
 */
export function getLanguageName(locale: string): string {
    try {
        const displayName = new Intl.DisplayNames([locale], { type: "language" }).of(locale)
        if (displayName) {
            return displayName.charAt(0).toUpperCase() + displayName.slice(1)
        }
    } catch {
        // Fallback to uppercase locale code if Intl fails
    }
    return locale.toUpperCase()
}
