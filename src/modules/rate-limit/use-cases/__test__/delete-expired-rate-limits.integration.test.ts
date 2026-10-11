import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { RATE_LIMIT_WINDOW_SECONDS } from "~/src/modules/rate-limit/rate-limit.constants"
import { deleteExpiredRateLimits } from "~/src/modules/rate-limit/use-cases/delete-expired-rate-limits.server"

import { withinRateLimit } from "~/src/lib/rate-limit"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const MINUTE_MS = 60_000

const HOUR_MS = 3_600_000

const DAY_MS = 86_400_000

const NOW = new Date("2026-10-10T03:00:00.000Z")

const ago = (milliseconds: number): number => NOW.getTime() - milliseconds

const RECIPIENT_COUNTER = "public-email:production:password-reset:9kV2q4n0E1oQvJ8sXg7mYc3aR5bT6uW1zL0pH2dF4eI="

const DAILY_COUNTER = "public-email:production:daily"

const insertCounter = (key: string, lastRequest: number): void => {
  sqlite.prepare("insert into rate_limit (id, key, count, last_request) values (?, ?, 3, ?)").run(`id-${key}`, key, lastRequest)
}

const remainingKeys = (): string[] =>
  z
    .array(z.object({ key: z.string() }))
    .parse(sqlite.prepare("select key from rate_limit order by key").all())
    .map(({ key }) => key)

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from rate_limit")
})

afterAll(() => {
  sqlite.close()
})

describe("deleteExpiredRateLimits on the migrated schema", () => {
  it("deletes a request counter once its one-minute window has ended and keeps one still counting", async () => {
    insertCounter("checkout:203.0.113.7", ago(MINUTE_MS + 1))
    insertCounter("198.51.100.20/sign-in/email", ago(30_000))

    await expect(deleteExpiredRateLimits({ limit: 100, now: NOW })).resolves.toBe(1)

    expect(remainingKeys()).toStrictEqual(["198.51.100.20/sign-in/email"])
  })

  it("keeps an address's e-mail counter for its hour and deletes it after", async () => {
    insertCounter(RECIPIENT_COUNTER, ago(HOUR_MS - MINUTE_MS))
    insertCounter(RECIPIENT_COUNTER.replace("password-reset", "newsletter"), ago(HOUR_MS + 1))

    await expect(deleteExpiredRateLimits({ limit: 100, now: NOW })).resolves.toBe(1)

    expect(remainingKeys()).toStrictEqual([RECIPIENT_COUNTER])
  })

  it("keeps the shop's daily e-mail counter for its day and deletes it after", async () => {
    insertCounter(DAILY_COUNTER, ago(DAY_MS - HOUR_MS))
    insertCounter("public-email:preview:daily", ago(DAY_MS + 1))

    await expect(deleteExpiredRateLimits({ limit: 100, now: NOW })).resolves.toBe(1)

    expect(remainingKeys()).toStrictEqual([DAILY_COUNTER])
  })

  it("deletes at most the batch size at a time", async () => {
    for (const key of ["sign-in:a", "sign-in:b", "sign-in:c"]) {
      insertCounter(key, ago(2 * DAY_MS))
    }

    await expect(deleteExpiredRateLimits({ limit: 2, now: NOW })).resolves.toBe(2)
    await expect(deleteExpiredRateLimits({ limit: 2, now: NOW })).resolves.toBe(1)
    expect(remainingKeys()).toStrictEqual([])
  })
})

describe("deleteExpiredRateLimits and the counters withinRateLimit keeps", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("never resets the shop's daily e-mail cap before its day has passed", async () => {
    vi.useFakeTimers({ now: ago(DAY_MS - HOUR_MS), toFake: ["Date"] })
    const dailyCap = { key: DAILY_COUNTER, limit: 1, windowSeconds: RATE_LIMIT_WINDOW_SECONDS.PUBLIC_EMAIL_DAILY }

    await expect(withinRateLimit(dailyCap)).resolves.toBe(true)
    await expect(withinRateLimit(dailyCap)).resolves.toBe(false)

    vi.setSystemTime(NOW)
    await expect(deleteExpiredRateLimits({ limit: 100, now: NOW })).resolves.toBe(0)
    await expect(withinRateLimit(dailyCap)).resolves.toBe(false)

    const dayOver = new Date(ago(DAY_MS - HOUR_MS) + DAY_MS + 1)
    vi.setSystemTime(dayOver)
    await expect(deleteExpiredRateLimits({ limit: 100, now: dayOver })).resolves.toBe(1)
    await expect(withinRateLimit(dailyCap)).resolves.toBe(true)
  })
})
