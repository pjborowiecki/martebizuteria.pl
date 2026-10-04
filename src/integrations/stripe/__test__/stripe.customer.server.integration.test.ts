import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { customersCreate, customersDel, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    customersCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
    customersDel: vi.fn<(id: string) => Promise<{ deleted: true }>>(() => Promise.resolve({ deleted: true })),
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { customers: { create: customersCreate, del: customersDel } } }))

import { ensureStripeCustomer } from "~/src/integrations/stripe/stripe.customer.server"

const ANNA = { email: "anna@example.com", name: "Anna Kowalska", userId: "user-1" }

const storedCustomerId = (userId: string): string | null =>
  z
    .object({ stripe_customer_id: z.string().nullable() })
    .parse(sqlite.prepare(`select stripe_customer_id from "user" where id = ?`).get(userId)).stripe_customer_id

const storeCustomerId = (userId: string, customerId: string): void => {
  sqlite.prepare(`update "user" set stripe_customer_id = ? where id = ?`).run(customerId, userId)
}

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec(`
    drop table if exists "user";
    create table "user" (id text primary key, stripe_customer_id text, updated_at integer not null);
    insert into "user" (id, stripe_customer_id, updated_at) values ('user-1', null, 0), ('user-2', 'cus_existing', 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("ensureStripeCustomer", () => {
  it("stores the customer it creates for a shopper who has none", async () => {
    customersCreate.mockResolvedValue({ id: "cus_new" })

    await expect(ensureStripeCustomer(ANNA)).resolves.toBe("cus_new")
    expect(storedCustomerId("user-1")).toBe("cus_new")
    expect(customersDel).not.toHaveBeenCalled()
  })

  it("keeps the customer a parallel request stored first, so cards saved to it stay on the account", async () => {
    customersCreate.mockImplementation(() => {
      storeCustomerId("user-1", "cus_parallel")

      return Promise.resolve({ id: "cus_late" })
    })

    await expect(ensureStripeCustomer(ANNA)).resolves.toBe("cus_parallel")
    expect(storedCustomerId("user-1")).toBe("cus_parallel")
    expect(customersDel).toHaveBeenCalledExactlyOnceWith("cus_late")
  })

  it("gives two simultaneous first requests the same customer and deletes the other one", async () => {
    customersCreate.mockResolvedValueOnce({ id: "cus_first" }).mockResolvedValueOnce({ id: "cus_second" })

    const customers = await Promise.all([ensureStripeCustomer(ANNA), ensureStripeCustomer(ANNA)])
    const stored = storedCustomerId("user-1")

    expect(customers).toStrictEqual([stored, stored])
    expect(customersDel.mock.calls).toStrictEqual([[stored === "cus_first" ? "cus_second" : "cus_first"]])
  })

  it("reuses the stored customer without calling Stripe", async () => {
    await expect(ensureStripeCustomer({ ...ANNA, userId: "user-2" })).resolves.toBe("cus_existing")
    expect(customersCreate).not.toHaveBeenCalled()
  })
})
