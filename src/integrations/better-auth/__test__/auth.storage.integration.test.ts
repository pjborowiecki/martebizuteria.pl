import { readFileSync } from "node:fs"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { auth } from "~/src/integrations/better-auth/auth.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

const storageMigration = readFileSync(
  new URL("../../drizzle-orm/migrations/20260920212415_auth_database_storage.sql", import.meta.url),
  "utf8",
)

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GITHUB_CLIENT_ID: "test-github-client",
    AUTH_GITHUB_CLIENT_SECRET: "test-github-secret",
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({
  sendEmail: vi.fn(() => Promise.resolve(undefined)),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")

  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

describe("better Auth database storage", () => {
  beforeEach(() => {
    sqlite.exec(`
      drop table if exists rate_limit;
      drop table if exists two_factor;
      drop table if exists verification;
      create table two_factor (id text primary key);
      insert into two_factor (id) values ('existing-two-factor');
      create table verification (
        id text primary key,
        identifier text not null,
        value text not null,
        expires_at integer not null,
        created_at integer not null,
        updated_at integer not null
      );
    `)
    sqlite.exec(storageMigration)
  })

  afterAll(() => {
    sqlite.close()
  })

  it("adds rate-limit storage and initializes lockout fields without losing existing two-factor records", () => {
    expect(sqlite.prepare("select * from two_factor").get()).toMatchObject({
      failed_verification_count: 0,
      id: "existing-two-factor",
      locked_until: null,
    })
  })

  it("uses database sessions, verifications and rate limits with stable joins", () => {
    expect(auth.options).not.toHaveProperty("secondaryStorage")
    expect(auth.options.advanced.database.joins).toBe(true)
    expect(auth.options.session).toMatchObject({ cookieCache: { version: "2" }, storeSessionInDatabase: true })
    expect(auth.options.verification.storeInDatabase).toBe(true)
    expect(auth.options.rateLimit).toMatchObject({
      customRules: {
        "/request-password-reset": { max: 3, window: 60 },
        "/reset-password": { max: 5, window: 60 },
        "/sign-in/email": { max: 5, window: 60 },
        "/sign-up/email": { max: 3, window: 60 },
      },
      enabled: true,
      max: 100,
      storage: "database",
      window: 60,
    })
  })

  it("consumes a verification token only once across concurrent callers", async () => {
    const { internalAdapter } = await auth.$context
    await internalAdapter.createVerificationValue({
      expiresAt: new Date(Date.now() + 60_000),
      identifier: "single-use-token",
      value: "verified-customer",
    })

    const results = await Promise.all([
      internalAdapter.consumeVerificationValue("single-use-token"),
      internalAdapter.consumeVerificationValue("single-use-token"),
    ])

    expect(results.filter((result) => result !== null)).toStrictEqual([expect.objectContaining({ value: "verified-customer" })])
    expect(results.filter((result) => result === null)).toHaveLength(1)
  })

  it("denies concurrent sign-in attempts after the configured database limit", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        auth.handler(
          new Request("http://localhost:3000/api/auth/sign-in/email", {
            body: JSON.stringify({}),
            headers: { "Content-Type": "application/json", "cf-connecting-ip": "192.0.2.1" },
            method: "POST",
          }),
        ),
      ),
    )

    expect(attempts.filter((response) => response.status === 400)).toHaveLength(5)
    expect(attempts.filter((response) => response.status === 429)).toHaveLength(3)
    expect(sqlite.prepare("select count from rate_limit").get()).toMatchObject({ count: 5 })
  })
})
