import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const invalidation = vi.hoisted(() => ({ scheduleAdminNewsletterSubscribersInvalidation: vi.fn() }))

vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => invalidation)
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const { followAccountAddressChange } = await import("~/src/modules/newsletter/newsletter.address-change.server")

const CONFIRMED_AT = Date.UTC(2026, 3, 1)

const UNSUBSCRIBED_AT = Date.UTC(2026, 4, 1)

const rowsSchema = z.array(
  z.object({
    confirmed_at: z.number().nullable(),
    email: z.string(),
    id: z.string(),
    status: z.string(),
    token: z.string(),
    unsubscribed_at: z.number().nullable(),
    user_id: z.string().nullable(),
  }),
)

const subscribers = () =>
  rowsSchema.parse(
    sqlite
      .prepare("select id, email, status, token, user_id, confirmed_at, unsubscribed_at from newsletter_subscriber order by email")
      .all(),
  )

const subscribe = (id: string, email: string, status: "confirmed" | "pending" | "unsubscribed"): void => {
  sqlite
    .prepare(
      `insert into newsletter_subscriber (id, email, locale, source, status, token, confirmed_at, unsubscribed_at, created_at, updated_at)
       values (?, ?, 'pl-PL', 'landing', ?, ?, ?, ?, 0, 0)`,
    )
    .run(id, email, status, `token-${id}`, status === "pending" ? null : CONFIRMED_AT, status === "unsubscribed" ? UNSUBSCRIBED_AT : null)
}

const CHANGE = { from: "ada@old.example", to: "Ada@New.example", userId: "user-ada" }

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`insert into user (id, name, email, created_at, updated_at) values ('user-ada', 'Ada', 'ada@new.example', 0, 0)`)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec("delete from newsletter_subscriber")
})

afterAll(() => {
  sqlite.close()
})

describe("followAccountAddressChange", () => {
  it("moves the subscription of the old address to the new one, linked to the account, with a token the old inbox never saw", async () => {
    subscribe("old", "ada@old.example", "confirmed")

    await followAccountAddressChange(CHANGE)

    const [moved] = subscribers()
    expect(subscribers()).toHaveLength(1)
    expect(moved).toMatchObject({
      confirmed_at: CONFIRMED_AT,
      email: "ada@new.example",
      id: "old",
      status: "confirmed",
      user_id: "user-ada",
    })
    expect(moved?.token).not.toBe("token-old")
    expect(invalidation.scheduleAdminNewsletterSubscribersInvalidation).toHaveBeenCalledOnce()
  })

  it("lets an unconfirmed sign-up of the new address take over the confirmed subscription of the old one", async () => {
    subscribe("old", "ada@old.example", "confirmed")
    subscribe("new", "ada@new.example", "pending")

    await followAccountAddressChange(CHANGE)

    expect(subscribers()).toStrictEqual([
      {
        confirmed_at: CONFIRMED_AT,
        email: "ada@new.example",
        id: "new",
        status: "confirmed",
        token: "token-new",
        unsubscribed_at: null,
        user_id: "user-ada",
      },
    ])
  })

  it.each([
    ["confirmed", "confirmed"],
    ["unsubscribed", "confirmed"],
    ["pending", "unsubscribed"],
    ["pending", "pending"],
  ] as const)("keeps the %s state of the new address over the %s old one, and drops the old address", async (next, previous) => {
    subscribe("old", "ada@old.example", previous)
    subscribe("new", "ada@new.example", next)

    await followAccountAddressChange(CHANGE)

    expect(subscribers()).toStrictEqual([
      expect.objectContaining({ email: "ada@new.example", id: "new", status: next, user_id: "user-ada" }),
    ])
  })

  it("leaves everything alone when the old address had no subscription", async () => {
    subscribe("new", "ada@new.example", "confirmed")

    await followAccountAddressChange(CHANGE)

    expect(subscribers()).toStrictEqual([expect.objectContaining({ id: "new", user_id: null })])
    expect(invalidation.scheduleAdminNewsletterSubscribersInvalidation).not.toHaveBeenCalled()
  })
})
