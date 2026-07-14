export {}

interface SearchMatch {
    pageNumber: number
    start: number
    end: number
}

interface PageText {
    original: string
    lower: string
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data

    if (type === "search") {
        const {
            query,
            pageTexts,
            searchStartPage = 1,
            searchId,
        } = payload as {
            query: string
            pageTexts: Record<number, PageText> | Map<number, PageText>
            searchStartPage: number
            searchId: number
        }

        const qLower = query.toLowerCase()
        const matches: SearchMatch[] = []

        // Convert entries if it's not a Map (though it should be passed as one or a plain object)
        const entries =
            pageTexts instanceof Map ? Array.from(pageTexts.entries()) : Object.entries(pageTexts)

        // Sort entries to process pages in order starting from searchStartPage
        const sortedEntries = (entries as [any, PageText][]).sort((a, b) => {
            const pA = Number(a[0])
            const pB = Number(b[0])

            // This is a bit complex: we want to start from searchStartPage and go forward, then wrap around
            const distA = pA >= searchStartPage ? pA - searchStartPage : pA + 1000000
            const distB = pB >= searchStartPage ? pB - searchStartPage : pB + 1000000
            return distA - distB
        })

        let lastUpdateTime = performance.now()

        for (const [pageNoStr, page] of sortedEntries) {
            const pageNumber = Number(pageNoStr)
            const lowerText = page.lower
            let idx = lowerText.indexOf(qLower)
            while (idx !== -1) {
                matches.push({
                    pageNumber,
                    start: idx,
                    end: idx + qLower.length,
                })

                if (matches.length >= 10000) break
                idx = lowerText.indexOf(qLower, idx + 1)
            }

            if (matches.length >= 10000) break

            const now = performance.now()
            if (now - lastUpdateTime > 100) {
                self.postMessage({
                    type: "results",
                    payload: { matches: [...matches], isPartial: true, searchId },
                })
                lastUpdateTime = now
            }
        }

        self.postMessage({
            type: "results",
            payload: { matches, isPartial: false, searchId },
        })
    }
}
