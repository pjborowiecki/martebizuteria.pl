import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { createCheckout } from "~/src/modules/checkout/use-cases/create-checkout.server"
import { updateCheckoutDelivery } from "~/src/modules/checkout/use-cases/update-checkout-delivery.server"

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

const shipping: CheckoutFormSchema = {
  address1: "Krucza 1",
  address2: "Apartment 4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "courier-1",
  deliveryNotes: "At reception",
  email: "original@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48600111222",
  postalCode: "00-001",
  province: "Mazowieckie",
  sameAsShipping: true,
  saveBillingAddress: false,
  saveShippingAddress: false,
}

const separateBilling: CheckoutFormSchema = {
  ...shipping,
  billingAddress1: "Miodowa 7",
  billingCity: "Kraków",
  billingCountryCode: "PL",
  billingFirstName: "Jan",
  billingLastName: "Nowak",
  billingPostalCode: "30-001",
  sameAsShipping: false,
}

const checkoutRow = z.object({
  billing_address_id: z.string().nullable(),
  customer_note: z.string().nullable(),
  delivery_method_id: z.string().nullable(),
  email: z.string(),
  locker_id: z.string().nullable(),
  shipping_address_id: z.string().nullable(),
  status: z.string(),
  user_id: z.string().nullable(),
})

const readCheckout = (checkoutId: string) => checkoutRow.parse(sqlite.prepare("select * from checkout where id = ?").get(checkoutId))

const readAddress = (addressId: string | null) => sqlite.prepare("select * from address where id = ?").get(addressId)

const countAddresses = () => z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from address").get()).total

beforeEach(() => {
  sqlite.exec(`
    drop table if exists checkout;
    drop table if exists address;
    create table address (
      id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
      first_name text, last_name text, phone text, postal_code text, province text, user_id text,
      is_default integer not null default 0, created_at integer, updated_at integer
    );
    create table checkout (
      id text primary key, billing_company_name text, billing_nip text, status text not null, email text not null, user_id text, cart_id text, discount_id text,
      customer_note text, delivery_method_id text, locker_id text, billing_address_id text, shipping_address_id text,
      created_at integer, updated_at integer
    );
  `)
})

