import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type TestD1Query } from "~/src/platform/testing/mocks/d1"

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import {
  type PendingCheckout,
  prepareCreateCheckoutBatch,
  prepareReleaseCheckoutBatch,
  prepareUpdateCheckoutDeliveryBatch,
} from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    queries: [] as TestD1Query[],
    sqlite: new DatabaseSync(":memory:"),
  }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const USER_ID = "user_1"

const VARIANT_ID = "var_1"

const TRANSACTION_ID = "cs_test_1"

const shippingForm: CheckoutFormSchema = {
  address1: "Krucza 1",
  address2: "m. 4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "courier_1",
  deliveryNotes: "Leave with the concierge",
  email: "buyer@example.com",
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

const addressRowSchema = z.object({
  address1: z.string(),
  address2: z.string().nullable(),
  city: z.string(),
  country_code: z.string(),
  first_name: z.string().nullable(),
  id: z.string(),
  is_default: z.number(),
  last_name: z.string().nullable(),
  phone: z.string().nullable(),
  postal_code: z.string().nullable(),
  province: z.string().nullable(),
  user_id: z.string().nullable(),
})

const checkoutRowSchema = z.object({
  billing_address_id: z.string().nullable(),
  customer_note: z.string().nullable(),
  delivery_method_id: z.string().nullable(),
  email: z.string(),
  locker_id: z.string().nullable(),
  shipping_address_id: z.string().nullable(),
  status: z.string(),
  user_id: z.string().nullable(),
})

const readCheckout = (checkoutId: string) => checkoutRowSchema.parse(sqlite.prepare(`select * from checkout where id = ?`).get(checkoutId))

const readCheckoutContext = (checkoutId: string) => {
  const row = readCheckout(checkoutId)

  return {
    billingAddressId: row.billing_address_id,
    id: checkoutId,
    shippingAddressId: row.shipping_address_id,
    userId: row.user_id,
  }
}

const readAddress = (addressId: string) => addressRowSchema.parse(sqlite.prepare(`select * from address where id = ?`).get(addressId))

const countAddresses = (): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare(`select count(*) as total from address`).get()).total

const readInventory = (variantId: string) =>
  z
    .object({ quantity_available: z.number(), quantity_reserved: z.number() })
    .parse(sqlite.prepare(`select quantity_available, quantity_reserved from inventory where variant_id = ?`).get(variantId))

const createdCheckoutId = async (): Promise<string> => {
  const { checkoutId, statements } = prepareCreateCheckoutBatch({
    checkoutValues: shippingForm,
    userEmail: "buyer@example.com",
    userId: USER_ID,
  })
  await runDrizzleBatch(statements)

  return checkoutId
}

const readPaymentStatus = (transactionId: string): string =>
  z.object({ status: z.string() }).parse(sqlite.prepare(`select status from payment where transaction_id = ?`).get(transactionId)).status

const resetSchema = (): void => {
  sqlite.exec(`
      drop table if exists address;
      drop table if exists payment;
      drop table if exists checkout;
      drop table if exists inventory;

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
      create table payment (id text primary key, checkout_id text, status text, transaction_id text unique, created_at integer, updated_at integer);
      create table inventory (
        id text primary key, variant_id text, quantity_available integer, quantity_reserved integer,
        version integer, created_at integer, updated_at integer
      );

      insert into payment (id, checkout_id, status, transaction_id) values ('pay_1', 'chk_1', 'pending', '${TRANSACTION_ID}');
      insert into inventory (id, variant_id, quantity_available, quantity_reserved, version)
        values ('inv_1', '${VARIANT_ID}', 5, 3, 1);
  `)
}

afterAll(() => {
  sqlite.close()
})

