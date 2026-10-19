import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const audit = vi.hoisted(() => ({ recordCustomerRegisteredAudit: vi.fn() }))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: audit.recordCustomerRegisteredAudit,
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/order/use-cases/claim-guest-orders.server", () => ({ claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)) }))
vi.mock("~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors", () => ({
  linkSubscriberToUser: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const rowCount = z.object({ rows: z.number() })

const countRows = (table: "session" | "user"): number => rowCount.parse(sqlite.prepare(`select count(*) as rows from ${table}`).get()).rows

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

afterAll(() => {
  sqlite.close()
})

describe("an anonymous sign-in request", () => {
  it("finds no endpoint, so it creates no customer, no session and no registration in the audit log", async () => {
    const response = await openAuthBrowser("198.51.100.40").post("/sign-in/anonymous", {})

    expect(response.status).toBe(404)
    expect(response.headers.getSetCookie()).toStrictEqual([])
    expect(countRows("user")).toBe(0)
    expect(countRows("session")).toBe(0)
    expect(audit.recordCustomerRegisteredAudit).not.toHaveBeenCalled()
  })
})
