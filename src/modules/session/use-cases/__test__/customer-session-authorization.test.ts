import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { revokeCustomerSession } from "../revoke-customer-session"
import { revokeOtherCustomerSessions } from "../revoke-other-customer-sessions"

const CALLER = {
  session: { id: "current-session" },
  user: { email: "ada@example.test", id: "current-customer", name: "Ada", role: "customer" },
}

const access = vi.hoisted(() => ({
  delete: vi.fn(),
  deleted: vi.fn<() => Promise<readonly { id: string }[]>>(),
  where: vi.fn<(condition: SQL | undefined) => unknown>(),
}))

const audit = vi.hoisted(() => ({
  recordAuthSessionsRevokedAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn((user: { id: string }) => `actor:${user.id}`),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    delete: access.delete,
  },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT; data?: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ context: CALLER_CONTEXT, data: builder.validate(options?.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate
        return builder
      },
    }

    return builder
  },
}))

const CALLER_CONTEXT = { auth: CALLER, requestHeaders: new Headers({ "cf-connecting-ip": "198.51.100.30" }) }

const dialect = new SQLiteSyncDialect()

describe("customer session data scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    access.deleted.mockResolvedValue([{ id: "other-session" }])
    access.where.mockReturnValue({ returning: access.deleted })
    access.delete.mockReturnValue({ where: access.where })
    audit.resolveAuthAuditActor.mockImplementation((user: { id: string }) => `actor:${user.id}`)
  })

  it("refuses to revoke the current session", async () => {
    await expect(revokeCustomerSession({ data: { sessionId: "current-session" } })).resolves.toBe(false)

    expect(access.delete).not.toHaveBeenCalled()
    expect(audit.recordAuthSessionsRevokedAudit).not.toHaveBeenCalled()
  })

  it("scopes single-session revocation to the authenticated customer", async () => {
    await expect(revokeCustomerSession({ data: { sessionId: "other-session" } })).resolves.toBe(true)

    const condition = access.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({
      params: ["other-session", "current-customer"],
      sql: '("session"."id" = ? and "session"."user_id" = ?)',
    })
  })

  it("records the signed-out device against the customer and the address they asked from", async () => {
    await revokeCustomerSession({ data: { sessionId: "other-session" } })

    expect(audit.resolveAuthAuditActor).toHaveBeenCalledWith(CALLER.user)
    expect(audit.recordAuthSessionsRevokedAudit).toHaveBeenCalledExactlyOnceWith("actor:current-customer", { ip: "198.51.100.30" })
  })

  it("records nothing when the session named is not one of the customer's", async () => {
    access.deleted.mockResolvedValue([])

    await expect(revokeCustomerSession({ data: { sessionId: "another-customers-session" } })).resolves.toBe(true)

    expect(audit.recordAuthSessionsRevokedAudit).not.toHaveBeenCalled()
  })

  it("keeps the current session when revoking the customer's other sessions", async () => {
    await expect(revokeOtherCustomerSessions()).resolves.toStrictEqual({ ok: true })

    const condition = access.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({
      params: ["current-customer", "current-session"],
      sql: '("session"."user_id" = ? and "session"."id" <> ?)',
    })
  })

  it("records signing out the customer's other devices", async () => {
    access.deleted.mockResolvedValue([{ id: "phone" }, { id: "laptop" }])

    await revokeOtherCustomerSessions()

    expect(audit.recordAuthSessionsRevokedAudit).toHaveBeenCalledExactlyOnceWith("actor:current-customer", { ip: "198.51.100.30" })
  })

  it("records nothing when the customer had no other device signed in", async () => {
    access.deleted.mockResolvedValue([])

    await expect(revokeOtherCustomerSessions()).resolves.toStrictEqual({ ok: true })

    expect(audit.recordAuthSessionsRevokedAudit).not.toHaveBeenCalled()
  })
})
