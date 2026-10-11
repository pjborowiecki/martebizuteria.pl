import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fetchPointByName, fetchPointsByCity } from "~/src/integrations/inpost/inpost.api"

const point = {
  address_details: { building_number: "12A", city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Krucza" },
  location: { latitude: 52.23, longitude: 21.01 },
  name: "WAW01A",
}

const jsonResponse = (body: unknown): Response => Response.json(body)

const fetchMock = vi.fn<typeof fetch>()

const requestedUrl = (): string => {
  const [first] = fetchMock.mock.calls[0] ?? []
  if (typeof first === "string") {
    return first
  }

  if (first instanceof URL) {
    return first.href
  }

  if (first instanceof Request) {
    return first.url
  }

  throw new Error("InPost was never asked for points")
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("fetchPointsByCity", () => {
  it.each([[""], ["  "], ["wa"], [" wa "]])("does not call InPost for the too-short query %j", async (city) => {
    await expect(fetchPointsByCity(city)).resolves.toStrictEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns the points InPost reports", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 1, items: [point] }))

    const points = await fetchPointsByCity("warszawa")

    expect(points).toHaveLength(1)
    expect(points[0]?.name).toBe("WAW01A")
  })

  it("asks for a full page of points for the capitalised city", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0, items: [] }))

    await fetchPointsByCity("  warszawa  ")

    expect(requestedUrl()).toBe("https://api-pl-points.easypack24.net/v1/points?city=Warszawa&per_page=1000")
  })

  it("capitalises every word of a multi-part city name", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0, items: [] }))

    await fetchPointsByCity("NOWY SĄCZ")

    expect(requestedUrl()).toContain(`city=${encodeURIComponent("Nowy Sącz")}`)
  })

  it("capitalises both halves of a hyphenated city name", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 0, items: [] }))

    await fetchPointsByCity("bielsko-biala")

    expect(requestedUrl()).toContain("city=Bielsko-Biala")
  })

  it("throws with the status InPost returned", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 503 }))

    await expect(fetchPointsByCity("warszawa")).rejects.toThrow("InPost API error: 503")
  })

  it("returns no points when the response does not match the expected shape", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [point] }))

    await expect(fetchPointsByCity("warszawa")).resolves.toStrictEqual([])
  })

  it("returns no points when a single point is malformed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 1, items: [{ name: "WAW01A" }] }))

    await expect(fetchPointsByCity("warszawa")).resolves.toStrictEqual([])
  })
})

describe("fetchPointByName", () => {
  it("returns the point InPost reports under that name", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(point))

    await expect(fetchPointByName("WAW01A")).resolves.toMatchObject({ name: "WAW01A" })
    expect(requestedUrl()).toBe("https://api-pl-points.easypack24.net/v1/points/WAW01A")
  })

  it("gives InPost three seconds to answer", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout")
    fetchMock.mockResolvedValueOnce(jsonResponse(point))

    await fetchPointByName("WAW01A")

    expect(timeout).toHaveBeenCalledExactlyOnceWith(3000)
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(timeout.mock.results[0]?.value)
  })

  it("returns nothing when InPost has no point under that name", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "resource_not_found" }, { status: 404 }))

    await expect(fetchPointByName("WAW99X")).resolves.toBeUndefined()
  })

  it("throws with the status InPost returned when it cannot answer", async () => {
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 503 }))

    await expect(fetchPointByName("WAW01A")).rejects.toThrow("InPost API error: 503")
  })

  it("throws when InPost answers with something that is not a point", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "WAW01A" }))

    await expect(fetchPointByName("WAW01A")).rejects.toThrow()
  })
})