describe("prepareCreateCheckoutBatch", () => {
  beforeEach(resetSchema)

  it("writes one address and reuses it for billing when the shopper kept them the same", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    const row = readCheckout(checkoutId)

    expect(countAddresses()).toBe(1)
    expect(row.billing_address_id).toBe(row.shipping_address_id)
  })

  it("keeps an address the shopper declined to save out of their address book", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: { ...shippingForm, saveShippingAddress: false },
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    const shipping = readAddress(readCheckout(checkoutId).shipping_address_id ?? "")

    expect(shipping.user_id).toBeNull()
    expect(shipping.address1).toBe("Krucza 1")
  })

  it("leaves one default address behind after the shopper saves a new one", async () => {
    sqlite
      .prepare(`insert into address (id, address1, city, country_code, user_id, is_default) values (?, ?, ?, ?, ?, 1)`)
      .run("addr_old", "Stara 1", "Gdansk", "PL", USER_ID)

    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    const defaults = sqlite.prepare(`select id from address where user_id = ? and is_default = 1`).all(USER_ID)

    expect(defaults).toHaveLength(1)
    expect(readAddress(readCheckout(checkoutId).shipping_address_id ?? "").is_default).toBe(1)
  })

  it("writes a second address when the shopper entered a separate billing address", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: separateBillingForm,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    const row = readCheckout(checkoutId)

    expect(countAddresses()).toBe(2)
    expect(row.billing_address_id).not.toBe(row.shipping_address_id)
    expect(readAddress(row.billing_address_id ?? "").city).toBe("Kraków")
  })
})

describe("prepareCreateCheckoutBatch billing details", () => {
  beforeEach(resetSchema)

  it("writes empty strings rather than nulls for billing fields a caller left out", async () => {
    const withoutBillingDetails: CheckoutFormSchema = {
      ...shippingForm,
      billingCountryCode: "PL",
      sameAsShipping: false,
      saveBillingAddress: false,
    }

    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: withoutBillingDetails,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    const billing = readAddress(readCheckout(checkoutId).billing_address_id ?? "")

    expect(billing).toMatchObject({ address1: "", city: "", first_name: "", last_name: "", postal_code: "" })
    expect(billing.country_code).toBe("PL")
  })

  it("opens the checkout as pending with the delivery selection attached", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    expect(readCheckout(checkoutId)).toMatchObject({
      customer_note: "Leave with the concierge",
      delivery_method_id: "courier_1",
      status: "pending",
      user_id: USER_ID,
    })
  })

  it("stores the authenticated account's email rather than the one typed in the form", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "account@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    expect(readCheckout(checkoutId).email).toBe("account@example.com")
  })

  it("keeps a guest checkout unattached to any account", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "guest@example.com",
      userId: undefined,
    })
    await runDrizzleBatch(statements)

    const row = readCheckout(checkoutId)

    expect(row.user_id).toBeNull()
    expect(readAddress(row.shipping_address_id ?? "").user_id).toBeNull()
  })

  it("honours the shopper's choice to save the shipping address as their default", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    expect(readAddress(readCheckout(checkoutId).shipping_address_id ?? "").is_default).toBe(1)
  })

  it("carries every shipping address field through to the row", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "buyer@example.com",
      userId: USER_ID,
    })
    await runDrizzleBatch(statements)

    expect(readAddress(readCheckout(checkoutId).shipping_address_id ?? "")).toMatchObject({
      address1: "Krucza 1",
      address2: "m. 4",
      city: "Warszawa",
      country_code: "PL",
      first_name: "Anna",
      last_name: "Kowalska",
      phone: "+48123456789",
      postal_code: "00-001",
      province: "Mazowieckie",
    })
  })

  it("gives each checkout its own identifier", () => {
    const first = prepareCreateCheckoutBatch({ checkoutValues: shippingForm, userEmail: "buyer@example.com", userId: USER_ID })
    const second = prepareCreateCheckoutBatch({ checkoutValues: shippingForm, userEmail: "buyer@example.com", userId: USER_ID })

    expect(first.checkoutId).not.toBe(second.checkoutId)
  })
})

