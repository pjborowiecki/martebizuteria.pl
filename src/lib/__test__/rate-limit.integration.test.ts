import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite)) }
})

const { IP_ADDRESS_HEADER, clientAddress, withinRateLimit } = await import("~/src/lib/rate-limit")

const { db } = await import("~/src/integrations/drizzle-orm/drizzle.database")

const attempt = { key: "update-customer-phone:203.0.113.7", limit: 3, windowSeconds: 60 }

const storedCount = (key: string): unknown => sqlite.prepare("select count from rate_limit where key = ?").get(key)

beforeEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  sqlite.exec(`
    drop table if exists rate_limit;
    create table rate_limit (
      id text primary key,
      key text not null unique,
      count integer not null,
      last_request integer not null
    );
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("fixed-window rate limits", () => {
  it("admits every attempt up to the configured maximum", async () => {
    for (let taken = 0; taken < attempt.limit; taken++) {
      expect(await withinRateLimit(attempt)).toBe(true)
    }

    expect(storedCount(attempt.key)).toMatchObject({ count: attempt.limit })
  })

  it("refuses the attempt after the maximum without inflating the counter", async () => {
    for (let taken = 0; taken < attempt.limit; taken++) {
      await withinRateLimit(attempt)
    }

    expect(await withinRateLimit(attempt)).toBe(false)
    expect(storedCount(attempt.key)).toMatchObject({ count: attempt.limit })
  })

  it("enforces the maximum across concurrent attempts", async () => {
    const outcomes = await Promise.all(Array.from({ length: 20 }, () => withinRateLimit(attempt)))

    expect(outcomes.filter(Boolean)).toHaveLength(attempt.limit)
  })

  it("reopens at the end of the window and is not extended by a refusal", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-26T10:00:00Z"))
    expect(await withinRateLimit({ ...attempt, limit: 1 })).toBe(true)
    vi.setSystemTime(new Date("2026-09-26T10:00:59Z"))
    expect(await withinRateLimit({ ...attempt, limit: 1 })).toBe(false)
    vi.setSystemTime(new Date("2026-09-26T10:01:00Z"))

    expect(await withinRateLimit({ ...attempt, limit: 1 })).toBe(true)
  })

  it("keeps one action's bucket away from another's", async () => {
    await withinRateLimit({ ...attempt, limit: 1 })

    expect(await withinRateLimit({ ...attempt, key: "create-user-address:203.0.113.7", limit: 1 })).toBe(true)
  })

  it("keeps one client's bucket away from another's", async () => {
    await withinRateLimit({ ...attempt, limit: 1 })

    expect(await withinRateLimit({ ...attempt, key: "update-customer-phone:203.0.113.8", limit: 1 })).toBe(true)
  })

  it("refuses the attempt when its storage is unavailable rather than letting it through", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("D1 unavailable")
    })

    expect(await withinRateLimit(attempt)).toBe(false)
    expect(log).toHaveBeenCalledOnce()
  })
})

describe("client address", () => {
  it("buckets an IPv4 client by its own address", () => {
    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "203.0.113.1" }))).toBe("203.0.113.1")
  })

  it("buckets every address in one IPv6 /64 together", () => {
    const first = clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "2001:db8:1:2:3:4:5:6" }))

    expect(first).toBe(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "2001:db8:1:2:ffff::1" })))
    expect(first).not.toBe(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "2001:db8:1:3::1" })))
  })

  it("shares one bucket for clients behind headers it does not trust", () => {
    expect(clientAddress(new Headers({ "X-Forwarded-For": "203.0.113.1" }))).toBe(clientAddress(new Headers()))
  })
})
