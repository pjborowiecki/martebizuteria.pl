import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

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

const { getUserEmailHistory } = await import("~/src/modules/user-email-history/user-email-history.accessors")

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into user (id, name, email, created_at, updated_at) values
      ('anna', 'Anna', 'anna@old.example', 1000, 1000),
      ('ola', 'Ola', 'ola@example.test', 1000, 1000),
      ('ewa', 'Ewa', 'ewa@example.test', 1000, 1000);
    update user set email = 'anna@new.example' where id = 'anna';
    update user set email = 'ewa@new.example' where id = 'ewa';
    update user set email = 'ewa@example.test' where id = 'ewa';
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getUserEmailHistory", () => {
  it("lists the addresses an account has used, the current one first", async () => {
    const history = await getUserEmailHistory("anna")

    expect(history.map(({ email, replacedAt }) => ({ current: replacedAt === null, email }))).toStrictEqual([
      { current: true, email: "anna@new.example" },
      { current: false, email: "anna@old.example" },
    ])
    expect(history[1]?.addedAt).toStrictEqual(new Date(1000))
  })
})
