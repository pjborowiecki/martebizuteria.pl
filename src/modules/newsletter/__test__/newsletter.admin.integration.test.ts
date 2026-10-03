import { QueryClient } from "@tanstack/react-query"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

const guards = vi.hoisted(() => ({ permissions: [] as unknown[] }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  authorized: (permission: unknown) => {
    guards.permissions.push(permission)

    return {}
  },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validate: (input: unknown) => unknown } = { validate: (input) => input }
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => async (options?: { data: unknown }) => {
        await Promise.resolve()

        return handler({ data: state.validate(options?.data) })
      },
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        state.validate = validate

        return builder
      },
    }

    return builder
  },
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import newsletterMigration from "~/src/integrations/drizzle-orm/migrations/20261001090000_newsletter_subscribers.sql?raw"

import { insertSubscriber, linkSubscriberToUser } from "~/src/modules/newsletter/newsletter.accessors"
import {
  ADMIN_NEWSLETTER_PAGE_SIZE,
  NEWSLETTER_QUERY_KEYS,
  NEWSLETTER_QUERY_STALE_MS,
  NEWSLETTER_SOURCE,
  NEWSLETTER_STATUS,
  type NewsletterStatus,
} from "~/src/modules/newsletter/newsletter.constants"
import { getAdminNewsletterPage, getAdminNewsletterPageQuery } from "~/src/modules/newsletter/use-cases/get-admin-newsletter-page"
import { getNewsletterStats, getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

const LIST_USERS = { user: ["list"] }

const JOINED = {
  anna: new Date("2026-03-01T09:00:00.000Z"),
  ben: new Date("2026-03-02T09:00:00.000Z"),
  cara: new Date("2026-03-03T09:00:00.000Z"),
}

const CONFIRMED_AT = new Date("2026-03-01T10:00:00.000Z")

const UNSUBSCRIBED_AT = new Date("2026-03-04T10:00:00.000Z")

const seed = async (email: string, status: NewsletterStatus, extra: { readonly createdAt?: Date; readonly userId?: string } = {}) => {
  await insertSubscriber({
    createdAt: extra.createdAt ?? JOINED.anna,
    email,
    locale: "pl-PL",
    source: NEWSLETTER_SOURCE.LANDING,
    status,
    token: `token-${email}`,
    userId: extra.userId,
  })
}

const seedThreeSubscribers = async () => {
  await insertSubscriber({
    confirmedAt: CONFIRMED_AT,
    createdAt: JOINED.anna,
    email: "anna@example.com",
    id: "subscriber-anna",
    locale: "pl-PL",
    source: NEWSLETTER_SOURCE.LANDING,
    status: NEWSLETTER_STATUS.CONFIRMED,
    token: "token-anna",
  })
  await insertSubscriber({
    createdAt: JOINED.ben,
    email: "ben@example.com",
    id: "subscriber-ben",
    locale: "en-US",
    source: NEWSLETTER_SOURCE.CHECKOUT,
    status: NEWSLETTER_STATUS.PENDING,
    token: "token-ben",
  })
  await insertSubscriber({
    createdAt: JOINED.cara,
    email: "cara@example.com",
    id: "subscriber-cara",
    locale: "pl-PL",
    source: NEWSLETTER_SOURCE.ACCOUNT,
    status: NEWSLETTER_STATUS.UNSUBSCRIBED,
    token: "token-cara",
    unsubscribedAt: UNSUBSCRIBED_AT,
  })
}

const linkedUser = (email: string): string | null =>
  z.object({ user_id: z.string().nullable() }).parse(sqlite.prepare("select user_id from newsletter_subscriber where email = ?").get(email))
    .user_id

beforeEach(() => {
  sqlite.exec(`
    drop table if exists newsletter_subscriber;
    drop table if exists user;
    create table user (id text primary key);
    insert into user (id) values ('user-1'), ('user-2');
  `)
  sqlite.exec(newsletterMigration)
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("newsletter admin authorization", () => {
  it("lets only staff who may list users read the subscriber list and its stats", () => {
    expect(guards.permissions).toStrictEqual([LIST_USERS, LIST_USERS])
  })
})

describe("getAdminNewsletterPage", () => {
  it("lists the newest subscribers first with the dates that matter to each status", async () => {
    await seedThreeSubscribers()

    const page = await getAdminNewsletterPage({ data: {} })

    expect(page).toMatchObject({ hasMore: false, limit: ADMIN_NEWSLETTER_PAGE_SIZE, offset: 0, total: 3 })
    expect(page.items).toStrictEqual([
      {
        confirmedAt: undefined,
        createdAt: JOINED.cara,
        email: "cara@example.com",
        id: "subscriber-cara",
        locale: "pl-PL",
        source: NEWSLETTER_SOURCE.ACCOUNT,
        status: NEWSLETTER_STATUS.UNSUBSCRIBED,
        unsubscribedAt: UNSUBSCRIBED_AT,
      },
      {
        confirmedAt: undefined,
        createdAt: JOINED.ben,
        email: "ben@example.com",
        id: "subscriber-ben",
        locale: "en-US",
        source: NEWSLETTER_SOURCE.CHECKOUT,
        status: NEWSLETTER_STATUS.PENDING,
        unsubscribedAt: undefined,
      },
      {
        confirmedAt: CONFIRMED_AT,
        createdAt: JOINED.anna,
        email: "anna@example.com",
        id: "subscriber-anna",
        locale: "pl-PL",
        source: NEWSLETTER_SOURCE.LANDING,
        status: NEWSLETTER_STATUS.CONFIRMED,
        unsubscribedAt: undefined,
      },
    ])
  })

  it("never hands the confirmation token to the admin list", async () => {
    await seedThreeSubscribers()

    const page = await getAdminNewsletterPage({ data: {} })

    expect(page.items.flatMap((item) => Object.keys(item))).not.toContain("token")
  })

  it("pages through the list at the requested size and says whether more follow", async () => {
    await seedThreeSubscribers()

    const page = await getAdminNewsletterPage({ data: { page: 2, pageSize: 1 } })

    expect(page).toMatchObject({ hasMore: true, limit: 1, offset: 1, total: 3 })
    expect(page.items.map((item) => item.email)).toStrictEqual(["ben@example.com"])
  })

  it("finds subscribers by part of their address, ignoring case and surrounding spaces", async () => {
    await seedThreeSubscribers()

    const page = await getAdminNewsletterPage({ data: { search: "  BEN@ " } })

    expect(page.total).toBe(1)
    expect(page.items.map((item) => item.email)).toStrictEqual(["ben@example.com"])
  })

  it("lists everyone when the search is blank", async () => {
    await seedThreeSubscribers()

    await expect(getAdminNewsletterPage({ data: { search: "   " } })).resolves.toMatchObject({ total: 3 })
  })

  it("reports an empty list when nobody has signed up", async () => {
    await expect(getAdminNewsletterPage({ data: {} })).resolves.toStrictEqual({
      hasMore: false,
      items: [],
      limit: ADMIN_NEWSLETTER_PAGE_SIZE,
      offset: 0,
      total: 0,
    })
  })

  it("counts zero subscribers when the database returns no count row", async () => {
    vi.spyOn(db, "batch").mockResolvedValueOnce([[], []])

    await expect(getAdminNewsletterPage({ data: {} })).resolves.toMatchObject({ items: [], total: 0 })
  })

  it("refuses a page number below the first page", async () => {
    await expect(getAdminNewsletterPage({ data: { page: 0 } })).rejects.toThrow()
  })
})

describe("getAdminNewsletterPageQuery", () => {
  it("caches each page under the admin newsletter key with its own input", () => {
    const input = { page: 2, search: "anna" }

    expect(getAdminNewsletterPageQuery(input).queryKey).toStrictEqual([...NEWSLETTER_QUERY_KEYS.ADMIN.PAGE, input])
  })

  it("keeps a page fresh for the newsletter window without refetching on mount or focus", () => {
    const options = getAdminNewsletterPageQuery({})

    expect(options.staleTime).toBe(NEWSLETTER_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the page named in its key through the server function", async () => {
    await seedThreeSubscribers()
    const input = { page: 1, pageSize: 2 }
    const options = getAdminNewsletterPageQuery(input)

    const page = await options.queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: options.queryKey,
      signal: new AbortController().signal,
    })

    expect(page?.items.map((item) => item.email)).toStrictEqual(["cara@example.com", "ben@example.com"])
    expect(page).toMatchObject({ hasMore: true, total: 3 })
  })
})

describe("getNewsletterStats", () => {
  it("counts every subscriber and each status separately", async () => {
    await seed("anna@example.com", NEWSLETTER_STATUS.CONFIRMED)
    await seed("ben@example.com", NEWSLETTER_STATUS.CONFIRMED)
    await seed("cara@example.com", NEWSLETTER_STATUS.PENDING)
    await seed("dora@example.com", NEWSLETTER_STATUS.UNSUBSCRIBED)

    await expect(getNewsletterStats()).resolves.toStrictEqual({ confirmed: 2, pending: 1, total: 4, unsubscribed: 1 })
  })

  it("reports zeros for an empty list", async () => {
    await expect(getNewsletterStats()).resolves.toStrictEqual({ confirmed: 0, pending: 0, total: 0, unsubscribed: 0 })
  })

  it("reports zeros when the database returns no count rows", async () => {
    vi.spyOn(db, "batch").mockResolvedValueOnce([[], [], [], []])

    await expect(getNewsletterStats()).resolves.toStrictEqual({ confirmed: 0, pending: 0, total: 0, unsubscribed: 0 })
  })
})

describe("getNewsletterStatsQuery", () => {
  it("caches the stats under the admin stats key without refetching on mount or focus", () => {
    const options = getNewsletterStatsQuery()

    expect(options.queryKey).toStrictEqual(NEWSLETTER_QUERY_KEYS.ADMIN.STATS)
    expect(options.staleTime).toBe(NEWSLETTER_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the stats through the server function", async () => {
    await seed("anna@example.com", NEWSLETTER_STATUS.PENDING)

    const stats = await getNewsletterStatsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: NEWSLETTER_QUERY_KEYS.ADMIN.STATS,
      signal: new AbortController().signal,
    })

    expect(stats).toStrictEqual({ confirmed: 0, pending: 1, total: 1, unsubscribed: 0 })
  })
})

describe("linkSubscriberToUser", () => {
  it("attaches a guest subscription to the account later created with the same address", async () => {
    await seed("anna@example.com", NEWSLETTER_STATUS.CONFIRMED)

    await linkSubscriberToUser("  Anna@Example.COM ", "user-1")

    expect(linkedUser("anna@example.com")).toBe("user-1")
  })

  it("never moves a subscription that already belongs to another account", async () => {
    await seed("anna@example.com", NEWSLETTER_STATUS.CONFIRMED, { userId: "user-2" })

    await linkSubscriberToUser("anna@example.com", "user-1")

    expect(linkedUser("anna@example.com")).toBe("user-2")
  })

  it("leaves subscriptions for other addresses untouched", async () => {
    await seed("anna@example.com", NEWSLETTER_STATUS.CONFIRMED)
    await seed("ben@example.com", NEWSLETTER_STATUS.PENDING)

    await linkSubscriberToUser("anna@example.com", "user-1")

    expect(linkedUser("ben@example.com")).toBeNull()
  })
})