afterAll(() => {
  sqlite.close()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("checkout address and contact edits", () => {
  it("persists the revised shipping, contact, and delivery details together", async () => {
    const checkoutId = await createCheckout({ checkoutValues: shipping, userEmail: shipping.email, userId: "user-1" })
    const original = readCheckout(checkoutId)

    await updateCheckoutDelivery(checkoutId, {
      ...shipping,
      address1: "New street 5",
      address2: "Floor 2",
      city: "Gdańsk",
      countryCode: "DE",
      deliveryMethod: "locker-1",
      deliveryNotes: "Call on arrival",
      email: "updated@example.com",
      firstName: "Maria",
      lastName: "Nowak",
      lockerId: "GDA01A",
      phone: "+48600999888",
      postalCode: "20095",
      province: "Hamburg",
      saveShippingAddress: true,
    })

    expect(readCheckout(checkoutId)).toMatchObject({
      billing_address_id: original.shipping_address_id,
      customer_note: "Call on arrival",
      delivery_method_id: "locker-1",
      email: "updated@example.com",
      locker_id: "GDA01A",
      shipping_address_id: original.shipping_address_id,
      status: "pending",
      user_id: "user-1",
    })
    expect(readAddress(original.shipping_address_id)).toMatchObject({
      address1: "New street 5",
      address2: "Floor 2",
      city: "Gdańsk",
      country_code: "DE",
      first_name: "Maria",
      is_default: 1,
      last_name: "Nowak",
      phone: "+48600999888",
      postal_code: "20095",
      province: "Hamburg",
      user_id: "user-1",
    })
    expect(countAddresses()).toBe(1)
  })

  it("creates a separate billing address when billing previously shared shipping", async () => {
    const checkoutId = await createCheckout({ checkoutValues: shipping, userEmail: shipping.email, userId: "user-1" })
    const original = readCheckout(checkoutId)

    await updateCheckoutDelivery(checkoutId, { ...separateBilling, saveBillingAddress: true })

    const updated = readCheckout(checkoutId)
    expect(updated.shipping_address_id).toBe(original.shipping_address_id)
    expect(updated.billing_address_id).not.toBe(updated.shipping_address_id)
    expect(readAddress(updated.billing_address_id)).toMatchObject({
      address1: "Miodowa 7",
      city: "Kraków",
      country_code: "PL",
      first_name: "Jan",
      is_default: 1,
      last_name: "Nowak",
      phone: shipping.phone,
      postal_code: "30-001",
      user_id: "user-1",
    })
    expect(readAddress(updated.shipping_address_id)).toMatchObject({ address1: shipping.address1, is_default: 0 })
    expect(countAddresses()).toBe(2)
  })

  it("updates an existing separate billing address without creating another one", async () => {
    const checkoutId = await createCheckout({ checkoutValues: separateBilling, userEmail: shipping.email, userId: "user-1" })
    const original = readCheckout(checkoutId)

    await updateCheckoutDelivery(checkoutId, { ...separateBilling, billingAddress1: "Billing street 9", phone: "+48600999888" })

    expect(readCheckout(checkoutId).billing_address_id).toBe(original.billing_address_id)
    expect(readAddress(original.billing_address_id)).toMatchObject({ address1: "Billing street 9", phone: "+48600999888" })
    expect(readAddress(original.shipping_address_id)).toMatchObject({ address1: shipping.address1, phone: "+48600999888" })
    expect(countAddresses()).toBe(2)
  })

  it("relinks billing to shipping without changing the former billing address", async () => {
    const checkoutId = await createCheckout({ checkoutValues: separateBilling, userEmail: shipping.email, userId: "user-1" })
    const original = readCheckout(checkoutId)
    const formerBilling = readAddress(original.billing_address_id)

    await updateCheckoutDelivery(checkoutId, { ...shipping, address1: "Shared street 8" })

    expect(readCheckout(checkoutId).billing_address_id).toBe(original.shipping_address_id)
    expect(readAddress(original.shipping_address_id)).toMatchObject({ address1: "Shared street 8" })
    expect(readAddress(original.billing_address_id)).toStrictEqual(formerBilling)
  })
})

describe("checkout update persistence boundaries", () => {
  it("clears removed optional shipping fields and the obsolete locker selection", async () => {
    const checkoutId = await createCheckout({
      checkoutValues: { ...shipping, lockerId: "WAW01A" },
      userEmail: shipping.email,
      userId: "user-1",
    })

    await updateCheckoutDelivery(checkoutId, { ...shipping, address2: undefined, lockerId: undefined, province: undefined })

    const updated = readCheckout(checkoutId)
    expect(updated.locker_id).toBeNull()
    expect(readAddress(updated.shipping_address_id)).toMatchObject({ address2: null, province: null })
  })

  it("keeps guest addresses unattached to a customer and avoids duplicates on retry", async () => {
    const checkoutId = await createCheckout({ checkoutValues: shipping, userEmail: shipping.email, userId: undefined })

    await updateCheckoutDelivery(checkoutId, shipping)
    await updateCheckoutDelivery(checkoutId, shipping)

    const updated = readCheckout(checkoutId)
    expect(updated.user_id).toBeNull()
    expect(readAddress(updated.shipping_address_id)).toMatchObject({ user_id: null })
    expect(countAddresses()).toBe(1)
  })

  it("recreates address records if the checkout's previous addresses were removed", async () => {
    const checkoutId = await createCheckout({ checkoutValues: shipping, userEmail: shipping.email, userId: "user-1" })
    sqlite.exec("delete from address; update checkout set shipping_address_id = null, billing_address_id = null")

    await updateCheckoutDelivery(checkoutId, separateBilling)

    const updated = readCheckout(checkoutId)
    expect(readAddress(updated.shipping_address_id)).toMatchObject({ address1: shipping.address1, user_id: "user-1" })
    expect(readAddress(updated.billing_address_id)).toMatchObject({ address1: separateBilling.billingAddress1, user_id: "user-1" })
    expect(countAddresses()).toBe(2)
  })

  it("rolls address edits back when the checkout update fails", async () => {
    const checkoutId = await createCheckout({ checkoutValues: shipping, userEmail: shipping.email, userId: "user-1" })
    const original = readCheckout(checkoutId)
    const originalAddress = readAddress(original.shipping_address_id)
    sqlite.exec(
      "create trigger refuse_checkout_update before update on checkout begin select raise(abort, 'checkout update rejected'); end",
    )

    await expect(
      updateCheckoutDelivery(checkoutId, { ...separateBilling, address1: "Changed", email: "updated@example.com" }),
    ).rejects.toThrow()

    expect(readCheckout(checkoutId)).toStrictEqual(original)
    expect(readAddress(original.shipping_address_id)).toStrictEqual(originalAddress)
    expect(countAddresses()).toBe(1)
  })

  it("rejects a missing checkout without inserting address records", async () => {
    await expect(updateCheckoutDelivery("missing", shipping)).rejects.toThrow("NOT_FOUND")

    expect(countAddresses()).toBe(0)
  })

  it("rejects edits once the checkout has completed", async () => {
    const checkoutId = await createCheckout({ checkoutValues: shipping, userEmail: shipping.email, userId: "user-1" })
    sqlite.exec("update checkout set status = 'completed'")
    const original = readCheckout(checkoutId)
    const originalAddress = readAddress(original.shipping_address_id)

    await expect(updateCheckoutDelivery(checkoutId, { ...shipping, address1: "Changed" })).rejects.toThrow("CONFLICT")

    expect(readCheckout(checkoutId)).toStrictEqual(original)
    expect(readAddress(original.shipping_address_id)).toStrictEqual(originalAddress)
  })
})

describe("checkout update completion races", () => {
  it.each([
    { initial: shipping, missingAddresses: false, name: "a shared shipping address and a new billing address" },
    { initial: separateBilling, missingAddresses: false, name: "existing shipping and billing addresses" },
    { initial: shipping, missingAddresses: true, name: "new shipping and billing addresses" },
  ])("preserves $name when payment completes after reading status", async ({ initial, missingAddresses }) => {
    const checkoutId = await createCheckout({ checkoutValues: initial, userEmail: initial.email, userId: "user-1" })
    if (missingAddresses) {
      sqlite.exec("delete from address; update checkout set shipping_address_id = null, billing_address_id = null")
    }
    const original = readCheckout(checkoutId)
    const originalAddresses = sqlite.prepare("select * from address order by id").all()
    const execute = sqlite.exec.bind(sqlite)
    vi.spyOn(sqlite, "exec").mockImplementationOnce((query) => {
      expect(query).toBe("begin")
      sqlite.prepare("update checkout set status = 'completed' where id = ?").run(checkoutId)
      execute(query)
    })

    await expect(
      updateCheckoutDelivery(checkoutId, {
        ...separateBilling,
        address1: "Changed shipping",
        billingAddress1: "Changed billing",
        deliveryNotes: "Changed note",
        email: "changed@example.com",
      }),
    ).rejects.toThrow("CONFLICT")

    expect(readCheckout(checkoutId)).toStrictEqual({ ...original, status: "completed" })
    expect(sqlite.prepare("select * from address order by id").all()).toStrictEqual(originalAddresses)
  })
})
