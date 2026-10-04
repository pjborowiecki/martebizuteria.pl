import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { createPasswordCustomer, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GITHUB_CLIENT_ID: "test-github-client",
    AUTH_GITHUB_CLIENT_SECRET: "test-github-secret",
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)) }))
vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({ linkSubscriberToUser: vi.fn(() => Promise.resolve()) }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const signOutDevice = (ip: string): void => {
  expect(sqlite.prepare("delete from session where ip_address = ?").run(ip).changes).toBe(1)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

afterAll(() => {
  sqlite.close()
})

describe("a session signed out from another device", () => {
  it("can no longer change the account through Better Auth's own endpoints", async () => {
    const customerId = await createPasswordCustomer("revoked@marte.test")
    const kept = openAuthBrowser("198.51.100.20")
    const revoked = openAuthBrowser("198.51.100.21")
    await kept.signIn("revoked@marte.test")
    await revoked.signIn("revoked@marte.test")
    signOutDevice("198.51.100.21")

    const response = await revoked.post("/update-user", { name: "Mallory" })

    expect(response.status).toBe(401)
    expect(sqlite.prepare("select name from user where id = ?").get(customerId)).toMatchObject({ name: "Ada" })
  })

  it("leaves the device that stayed signed in able to change the account", async () => {
    const customerId = await createPasswordCustomer("kept@marte.test")
    const kept = openAuthBrowser("198.51.100.22")
    const revoked = openAuthBrowser("198.51.100.23")
    await kept.signIn("kept@marte.test")
    await revoked.signIn("kept@marte.test")
    signOutDevice("198.51.100.23")

    const response = await kept.post("/update-user", { name: "Ada Lovelace" })

    expect(response.status).toBe(200)
    expect(sqlite.prepare("select name from user where id = ?").get(customerId)).toMatchObject({ name: "Ada Lovelace" })
  })
})
