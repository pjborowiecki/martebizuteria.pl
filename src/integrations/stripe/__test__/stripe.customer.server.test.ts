import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  customersCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
  customersDel: vi.fn<(id: string) => Promise<unknown>>(),
  returning: vi.fn<() => Promise<{ stripeCustomerId: string | null }[]>>(),
  set: vi.fn<(values: object) => { where: () => { returning: () => Promise<{ stripeCustomerId: string | null }[]> } }>(),
  userFindFirst: vi.fn<() => Promise<{ stripeCustomerId: string | null } | undefined>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: { user: { findFirst: mocked.userFindFirst } },
    update: () => ({ set: mocked.set }),
  },
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { customers: { create: mocked.customersCreate, del: mocked.customersDel } },
}))

import { ensureStripeCustomer, getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const CUSTOMER_INPUT = { email: "anna@example.com", name: "Anna Kowalska", userId: "user-1" }

beforeEach(() => {
  vi.clearAllMocks()
  mocked.set.mockReturnValue({ where: () => ({ returning: mocked.returning }) })
  mocked.returning.mockResolvedValue([{ stripeCustomerId: "cus_new" }])
  mocked.customersCreate.mockResolvedValue({ id: "cus_new" })
  mocked.customersDel.mockResolvedValue({ deleted: true })
})

describe("getStripeCustomerId", () => {
  it("reads the id stored against the account", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: "cus_stored" })

    await expect(getStripeCustomerId("user-1")).resolves.toBe("cus_stored")
  })

  it("reports no id for an account that has never paid", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })

    await expect(getStripeCustomerId("user-1")).resolves.toBeUndefined()
  })

  it("reports no id for an account that does not exist", async () => {
    mocked.userFindFirst.mockResolvedValue(undefined)

    await expect(getStripeCustomerId("user-1")).resolves.toBeUndefined()
  })
})

describe("ensureStripeCustomer", () => {
  it("reuses the customer the account already has", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: "cus_stored" })

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).resolves.toBe("cus_stored")
    expect(mocked.customersCreate).not.toHaveBeenCalled()
  })

  it("creates a customer for a first-time buyer and keeps the one it created", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).resolves.toBe("cus_new")
    expect(mocked.customersCreate).toHaveBeenCalledExactlyOnceWith({
      email: "anna@example.com",
      metadata: { userId: "user-1" },
      name: "Anna Kowalska",
    })
    expect(mocked.customersDel).not.toHaveBeenCalled()
  })

  it("deletes the customer it created when a parallel request stored another one first", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })
    mocked.returning.mockResolvedValue([{ stripeCustomerId: "cus_parallel" }])

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).resolves.toBe("cus_parallel")
    expect(mocked.customersDel).toHaveBeenCalledExactlyOnceWith("cus_new")
  })

  it("still hands out the stored customer when the unused one cannot be deleted", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })
    mocked.returning.mockResolvedValue([{ stripeCustomerId: "cus_parallel" }])
    mocked.customersDel.mockRejectedValue(new Error("stripe is unreachable"))

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).resolves.toBe("cus_parallel")
    expect(consoleError).toHaveBeenCalledWith("Failed to delete an unused Stripe customer:", expect.any(Error))
    consoleError.mockRestore()
  })

  it("refuses to hand out a customer for an account that no longer exists, and deletes the one it created", async () => {
    mocked.userFindFirst.mockResolvedValue(undefined)
    mocked.returning.mockResolvedValue([])

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    expect(mocked.customersDel).toHaveBeenCalledExactlyOnceWith("cus_new")
  })

  it("lets a Stripe failure surface instead of silently losing the customer", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })
    mocked.customersCreate.mockRejectedValue(new Error("stripe is unreachable"))

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).rejects.toThrow("stripe is unreachable")
    expect(mocked.set).not.toHaveBeenCalled()
  })
})
