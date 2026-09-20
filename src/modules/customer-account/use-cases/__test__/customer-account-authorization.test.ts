import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fetchCustomerOrderByIdFn } from "../get-customer-order"
import { revokeCustomerSessionFn } from "../revoke-customer-session"
import { revokeOtherCustomerSessionsFn } from "../revoke-other-customer-sessions"
import { updateCustomerPhoneFn } from "../update-customer-phone"

const access = vi.hoisted(() => ({
  delete: vi.fn(),
  getSession: vi.fn(),
  order: vi.fn<(input: { where: SQL | undefined }) => Promise<undefined>>(),
  select: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  where: vi.fn<(condition: SQL | undefined) => Promise<void>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: access.getSession }))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string) => path }))
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
      handler: (handler: unknown) => handler,
      validator: () => builder,
    }
    return builder
  },
}))

const dialect = new SQLiteSyncDialect()

describe("customer account RPC authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    access.getSession.mockResolvedValue({ session: { id: "current-session" }, user: { id: "current-customer" } })
    access.order.mockResolvedValue(undefined)
    access.where.mockResolvedValue(undefined)
    access.delete.mockReturnValue({ where: access.where })
    access.set.mockReturnValue({ where: access.where })
    access.update.mockReturnValue({ set: access.set })
  })

  it.each([
    { name: "order details", result: undefined, run: () => fetchCustomerOrderByIdFn({ data: { orderId: "order-id" } }) },
    { name: "session revocation", result: false, run: () => revokeCustomerSessionFn({ data: { sessionId: "other-session" } }) },
    { name: "bulk session revocation", result: { ok: true }, run: () => revokeOtherCustomerSessionsFn() },
    { name: "phone updates", result: false, run: () => updateCustomerPhoneFn({ data: { phone: "+48123456789" } }) },
  ])("does not access private data for $name without a session", async ({ result, run }) => {
    access.getSession.mockResolvedValue(null)

    await expect(run()).resolves.toStrictEqual(result)

    expect(access.order).not.toHaveBeenCalled()
    expect(access.select).not.toHaveBeenCalled()
    expect(access.delete).not.toHaveBeenCalled()
    expect(access.update).not.toHaveBeenCalled()
  })

  it("scopes order lookups to the authenticated customer before reading order items", async () => {
    await expect(fetchCustomerOrderByIdFn({ data: { orderId: "another-customers-order" } })).resolves.toBeUndefined()

    const condition = access.order.mock.calls[0]?.[0].where
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({
      params: ["another-customers-order", "current-customer"],
      sql: '("order"."id" = ? and "order"."user_id" = ?)',
    })
    expect(access.select).not.toHaveBeenCalled()
  })

  it("refuses to revoke the current session", async () => {
    await expect(revokeCustomerSessionFn({ data: { sessionId: "current-session" } })).resolves.toBe(false)

    expect(access.delete).not.toHaveBeenCalled()
  })

  it("scopes single-session revocation to the authenticated customer", async () => {
    await expect(revokeCustomerSessionFn({ data: { sessionId: "other-session" } })).resolves.toBe(true)

    const condition = access.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({
      params: ["other-session", "current-customer"],
      sql: '("session"."id" = ? and "session"."user_id" = ?)',
    })
  })

  it("keeps the current session when revoking the customer's other sessions", async () => {
    await expect(revokeOtherCustomerSessionsFn()).resolves.toStrictEqual({ ok: true })

    const condition = access.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({
      params: ["current-customer", "current-session"],
      sql: '("session"."user_id" = ? and "session"."id" <> ?)',
    })
  })

  it("updates only the authenticated customer's phone", async () => {
    await expect(updateCustomerPhoneFn({ data: { phone: "+48123456789" } })).resolves.toBe(true)

    expect(access.set).toHaveBeenCalledWith({ phone: "+48123456789" })
    const condition = access.where.mock.calls[0]?.[0]
    expect(condition).toBeDefined()
    expect(dialect.sqlToQuery(condition!)).toMatchObject({ params: ["current-customer"], sql: '"user"."id" = ?' })
  })
})
