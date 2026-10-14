import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

const { recordEmailFailedAudit } = vi.hoisted(() => ({
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string; metadata?: Record<string, unknown> }) => void>(),
}))

vi.mock("cloudflare:workers", () => ({ env: { APP_ENV: "production" } }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordEmailFailedAudit }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite)) }
})

import {
  PUBLIC_EMAILS_DAILY_MAX,
  PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX,
  PUBLIC_EMAIL_KINDS,
  admitPublicEmail,
} from "~/src/integrations/resend/resend.public-email-limits.server"

const HOUR_MS = 3_600_000

const DAY_MS = 86_400_000

const NOW = new Date("2026-10-10T12:00:00.000Z")

const reset = { kind: PUBLIC_EMAIL_KINDS.PASSWORD_RESET, to: "anna@example.com" } as const

const storedKeys = (): string[] =>
  z
    .array(z.object({ key: z.string() }))
    .parse(sqlite.prepare("select key from rate_limit order by key").all())
    .map(({ key }) => key)

const admitTimes = async (times: number, email: Parameters<typeof admitPublicEmail>[0]): Promise<boolean[]> => {
  const answers: boolean[] = []
  for (let attempt = 0; attempt < times; attempt += 1) {
    answers.push(await admitPublicEmail(email))
  }

  return answers
}

const useUpTheDay = (): Promise<boolean[]> =>
  Promise.all(
    Array.from({ length: PUBLIC_EMAILS_DAILY_MAX }, (_, visitor) =>
      admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.NEWSLETTER, to: `visitor-${String(visitor)}@example.com` }),
    ),
  )

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  recordEmailFailedAudit.mockReset()
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
  sqlite.exec(`
    drop table if exists rate_limit;
    create table rate_limit (id text primary key, key text not null unique, count integer not null, last_request integer not null);
  `)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("emails per address", () => {
  it("admits a few emails of one kind to an address in an hour, then refuses the next and says why", async () => {
    expect(await admitTimes(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX + 1, reset)).toStrictEqual([
      ...Array.from({ length: PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX }, () => true),
      false,
    ])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "[Email] Skipped a password-reset email to anna@example.com: the address reached its hourly limit for this email",
    )
    expect(recordEmailFailedAudit).not.toHaveBeenCalled()
  })

  it("counts one address however it is written", async () => {
    await admitTimes(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX, reset)

    expect(await admitPublicEmail({ ...reset, to: "  Anna@Example.COM " })).toBe(false)
  })

  it("keeps each kind of email and each address to its own count", async () => {
    await admitTimes(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX, reset)

    expect(await admitPublicEmail({ ...reset, kind: PUBLIC_EMAIL_KINDS.VERIFICATION })).toBe(true)
    expect(await admitPublicEmail({ ...reset, to: "jan@example.com" })).toBe(true)
  })

  it("admits the address again an hour after its first email", async () => {
    await admitTimes(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX, reset)
    vi.setSystemTime(NOW.getTime() + HOUR_MS)

    expect(await admitPublicEmail(reset)).toBe(true)
  })

  it("stores a digest of the address rather than the address, under the environment's own keys", async () => {
    await admitPublicEmail(reset)

    const keys = storedKeys()

    expect(keys).toHaveLength(2)
    expect(keys).toContain("public-email:production:daily")
    expect(keys.join(" ")).not.toContain("anna")
    expect(keys.find((key) => key.startsWith("public-email:production:password-reset:"))).toBeDefined()
  })
})

describe("emails per day", () => {
  it("refuses every email visitors ask for once the shop has sent the day's limit, and records each in the audit log", async () => {
    expect(await useUpTheDay()).not.toContain(false)

    expect(await admitPublicEmail(reset)).toBe(false)
    expect(recordEmailFailedAudit).toHaveBeenCalledExactlyOnceWith("anna@example.com", {
      metadata: { dailyLimit: PUBLIC_EMAILS_DAILY_MAX, emailKind: "reset-password" },
    })
    expect(console.error).toHaveBeenCalledOnce()
  })

  it("admits emails again a day after the first one of the day", async () => {
    await useUpTheDay()
    vi.setSystemTime(NOW.getTime() + DAY_MS)

    expect(await admitPublicEmail(reset)).toBe(true)
  })

  it("leaves an email the address limit refused out of the day's count", async () => {
    await admitTimes(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX + 1, reset)

    expect(sqlite.prepare("select count from rate_limit where key = ?").get("public-email:production:daily")).toMatchObject({
      count: PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX,
    })
  })
})

describe("emails when the limits cannot be read", () => {
  it("sends nothing rather than letting emails through unchecked", async () => {
    sqlite.exec("drop table rate_limit")

    expect(await admitPublicEmail(reset)).toBe(false)
  })
})
