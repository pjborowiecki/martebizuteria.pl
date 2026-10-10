import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const counter = vi.hoisted(() => ({
  admitted: [] as { key: string }[],
  conditions: [] as SQL[],
  rows: [] as unknown[],
  unavailable: false,
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    insert: () => {
      if (counter.unavailable) {
        throw new Error("D1 unavailable")
      }

      return {
        values: (row: unknown) => {
          counter.rows.push(row)

          return {
            onConflictDoUpdate: ({ setWhere }: { setWhere: SQL }) => {
              counter.conditions.push(setWhere)

              return { returning: () => Promise.resolve(counter.admitted) }
            },
          }
        },
      }
    },
  },
}))

const { authRateLimitStorage } = await import("~/src/lib/rate-limit")

const NOW = new Date("2026-10-10T12:00:00.000Z")

const KEY = "192.0.2.1|/sign-in/email"

const SIGN_IN_RULE = { max: 5, window: 60 }

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  counter.admitted = [{ key: KEY }]
  counter.conditions = []
  counter.rows = []
  counter.unavailable = false
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("better Auth's rate-limit storage", () => {
  it("allows a request the counter admits with no wait", async () => {
    await expect(authRateLimitStorage.consume(KEY, SIGN_IN_RULE)).resolves.toStrictEqual({ allowed: true, retryAfter: 0 })
    expect(counter.rows).toStrictEqual([expect.objectContaining({ count: 1, key: KEY, lastRequest: NOW.getTime() })])
  })

  it("counts the request against the rule's maximum within the rule's window", async () => {
    await authRateLimitStorage.consume(KEY, SIGN_IN_RULE)

    expect(counter.conditions.map((condition) => new SQLiteSyncDialect().sqlToQuery(condition).params)).toStrictEqual([
      [NOW.getTime() - SIGN_IN_RULE.window * 1000, SIGN_IN_RULE.max],
    ])
  })

  it("refuses a request past the maximum and asks to retry after the rule's window", async () => {
    counter.admitted = []

    await expect(authRateLimitStorage.consume(KEY, SIGN_IN_RULE)).resolves.toStrictEqual({
      allowed: false,
      retryAfter: SIGN_IN_RULE.window,
    })
  })

  it("refuses every request while the counter cannot be stored", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    counter.unavailable = true

    await expect(authRateLimitStorage.consume(KEY, SIGN_IN_RULE)).resolves.toStrictEqual({
      allowed: false,
      retryAfter: SIGN_IN_RULE.window,
    })
    expect(log).toHaveBeenCalledOnce()
  })
})
