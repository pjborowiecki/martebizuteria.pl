import { type SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { updateCustomerPhone } from "../update-customer-phone"

const CALLER = {
  session: { id: "current-session" },
  user: { email: "ada@example.test", id: "current-customer", name: "Ada", role: "customer" },
}

const access = vi.hoisted(() => ({
  set: vi.fn(),
  update: vi.fn(),
  where: vi.fn<(condition: SQL | undefined) => unknown>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
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

describe("customer phone data scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    access.where.mockReturnValue({})
    access.set.mockReturnValue({ where: access.where })
    access.update.mockReturnValue({ set: access.set })
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
