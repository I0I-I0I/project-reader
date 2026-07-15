import { describe, expect, it } from "vitest"
import en from "../../../../../messages/en.json"
import ru from "../../../../../messages/ru.json"

describe("message catalogs", () => {
    it("keep English and Russian key sets in sync", () => {
        const byKey = (left: string, right: string) => left.localeCompare(right)
        expect(Object.keys(en).sort(byKey)).toEqual(Object.keys(ru).sort(byKey))
    })
})
