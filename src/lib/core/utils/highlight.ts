export interface TextPart {
    text: string
    highlight: boolean
}

export function getHighlightedParts(
    text: string,
    matches: readonly any[],
    key: string,
): TextPart[] {
    if (typeof text !== "string") return [{ text: String(text || ""), highlight: false }]
    const match = matches.find((m) => m.key === key)
    if (!match) return [{ text, highlight: false }]

    const parts: TextPart[] = []
    let lastIndex = 0
    const sortedIndices = [...match.indices].sort((a, b) => a[0] - b[0])

    for (const [start, end] of sortedIndices) {
        if (start > lastIndex) {
            parts.push({
                text: text.slice(lastIndex, start),
                highlight: false,
            })
        }
        parts.push({ text: text.slice(start, end + 1), highlight: true })
        lastIndex = end + 1
    }
    if (lastIndex < text.length) {
        parts.push({ text: text.slice(lastIndex), highlight: false })
    }
    return parts
}