describe("prepareUpdateCheckoutDeliveryBatch", () => {
  beforeEach(resetSchema)

  it("replaces the delivery selection without disturbing the checkout status", async () => {
    const checkoutId = await createdCheckoutId()

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), {
        ...shippingForm,
        deliveryMethod: "locker_1",
        lockerId: "WAW01A",
      }),
    )

    expect(readCheckout(checkoutId)).toMatchObject({
      delivery_method_id: "locker_1",
      locker_id: "WAW01A",
      status: "pending",
    })
  })

  it("clears the delivery note when the shopper empties the field", async () => {
    const checkoutId = await createdCheckoutId()

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...shippingForm, deliveryNotes: "" }))

    expect(readCheckout(checkoutId).customer_note).toBe("")
  })

  it("keeps the stored note when the submitted form omits the field entirely", async () => {
    const checkoutId = await createdCheckoutId()

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...shippingForm, deliveryNotes: undefined }),
    )

    expect(readCheckout(checkoutId).customer_note).toBe("Leave with the concierge")
  })

  it("clears the locker when the shopper switches to a courier", async () => {
    const checkoutId = await createdCheckoutId()

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...shippingForm, lockerId: "WAW01A" }))
    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...shippingForm, lockerId: "" }))

    expect(readCheckout(checkoutId).locker_id).toBe("")
  })
})

describe("prepareReleaseCheckoutBatch", () => {
  const context: PendingCheckout = { checkoutId: "chk_1", email: "buyer@example.com", paymentId: "pay_1", userId: USER_ID }

  beforeEach(() => {
    resetSchema()
    sqlite.exec(`insert into checkout (id, status, email) values ('chk_1', 'pending', 'buyer@example.com')`)
  })

  it("fails the payment and the checkout together", async () => {
    await runDrizzleBatch(prepareReleaseCheckoutBatch(context, { lines: [], transactionId: TRANSACTION_ID }))

    expect(readPaymentStatus(TRANSACTION_ID)).toBe("failed")
    expect(readCheckout("chk_1").status).toBe("failed")
  })

  it("returns the reserved stock to availability", async () => {
    await runDrizzleBatch(
      prepareReleaseCheckoutBatch(context, { lines: [{ qty: 2, variantId: VARIANT_ID }], transactionId: TRANSACTION_ID }),
    )

    expect(readInventory(VARIANT_ID)).toStrictEqual({ quantity_available: 7, quantity_reserved: 1 })
  })

  it("conserves stock when the requested release exceeds the remaining reservation", async () => {
    await runDrizzleBatch(
      prepareReleaseCheckoutBatch(context, { lines: [{ qty: 10, variantId: VARIANT_ID }], transactionId: TRANSACTION_ID }),
    )

    expect(readInventory(VARIANT_ID)).toStrictEqual({ quantity_available: 8, quantity_reserved: 0 })
  })

  it("emits one inventory statement per line plus the two status updates", () => {
    const statements = prepareReleaseCheckoutBatch(context, {
      lines: [
        { qty: 1, variantId: VARIANT_ID },
        { qty: 1, variantId: "var_2" },
      ],
      transactionId: TRANSACTION_ID,
    })

    expect(statements).toHaveLength(4)
  })
})

const createdCheckoutIdFrom = async (form: CheckoutFormSchema): Promise<string> => {
  const { checkoutId, statements } = prepareCreateCheckoutBatch({ checkoutValues: form, userEmail: "buyer@example.com", userId: USER_ID })
  await runDrizzleBatch(statements)

  return checkoutId
}

describe("prepareCreateCheckoutBatch with no billing country", () => {
  beforeEach(resetSchema)

  it("stores an empty country code rather than refusing the insert", async () => {
    const checkoutId = await createdCheckoutIdFrom({ ...shippingForm, sameAsShipping: false, saveBillingAddress: false })

    expect(readAddress(readCheckout(checkoutId).billing_address_id ?? "").country_code).toBe("")
  })
})

