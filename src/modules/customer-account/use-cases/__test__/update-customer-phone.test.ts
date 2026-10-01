import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { setValues, whereConditions } = vi.hoisted(() => ({
  setValues: vi.fn<(values: Record<string, unknown>) => void>(),
  whereConditions: vi.fn<(condition: unknown) => void>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        setValues(values)

        return {
          where: (condition: unknown) => {
            whereConditions(condition)

            return Promise.resolve(undefined)
          },
        }
      },
    }),
  },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options: { data: unknown }) =>
        Promise.resolve(options.data)
          .then((data) => (state.validator === undefined ? data : state.validator(data)))
          .then((data) => handler({ context: { auth: { user: { id: "user-1" } } }, data })),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { SQL } from "drizzle-orm"

import { updateCustomerPhone } from "~/src/modules/customer-account/use-cases/update-customer-phone"

const TOO_LONG_PHONE = "+4860012345678901234567890123456789"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("updateCustomerPhone", () => {
  it("stores the phone number the customer submitted", async () => {
    await updateCustomerPhone({ data: { phone: "+48600123456" } })

    expect(setValues).toHaveBeenCalledWith({ phone: "+48600123456" })
  })

  it("confirms the update", async () => {
    await expect(updateCustomerPhone({ data: { phone: "+48600123456" } })).resolves.toBe(true)
  })

  it("clears the stored number when the customer submits an empty one", async () => {
    await updateCustomerPhone({ data: { phone: "" } })

    expect(setValues.mock.calls[0]?.[0]?.["phone"]).toBeInstanceOf(SQL)
  })

  it("scopes the update to the signed-in customer", async () => {
    await updateCustomerPhone({ data: { phone: "+48600123456" } })

    expect(whereConditions.mock.calls[0]?.[0]).toBeInstanceOf(SQL)
  })

  it("stores the number without the padding the customer typed around it", async () => {
    await updateCustomerPhone({ data: { phone: "  +48 600 123 456  " } })

    expect(setValues).toHaveBeenCalledWith({ phone: "+48 600 123 456" })
  })

  it("clears the column for a number that was only whitespace", async () => {
    await updateCustomerPhone({ data: { phone: "   " } })

    expect(setValues.mock.calls[0]?.[0]["phone"]).toBeInstanceOf(SQL)
  })

  it("rejects a phone number longer than the column allows", async () => {
    await expect(updateCustomerPhone({ data: { phone: TOO_LONG_PHONE } })).rejects.toThrow()

    expect(setValues).not.toHaveBeenCalled()
  })
})
