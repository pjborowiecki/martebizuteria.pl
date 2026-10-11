import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { deleteExpiredVerifications } from "~/src/modules/verification/use-cases/delete-expired-verifications.server"

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

const NOW = new Date("2026-10-10T03:00:00.000Z")

const insertVerification = (id: string, expiresAt: number): void => {
  sqlite
    .prepare("insert into verification (id, identifier, value, expires_at) values (?, ?, 'hashed-token', ?)")
    .run(id, `reset-password:${id}`, expiresAt)
}

const remainingIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare("select id from verification order by id").all())
    .map(({ id }) => id)

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from verification")
})

afterAll(() => {
  sqlite.close()
})

describe("deleteExpiredVerifications on the migrated schema", () => {
  it("deletes the verification tokens that have expired and keeps the ones still usable", async () => {
    insertVerification("expired", NOW.getTime() - 1)
    insertVerification("usable", NOW.getTime() + 1)

    await expect(deleteExpiredVerifications({ expiredBefore: NOW, limit: 100 })).resolves.toBe(1)

    expect(remainingIds()).toStrictEqual(["usable"])
  })

  it("deletes at most the batch size at a time", async () => {
    for (const id of ["expired-a", "expired-b", "expired-c"]) {
      insertVerification(id, NOW.getTime() - 1)
    }

    await expect(deleteExpiredVerifications({ expiredBefore: NOW, limit: 2 })).resolves.toBe(2)
    await expect(deleteExpiredVerifications({ expiredBefore: NOW, limit: 2 })).resolves.toBe(1)
    expect(remainingIds()).toStrictEqual([])
  })
})