describe("prepareUpdateCheckoutDeliveryBatch when billing splits away from shipping", () => {
  beforeEach(resetSchema)

  it("adds a second address to the checkout", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), separateBillingForm))

    const row = readCheckout(checkoutId)

    expect(countAddresses()).toBe(2)
    expect(row.billing_address_id).not.toBe(row.shipping_address_id)
  })

  it("stores the billing details the shopper typed", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), separateBillingForm))

    expect(readAddress(readCheckout(checkoutId).billing_address_id ?? "")).toMatchObject({
      address1: "Miodowa 7",
      city: "Kraków",
      country_code: "PL",
      first_name: "Jan",
      last_name: "Nowak",
      postal_code: "30-001",
    })
  })

  it("leaves the shipping address as it was", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), separateBillingForm))

    expect(readAddress(readCheckout(checkoutId).shipping_address_id ?? "")).toMatchObject({ address1: "Krucza 1", city: "Warszawa" })
  })

  it("creates one for a checkout that never recorded a billing address", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)
    sqlite.exec(`update checkout set billing_address_id = null`)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), separateBillingForm))

    expect(countAddresses()).toBe(2)
    expect(readAddress(readCheckout(checkoutId).billing_address_id ?? "").city).toBe("Kraków")
  })
})

describe("prepareUpdateCheckoutDeliveryBatch on a checkout that already billed separately", () => {
  beforeEach(resetSchema)

  it("edits the billing address in place instead of adding another", async () => {
    const checkoutId = await createdCheckoutIdFrom(separateBillingForm)
    const billingAddressId = readCheckout(checkoutId).billing_address_id

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...separateBillingForm, billingCity: "Gdańsk" }),
    )

    expect(countAddresses()).toBe(2)
    expect(readCheckout(checkoutId).billing_address_id).toBe(billingAddressId)
    expect(readAddress(billingAddressId ?? "").city).toBe("Gdańsk")
  })

  it("points billing back at the shipping address once the shopper reuses it", async () => {
    const checkoutId = await createdCheckoutIdFrom(separateBillingForm)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), shippingForm))

    const row = readCheckout(checkoutId)

    expect(row.billing_address_id).toBe(row.shipping_address_id)
  })
})

const readLinkedAddress = (addressId: string | null) => {
  if (addressId === null) {
    throw new Error("expected the checkout to point at an address")
  }

  return readAddress(addressId)
}

describe("prepareUpdateCheckoutDeliveryBatch filling in what the checkout or form leaves out", () => {
  beforeEach(resetSchema)

  it("gives a checkout that lost its shipping address a fresh one and bills to it", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)
    sqlite.exec(`update checkout set shipping_address_id = null, billing_address_id = null`)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), shippingForm))

    const row = readCheckout(checkoutId)

    expect(countAddresses()).toBe(2)
    expect(row.billing_address_id).toBe(row.shipping_address_id)
    expect(readLinkedAddress(row.shipping_address_id)).toMatchObject({ address1: "Krucza 1", city: "Warszawa", user_id: USER_ID })
  })

  it("drops the default flag when the resubmitted form no longer asks to save the address", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...shippingForm, saveShippingAddress: undefined }),
    )

    expect(readLinkedAddress(readCheckout(checkoutId).shipping_address_id).is_default).toBe(0)
  })

  it("writes empty strings rather than nulls for billing details the form left out", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), {
        ...shippingForm,
        sameAsShipping: false,
        saveBillingAddress: undefined,
      }),
    )

    expect(readLinkedAddress(readCheckout(checkoutId).billing_address_id)).toMatchObject({
      address1: "",
      city: "",
      country_code: "",
      first_name: "",
      is_default: 0,
      last_name: "",
      phone: "+48123456789",
      postal_code: "",
    })
  })

  it("keeps the addresses of a guest checkout out of every address book", async () => {
    const { checkoutId, statements } = prepareCreateCheckoutBatch({
      checkoutValues: shippingForm,
      userEmail: "guest@example.com",
      userId: undefined,
    })
    await runDrizzleBatch(statements)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), separateBillingForm))

    const row = readCheckout(checkoutId)

    expect(readLinkedAddress(row.shipping_address_id).user_id).toBeNull()
    expect(readLinkedAddress(row.billing_address_id).user_id).toBeNull()
  })
})

