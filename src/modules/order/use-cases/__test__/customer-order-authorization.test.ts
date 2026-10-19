import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getCustomerOrder } from "../get-customer-order"

const CALLER = {
  session: { id: "current-session" },
  user: { email: "ada@example.test", id: "current-customer", name: "Ada", role: "customer" },
}

const access = vi.hoisted(() => ({
  order: vi.fn<(input: { where: SQL | undefined }) => Promise<undefined>>(),
  select: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string) => path }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: { order: { findFirst: access.order } },
    select: access.select,
  },
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
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

describe("customer order data scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    access.order.mockResolvedValue(undefined)
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
})
