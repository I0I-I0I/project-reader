export {}

interface SearchMatch {
    pageNumber: number
    start: number
    end: number
}

type WorkerRequest =
    | { type: "replace-corpus"; payload: { generation: number; pages: Record<number, string> } }
    | {
          type: "query"
          payload: { generation: number; query: string; searchStartPage: number; searchId: number }
      }
    | { type: "cancel"; payload: { searchId: number } }
    | { type: "dispose"; payload?: undefined }

let generation = 0
let corpus = new Map<number, string>()
let newestSearchId = 0

const yieldToMessages = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const message = event.data
    if (message.type === "replace-corpus") {
        generation = message.payload.generation
        newestSearchId += 1
        corpus = new Map(
            Object.entries(message.payload.pages).map(([pageNumber, text]) => [
                Number(pageNumber),
                text.toLocaleLowerCase(),
            ]),
        )
        return
    }
    if (message.type === "cancel") {
        newestSearchId = Math.max(newestSearchId, message.payload.searchId)
        return
    }
    if (message.type === "dispose") {
        newestSearchId += 1
        corpus.clear()
        return
    }
    newestSearchId = Math.max(newestSearchId, message.payload.searchId)
    void search(message.payload)
}

async function search({
    generation: requestedGeneration,
    query,
    searchStartPage,
    searchId,
}: Extract<WorkerRequest, { type: "query" }>["payload"]) {
    if (requestedGeneration !== generation || searchId !== newestSearchId) return
    const normalizedQuery = query.toLocaleLowerCase()
    const pageNumbers = [...corpus.keys()].sort((a, b) => {
        const distanceA = a >= searchStartPage ? a - searchStartPage : a + corpus.size
        const distanceB = b >= searchStartPage ? b - searchStartPage : b + corpus.size
        return distanceA - distanceB
    })
    let pending: SearchMatch[] = []
    let totalMatches = 0
    let lastUpdateTime = performance.now()

    for (let pageIndex = 0; pageIndex < pageNumbers.length; pageIndex += 1) {
        if (requestedGeneration !== generation || searchId !== newestSearchId) return
        const pageNumber = pageNumbers[pageIndex]
        const text = corpus.get(pageNumber) ?? ""
        let index = text.indexOf(normalizedQuery)
        while (index !== -1 && totalMatches < 10000) {
            pending.push({ pageNumber, start: index, end: index + normalizedQuery.length })
            totalMatches += 1
            index = text.indexOf(normalizedQuery, index + 1)
        }

        const now = performance.now()
        if (pending.length && now - lastUpdateTime >= 100) {
            self.postMessage({
                type: "results",
                payload: { matches: pending, isPartial: true, searchId },
            })
            pending = []
            lastUpdateTime = now
        }
        if (totalMatches >= 10000) break
        if (pageIndex % 8 === 7) await yieldToMessages()
    }

    if (requestedGeneration !== generation || searchId !== newestSearchId) return
    self.postMessage({
        type: "results",
        payload: { matches: pending, isPartial: false, searchId },
    })
}
