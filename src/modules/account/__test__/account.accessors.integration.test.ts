import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { hasCredentialAccount } from "~/src/modules/account/account.accessors"
import { CREDENTIAL_PROVIDER_ID } from "~/src/modules/account/account.constants"

const CREATED_AT = Date.UTC(2026, 0, 10)

const insertAccount = (id: string, userId: string, providerId: string): void => {
  sqlite
    .prepare(`insert into account (id, account_id, provider_id, user_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?)`)
    .run(id, `${providerId}-${userId}`, providerId, userId, CREATED_AT, CREATED_AT)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists account;
    create table account (
      id text primary key, account_id text not null, provider_id text not null, user_id text not null,
      access_token text, access_token_expires_at integer, id_token text, password text, refresh_token text,
      refresh_token_expires_at integer, scope text, created_at integer not null, updated_at integer not null
    );
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("hasCredentialAccount", () => {
  it("reports a password for a customer who signed up with email and password", async () => {
    insertAccount("account-1", "user-1", CREDENTIAL_PROVIDER_ID)

    await expect(hasCredentialAccount("user-1")).resolves.toBe(true)
  })

  it("still reports a password for a customer who later linked a social sign-in", async () => {
    insertAccount("account-1", "user-1", "google")
    insertAccount("account-2", "user-1", CREDENTIAL_PROVIDER_ID)

    await expect(hasCredentialAccount("user-1")).resolves.toBe(true)
  })

  it("reports no password for a customer who only signs in through a social provider", async () => {
    insertAccount("account-1", "user-1", "google")
    insertAccount("account-2", "user-1", "github")

    await expect(hasCredentialAccount("user-1")).resolves.toBe(false)
  })

  it("does not borrow another customer's password", async () => {
    insertAccount("account-1", "user-2", CREDENTIAL_PROVIDER_ID)

    await expect(hasCredentialAccount("user-1")).resolves.toBe(false)
  })
})
