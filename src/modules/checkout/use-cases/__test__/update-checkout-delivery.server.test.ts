import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: Object.assign(drizzle(createTestD1Database(sqlite), { schema }), { batch: batched.run }) }
})

interface PreparedStatement {
  readonly toSQL: () => { readonly params: unknown[]; readonly sql: string }
}

const batched = vi.hoisted(() => ({ run: vi.fn<(statements: readonly PreparedStatement[]) => Promise<unknown[]>>() }))

const context = vi.hoisted(() => ({ getCheckoutById: vi.fn() }))

vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutById: context.getCheckoutById }))

const { updateCheckoutDelivery } = await import("~/src/modules/checkout/use-cases/update-checkout-delivery.server")

const checkoutValues: CheckoutFormSchema = {
  address1: "Kwiatowa 12",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "delivery-inpost",
  deliveryNotes: "Leave at the locker",
  email: "anna@example.test",
  firstName: "Anna",
  lastName: "Kowalska",
  lockerId: "WAW01A",
  phone: "+48600100200",
  postalCode: "00-001",
}

const statement = () => {
  const checkoutUpdate = batched.run.mock.calls[0]?.[0].find((query) => query.toSQL().sql.startsWith('update "checkout"'))
  if (checkoutUpdate === undefined) {
    throw new Error("expected a checkout update in the batch")
  }

  return checkoutUpdate.toSQL()
}

const textParams = (): unknown[] => statement().params.filter((param) => typeof param === "string")

beforeEach(() => {
  vi.clearAllMocks()
  batched.run.mockResolvedValue([[], [{ id: "checkout-1" }]])
  context.getCheckoutById.mockImplementation((id: string) =>
    Promise.resolve({ billingAddressId: "address-1", id, shippingAddressId: "address-1", status: "pending", userId: null }),
  )
})

afterAll(() => {
  sqlite.close()
})

describe("updateCheckoutDelivery", () => {
  it("submits address and checkout updates together in one batch", async () => {
    await updateCheckoutDelivery("checkout-1", checkoutValues)

    expect(batched.run).toHaveBeenCalledTimes(1)
    expect(batched.run.mock.calls[0]?.[0]).toHaveLength(2)
  })

  it("updates the checkout row rather than inserting another one", async () => {
    await updateCheckoutDelivery("checkout-1", checkoutValues)

    expect(statement().sql).toContain('update "checkout"')
  })

  it("writes the chosen delivery method, locker and note for that checkout", async () => {
    await updateCheckoutDelivery("checkout-1", checkoutValues)

    expect(textParams()).toStrictEqual([
      "address-1",
      "Leave at the locker",
      "delivery-inpost",
      "anna@example.test",
      "WAW01A",
      "address-1",
      "checkout-1",
      "pending",
    ])
  })

  it("refreshes the row timestamp on every delivery change", async () => {
    await updateCheckoutDelivery("checkout-1", checkoutValues)

    expect(statement().params.filter((param) => typeof param === "number")).toHaveLength(1)
  })

  it("clears an omitted locker while leaving an omitted note out of the update", async () => {
    await updateCheckoutDelivery("checkout-2", { ...checkoutValues, deliveryNotes: undefined, lockerId: undefined })

    expect(textParams()).toStrictEqual(["address-1", "delivery-inpost", "anna@example.test", "address-1", "checkout-2", "pending"])
    expect(statement().sql).toContain('"locker_id" = NULL')
  })

  it("rejects the update when the batch reports no updated checkout", async () => {
    batched.run.mockResolvedValueOnce([[], []])

    await expect(updateCheckoutDelivery("checkout-1", checkoutValues)).rejects.toThrow("CONFLICT")
  })
})
