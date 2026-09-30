import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { createCheckout } from "~/src/modules/checkout/use-cases/create-checkout.server"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const USER_ID = "user_1"

const shippingForm: CheckoutFormSchema = {
  address1: "Krucza 1",
  address2: "m. 4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "courier_1",
  deliveryNotes: "Leave with the concierge",
  email: "typed@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48123456789",
  postalCode: "00-001",
  province: "Mazowieckie",
  sameAsShipping: true,
  saveBillingAddress: false,
  saveShippingAddress: true,
}

const separateBillingForm: CheckoutFormSchema = {
  ...shippingForm,
  billingAddress1: "Miodowa 7",
  billingCity: "Kraków",
  billingCountryCode: "PL",
  billingFirstName: "Jan",
  billingLastName: "Nowak",
  billingPostalCode: "30-001",
  sameAsShipping: false,
  saveBillingAddress: true,
}

const checkoutRowSchema = z.object({
  billing_address_id: z.string().nullable(),
  customer_note: z.string().nullable(),
  delivery_method_id: z.string().nullable(),
  email: z.string(),
  shipping_address_id: z.string().nullable(),
  status: z.string(),
  user_id: z.string().nullable(),
})

const addressRowSchema = z.object({ address1: z.string(), city: z.string(), is_default: z.number(), user_id: z.string().nullable() })

const readCheckout = (checkoutId: string) => checkoutRowSchema.parse(sqlite.prepare(`select * from checkout where id = ?`).get(checkoutId))

const readAddress = (addressId: string) => addressRowSchema.parse(sqlite.prepare(`select * from address where id = ?`).get(addressId))

const countAddresses = (): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare(`select count(*) as total from address`).get()).total

const resetSchema = (): void => {
  sqlite.exec(`
      drop table if exists address;
      drop table if exists checkout;

      create table address (
        id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
        first_name text, last_name text, phone text, postal_code text, province text, user_id text,
        is_default integer not null default 0, created_at integer, updated_at integer
      );
      create table checkout (
        id text primary key, status text not null, email text not null, user_id text, cart_id text, discount_id text,
        customer_note text, delivery_method_id text, locker_id text, billing_address_id text, shipping_address_id text,
        created_at integer, updated_at integer
      );
  `)
}

beforeEach(resetSchema)

afterAll(() => {
  sqlite.close()
})

describe("createCheckout", () => {
  it("opens a pending checkout and hands back its id", async () => {
    const checkoutId = await createCheckout(shippingForm, USER_ID, "account@example.com")

    expect(readCheckout(checkoutId)).toMatchObject({
      customer_note: "Leave with the concierge",
      delivery_method_id: "courier_1",
      email: "account@example.com",
      status: "pending",
      user_id: USER_ID,
    })
  })

  it("stores the shipping address and bills it to the same place when the shopper asked for that", async () => {
    const checkoutId = await createCheckout(shippingForm, USER_ID, "account@example.com")
    const row = readCheckout(checkoutId)

    expect(countAddresses()).toBe(1)
    expect(row.billing_address_id).toBe(row.shipping_address_id)
    expect(readAddress(row.shipping_address_id ?? "")).toStrictEqual({
      address1: "Krucza 1",
      city: "Warszawa",
      is_default: 1,
      user_id: USER_ID,
    })
  })

  it("stores a second address when the shopper typed a separate billing address", async () => {
    const checkoutId = await createCheckout(separateBillingForm, USER_ID, "account@example.com")
    const row = readCheckout(checkoutId)

    expect(countAddresses()).toBe(2)
    expect(row.billing_address_id).not.toBe(row.shipping_address_id)
    expect(readAddress(row.billing_address_id ?? "").city).toBe("Kraków")
  })

  it("keeps a guest checkout unattached to any account", async () => {
    const checkoutId = await createCheckout(shippingForm, undefined, "guest@example.com")

    expect(readCheckout(checkoutId).user_id).toBeNull()
  })

  it("gives every checkout its own id", async () => {
    const first = await createCheckout(shippingForm, USER_ID, "account@example.com")
    const second = await createCheckout(shippingForm, USER_ID, "account@example.com")

    expect(second).not.toBe(first)
  })
})
