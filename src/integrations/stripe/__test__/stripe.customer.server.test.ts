import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mocked = vi.hoisted(() => ({
  customersCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
  set: vi.fn<(values: object) => { where: () => Promise<unknown> }>(),
  userFindFirst: vi.fn<() => Promise<{ stripeCustomerId: string | null } | undefined>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: { user: { findFirst: mocked.userFindFirst } },
    update: () => ({ set: mocked.set }),
  },
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { customers: { create: mocked.customersCreate } } }))

import { ensureStripeCustomer, getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"

const CUSTOMER_INPUT = { email: "anna@example.com", name: "Anna Kowalska", userId: "user-1" }

beforeEach(() => {
  vi.clearAllMocks()
  mocked.set.mockReturnValue({ where: () => Promise.resolve(undefined) })
  mocked.customersCreate.mockResolvedValue({ id: "cus_new" })
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

  it("creates one customer for a first-time buyer and keeps it on the account", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).resolves.toBe("cus_new")
    expect(mocked.customersCreate).toHaveBeenCalledWith({
      email: "anna@example.com",
      metadata: { userId: "user-1" },
      name: "Anna Kowalska",
    })
    expect(mocked.set).toHaveBeenCalledWith(expect.objectContaining({ stripeCustomerId: "cus_new" }))
  })

  it("lets a Stripe failure surface instead of silently losing the customer", async () => {
    mocked.userFindFirst.mockResolvedValue({ stripeCustomerId: null })
    mocked.customersCreate.mockRejectedValue(new Error("stripe is unreachable"))

    await expect(ensureStripeCustomer(CUSTOMER_INPUT)).rejects.toThrow("stripe is unreachable")
    expect(mocked.set).not.toHaveBeenCalled()
  })
})
