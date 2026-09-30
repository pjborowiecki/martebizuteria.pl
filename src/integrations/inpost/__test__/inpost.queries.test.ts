import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

const { fetchPointsByCity } = vi.hoisted(() => ({ fetchPointsByCity: vi.fn() }))

vi.mock("~/src/integrations/inpost/inpost.api", () => ({ fetchPointsByCity }))

import { INPOST_QUERY_KEYS } from "~/src/integrations/inpost/inpost.constants"
import { inpostPointsByCityQueryOptions } from "~/src/integrations/inpost/inpost.queries"

describe("inpostPointsByCityQueryOptions", () => {
  it("keys the cache on the trimmed lowercase city", () => {
    expect(inpostPointsByCityQueryOptions("  Warszawa  ").queryKey).toStrictEqual([...INPOST_QUERY_KEYS.BY_CITY, "warszawa"])
  })

  it("keeps the city query keys under the inpost points namespace", () => {
    expect(INPOST_QUERY_KEYS.BY_CITY).toStrictEqual(["inpost-points", "city"])
  })

  it.each([["war"], ["  war  "], ["warszawa"]])("enables the query for %j", (city) => {
    expect(inpostPointsByCityQueryOptions(city).enabled).toBe(true)
  })

  it.each([[""], ["wa"], ["  wa  "]])("disables the query for %j", (city) => {
    expect(inpostPointsByCityQueryOptions(city).enabled).toBe(false)
  })

  it("caches a city for a day and keeps it for two", () => {
    const options = inpostPointsByCityQueryOptions("warszawa")

    expect(options.staleTime).toBe(86_400_000)
    expect(options.gcTime).toBe(172_800_000)
  })

  it("fetches the points for the untrimmed city it was given", async () => {
    fetchPointsByCity.mockResolvedValueOnce([{ name: "WAW01A" }])
    const client = new QueryClient()

    await expect(client.query(inpostPointsByCityQueryOptions(" Warszawa "))).resolves.toStrictEqual([{ name: "WAW01A" }])
    expect(fetchPointsByCity).toHaveBeenCalledWith(" Warszawa ")
  })
})
