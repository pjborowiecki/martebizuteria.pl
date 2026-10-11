import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getCustomerOrder } from "../get-customer-order"
import { revokeCustomerSession } from "../revoke-customer-session"
import { revokeOtherCustomerSessions } from "../revoke-other-customer-sessions"
import { updateCustomerPhone } from "../update-customer-phone"

const CALLER = {
  session: { id: "current-session" },
  user: { email: "ada@example.test", id: "current-customer", name: "Ada", role: "customer" },
}

const access = vi.hoisted(() => ({
  delete: vi.fn(),
  deleted: vi.fn<() => Promise<readonly { id: string }[]>>(),
  order: vi.fn<(input: { where: SQL | undefined }) => Promise<undefined>>(),
  select: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
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
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string) => path }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    delete: access.delete,
    query: { order: { findFirst: access.order } },
    select: access.select,
    update: access.update,
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

describe("customer account data scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    access.order.mockResolvedValue(undefined)
    access.deleted.mockResolvedValue([{ id: "other-session" }])
    access.where.mockReturnValue({ returning: access.deleted })
    access.delete.mockReturnValue({ where: access.where })
    audit.resolveAuthAuditActor.mockImplementation((user: { id: string }) => `actor:${user.id}`)
    access.set.mockReturnValue({ where: access.where })
    access.update.mockReturnValue({ set: access.set })
  })

  it("scopes order lookups to the authenticated customer before reading order items", async () => {
    await expect(getCustomerOrder({ data: { orderId: "another-customers-order" } })).resolves.toBeUndefined()

    const condition = access.order.mock.calls[0]?.[0].where
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({
      params: ["another-customers-order", "current-customer"],
      sql: '("order"."id" = ? and "order"."user_id" = ?)',
    })
    expect(access.select).not.toHaveBeenCalled()
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

  it("updates only the authenticated customer's phone", async () => {
    await expect(updateCustomerPhone({ data: { phone: "+48123456789" } })).resolves.toBe(true)

    expect(access.set).toHaveBeenCalledWith({ phone: "+48123456789" })
    const condition = access.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({ params: ["current-customer"], sql: '"user"."id" = ?' })
  })

  it("clears the stored phone when the caller submits an empty value", async () => {
    await expect(updateCustomerPhone({ data: { phone: "" } })).resolves.toBe(true)

    expect(access.set).toHaveBeenCalledTimes(1)
  })
})
