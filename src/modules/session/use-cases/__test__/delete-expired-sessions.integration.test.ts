import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { deleteExpiredSessions } from "~/src/modules/session/use-cases/delete-expired-sessions.server"

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

const insertSession = (id: string, expiresAt: number): void => {
  sqlite
    .prepare(
      "insert into session (id, token, user_id, ip_address, user_agent, expires_at) values (?, ?, 'user-ada', '203.0.113.7', 'Firefox', ?)",
    )
    .run(id, `token-${id}`, expiresAt)
}

const remainingIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare("select id from session order by id").all())
    .map(({ id }) => id)

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec("insert into user (id, name, email) values ('user-ada', 'Ada Nowak', 'ada@marte.test')")
})

beforeEach(() => {
  sqlite.exec("delete from session")
})

afterAll(() => {
  sqlite.close()
})

describe("deleteExpiredSessions on the migrated schema", () => {
  it("deletes the sessions that have expired, with their IP address and browser, and keeps the live ones", async () => {
    insertSession("expired", NOW.getTime() - 1)
    insertSession("live", NOW.getTime() + 1)

    await expect(deleteExpiredSessions({ expiredBefore: NOW, limit: 100 })).resolves.toBe(1)

    expect(remainingIds()).toStrictEqual(["live"])
  })

  it("deletes at most the batch size at a time", async () => {
    for (const id of ["expired-a", "expired-b", "expired-c"]) {
      insertSession(id, NOW.getTime() - 1)
    }

    await expect(deleteExpiredSessions({ expiredBefore: NOW, limit: 2 })).resolves.toBe(2)
    await expect(deleteExpiredSessions({ expiredBefore: NOW, limit: 2 })).resolves.toBe(1)
    expect(remainingIds()).toStrictEqual([])
  })
})