const readDefaultAddressIds = (): string[] =>
  z
    .array(z.object({ id: z.string() }))
    .parse(sqlite.prepare(`select id from address where user_id = ? and is_default = 1 order by id`).all(USER_ID))
    .map(({ id }) => id)

const insertDefaultAddress = (addressId: string): void => {
  sqlite
    .prepare(`insert into address (id, address1, city, country_code, user_id, is_default) values (?, ?, ?, ?, ?, 1)`)
    .run(addressId, "Stara 1", "Gdańsk", "PL", USER_ID)
}

describe("prepareUpdateCheckoutDeliveryBatch and the shopper's address book", () => {
  beforeEach(resetSchema)

  it("keeps a shipping address the shopper still declines to save out of their address book", async () => {
    const declined = { ...shippingForm, saveShippingAddress: false }
    const checkoutId = await createdCheckoutIdFrom(declined)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...declined, city: "Kraków" }))

    expect(readLinkedAddress(readCheckout(checkoutId).shipping_address_id)).toMatchObject({ city: "Kraków", user_id: null })
  })

  it("takes a shipping address back out of the address book once the shopper unticks saving it", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...shippingForm, saveShippingAddress: false }),
    )

    expect(readLinkedAddress(readCheckout(checkoutId).shipping_address_id)).toMatchObject({ is_default: 0, user_id: null })
  })

  it("keeps a billing address the shopper declines to save out of their address book", async () => {
    const checkoutId = await createdCheckoutIdFrom(shippingForm)

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), { ...separateBillingForm, saveBillingAddress: false }),
    )

    const row = readCheckout(checkoutId)

    expect(readLinkedAddress(row.billing_address_id)).toMatchObject({ is_default: 0, user_id: null })
    expect(readLinkedAddress(row.shipping_address_id).user_id).toBe(USER_ID)
  })

  it("adds an address the shopper decides to save later to their address book", async () => {
    const checkoutId = await createdCheckoutIdFrom({ ...shippingForm, saveShippingAddress: false })

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), shippingForm))

    expect(readLinkedAddress(readCheckout(checkoutId).shipping_address_id)).toMatchObject({ is_default: 1, user_id: USER_ID })
  })

  it("leaves one default address behind after the shopper saves the checkout's address", async () => {
    insertDefaultAddress("addr_old")
    const checkoutId = await createdCheckoutIdFrom({ ...shippingForm, saveShippingAddress: false })

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), shippingForm))

    expect(readDefaultAddressIds()).toStrictEqual([readCheckout(checkoutId).shipping_address_id])
    expect(readAddress("addr_old")).toMatchObject({ is_default: 0, user_id: USER_ID })
  })

  it("keeps the saved default when the shopper saves nothing", async () => {
    insertDefaultAddress("addr_old")
    const checkoutId = await createdCheckoutIdFrom({ ...shippingForm, saveShippingAddress: false })

    await runDrizzleBatch(
      prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), {
        ...separateBillingForm,
        saveBillingAddress: false,
        saveShippingAddress: false,
      }),
    )

    expect(readDefaultAddressIds()).toStrictEqual(["addr_old"])
  })

  it("keeps the saved default when the checkout was already paid", async () => {
    const checkoutId = await createdCheckoutIdFrom({ ...shippingForm, saveShippingAddress: false })
    insertDefaultAddress("addr_old")
    sqlite.prepare(`update checkout set status = 'completed' where id = ?`).run(checkoutId)

    await runDrizzleBatch(prepareUpdateCheckoutDeliveryBatch(readCheckoutContext(checkoutId), shippingForm))

    expect(readDefaultAddressIds()).toStrictEqual(["addr_old"])
    expect(readLinkedAddress(readCheckout(checkoutId).shipping_address_id).user_id).toBeNull()
  })
})
