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

const { getUserEmailHistory, resolveAccountAddress } = await import("~/src/modules/user-email-history/user-email-history.accessors")

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

describe("resolveAccountAddress", () => {
  it.each([
    { email: " Anna@Old.example", expected: "anna@new.example", name: "an address the account has replaced", userId: "anna" },
    { email: "anna@new.example", expected: "anna@new.example", name: "the account's current address", userId: "anna" },
    { email: "gift@example.test", expected: "gift@example.test", name: "an address the account never used", userId: "anna" },
    { email: "ola@example.test", expected: "ola@example.test", name: "another account's address", userId: "anna" },
    { email: "ewa@example.test", expected: "ewa@example.test", name: "an address the account came back to", userId: "ewa" },
  ])("answers $name with the address the account's mail should go to", async ({ email, expected, userId }) => {
    await expect(resolveAccountAddress({ email, userId })).resolves.toBe(expected)
  })
})
