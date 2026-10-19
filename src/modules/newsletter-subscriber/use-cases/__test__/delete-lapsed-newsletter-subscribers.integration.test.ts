import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { deleteLapsedNewsletterSubscribers } from "~/src/modules/newsletter-subscriber/use-cases/delete-lapsed-newsletter-subscribers.server"

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

const DAY_MS = 86_400_000

const NOW = Date.parse("2026-10-10T03:00:00.000Z")

const CUT_OFFS = {
  limit: 100,
  unconfirmedBefore: new Date(NOW - 30 * DAY_MS),
  unsubscribedBefore: new Date(NOW - 30 * DAY_MS),
}

interface SubscriberRow {
  readonly createdAt: number
  readonly id: string
  readonly status: string
  readonly unsubscribedAt?: number
  readonly updatedAt: number
}

const insertSubscriber = ({ createdAt, id, status, unsubscribedAt, updatedAt }: SubscriberRow): void => {
  sqlite
    .prepare(
      "insert into newsletter_subscriber (id, email, status, source, locale, token, unsubscribed_at, created_at, updated_at) values (?, ?, ?, 'landing', 'pl-PL', ?, ?, ?, ?)",
    )
    .run(id, `${id}@marte.test`, status, `token-${id}`, unsubscribedAt ?? null, createdAt, updatedAt)
}

const remainingIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare("select id from newsletter_subscriber order by id").all())
    .map(({ id }) => id)

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from newsletter_subscriber")
})

afterAll(() => {
  sqlite.close()
})

describe("deleteLapsedNewsletterSubscribers on the migrated schema", () => {
  it("deletes a sign-up left unconfirmed for more than 30 days and keeps a newer one", async () => {
    insertSubscriber({ createdAt: NOW - 31 * DAY_MS, id: "unconfirmed-31d", status: "pending", updatedAt: NOW - 31 * DAY_MS })
    insertSubscriber({ createdAt: NOW - 29 * DAY_MS, id: "unconfirmed-29d", status: "pending", updatedAt: NOW - 29 * DAY_MS })

    await expect(deleteLapsedNewsletterSubscribers(CUT_OFFS)).resolves.toBe(1)

    expect(remainingIds()).toStrictEqual(["unconfirmed-29d"])
  })

  it("counts an unconfirmed sign-up from the last time the address asked for a confirmation", async () => {
    insertSubscriber({
      createdAt: NOW - 400 * DAY_MS,
      id: "subscribed-again",
      status: "pending",
      unsubscribedAt: NOW - 200 * DAY_MS,
      updatedAt: NOW - 2 * DAY_MS,
    })

    await expect(deleteLapsedNewsletterSubscribers(CUT_OFFS)).resolves.toBe(0)

    expect(remainingIds()).toStrictEqual(["subscribed-again"])
  })

  it("deletes an address 30 days after it unsubscribed and keeps one that left more recently", async () => {
    insertSubscriber({
      createdAt: NOW - 400 * DAY_MS,
      id: "unsubscribed-31d",
      status: "unsubscribed",
      unsubscribedAt: NOW - 31 * DAY_MS,
      updatedAt: NOW - 31 * DAY_MS,
    })
    insertSubscriber({
      createdAt: NOW - 400 * DAY_MS,
      id: "unsubscribed-29d",
      status: "unsubscribed",
      unsubscribedAt: NOW - 29 * DAY_MS,
      updatedAt: NOW - 29 * DAY_MS,
    })

    await expect(deleteLapsedNewsletterSubscribers(CUT_OFFS)).resolves.toBe(1)

    expect(remainingIds()).toStrictEqual(["unsubscribed-29d"])
  })

  it("keeps a confirmed subscriber however long ago they signed up", async () => {
    insertSubscriber({ createdAt: NOW - 400 * DAY_MS, id: "confirmed", status: "confirmed", updatedAt: NOW - 400 * DAY_MS })

    await expect(deleteLapsedNewsletterSubscribers(CUT_OFFS)).resolves.toBe(0)

    expect(remainingIds()).toStrictEqual(["confirmed"])
  })

  it("deletes at most the batch size at a time", async () => {
    for (const id of ["lapsed-a", "lapsed-b", "lapsed-c"]) {
      insertSubscriber({ createdAt: NOW - 31 * DAY_MS, id, status: "pending", updatedAt: NOW - 31 * DAY_MS })
    }

    await expect(deleteLapsedNewsletterSubscribers({ ...CUT_OFFS, limit: 2 })).resolves.toBe(2)
    await expect(deleteLapsedNewsletterSubscribers({ ...CUT_OFFS, limit: 2 })).resolves.toBe(1)
    expect(remainingIds()).toStrictEqual([])
  })
})
