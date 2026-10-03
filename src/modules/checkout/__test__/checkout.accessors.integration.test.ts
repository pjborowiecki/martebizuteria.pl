import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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

import { getCheckoutById, getCheckoutEmailContext, getCheckoutForFulfillment } from "~/src/modules/checkout/checkout.accessors"

const CREATED_AT = Date.UTC(2026, 0, 10)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists checkout;
    drop table if exists address;
    drop table if exists delivery_method;
    drop table if exists discount;

    create table address (
      id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
      first_name text, is_default integer not null default 0, last_name text, phone text, postal_code text,
      province text, user_id text, created_at integer not null, updated_at integer not null
    );
    create table delivery_method (
      id text primary key, api_service_code text not null, courier_id text not null, description text,
      is_active integer not null default 1, name text not null, price integer not null, type text not null,
      created_at integer not null, updated_at integer not null
    );
    create table discount (
      id text primary key, code text not null, description text, ends_at integer, is_active integer not null default 1,
      max_discount_amount integer, min_order_total integer, per_customer_limit integer, starts_at integer, type text not null,
      usage_count integer not null default 0, usage_limit integer, value integer not null,
      created_at integer not null, updated_at integer not null
    );
    create table checkout (
      id text primary key, billing_company_name text, billing_nip text, billing_address_id text, cart_id text, customer_note text, delivery_method_id text,
      discount_id text, email text not null, locker_id text, shipping_address_id text, status text not null default 'pending',
      user_id text, created_at integer not null, updated_at integer not null
    );

    insert into address (id, address1, city, country_code, first_name, last_name, postal_code, created_at, updated_at) values
      ('adr-ship', 'ul. Mokotowska 12/4', 'Warszawa', 'PL', 'Anna', 'Kowalska', '00-640', ${CREATED_AT}, ${CREATED_AT}),
      ('adr-bill', 'ul. Firmowa 1', 'Kraków', 'PL', 'Anna', 'Kowalska', '30-001', ${CREATED_AT}, ${CREATED_AT});

    insert into delivery_method (id, api_service_code, courier_id, name, price, type, created_at, updated_at) values
      ('dm-locker', 'INPOST_LOCKER', 'courier-inpost', 'Paczkomat InPost', 1299, 'locker', ${CREATED_AT}, ${CREATED_AT});

    insert into checkout (id, billing_address_id, cart_id, customer_note, delivery_method_id, email, locker_id, shipping_address_id, status, user_id, created_at, updated_at) values
      ('chk-full', 'adr-bill', 'cart-1', 'Please gift wrap', 'dm-locker', 'anna@example.com', 'WAW01A', 'adr-ship', 'completed', 'user-1', ${CREATED_AT}, ${CREATED_AT}),
      ('chk-bare', null, null, null, null, 'guest@example.com', null, null, 'pending', null, ${CREATED_AT}, ${CREATED_AT});

    insert into discount (id, code, type, value, created_at, updated_at) values
      ('disc-spring', 'SPRING', 'percentage', 10, ${CREATED_AT}, ${CREATED_AT});

    insert into checkout (id, billing_address_id, billing_company_name, billing_nip, customer_note, delivery_method_id, discount_id, email, locker_id, shipping_address_id, status, created_at, updated_at) values
      ('chk-business', 'adr-bill', 'Pracownia Złotnicza sp. z o.o.', '5260001246', 'Invoice please', 'dm-locker', 'disc-spring', 'firma@example.com', 'WAW01A', 'adr-ship', 'pending', ${CREATED_AT}, ${CREATED_AT});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getCheckoutById", () => {
  it("reads the whole checkout row", async () => {
    const row = await getCheckoutById("chk-full")

    expect(row).toMatchObject({
      billingAddressId: "adr-bill",
      cartId: "cart-1",
      customerNote: "Please gift wrap",
      deliveryMethodId: "dm-locker",
      email: "anna@example.com",
      id: "chk-full",
      lockerId: "WAW01A",
      shippingAddressId: "adr-ship",
      status: "completed",
      userId: "user-1",
    })
  })

  it("returns nothing for a checkout that does not exist", async () => {
    await expect(getCheckoutById("chk-missing")).resolves.toBeUndefined()
  })
})

describe("getCheckoutEmailContext", () => {
  it("returns only the columns the confirmation email needs", async () => {
    const context = await getCheckoutEmailContext("chk-full")

    expect(Object.keys(context ?? {}).toSorted()).toStrictEqual([
      "billingAddress",
      "billingAddressId",
      "customerNote",
      "deliveryMethod",
      "lockerId",
      "shippingAddress",
      "shippingAddressId",
    ])
  })

  it("joins the shipping and billing addresses of the checkout", async () => {
    const context = await getCheckoutEmailContext("chk-full")

    expect(context?.shippingAddress).toMatchObject({ address1: "ul. Mokotowska 12/4", city: "Warszawa", postalCode: "00-640" })
    expect(context?.billingAddress).toMatchObject({ address1: "ul. Firmowa 1", city: "Kraków" })
  })

  it("joins the chosen delivery method together with the locker the shopper picked", async () => {
    const context = await getCheckoutEmailContext("chk-full")

    expect(context?.deliveryMethod).toMatchObject({ name: "Paczkomat InPost", price: 1299, type: "locker" })
    expect(context?.lockerId).toBe("WAW01A")
  })

  it("leaves the joins empty for a checkout that carries no address or delivery method", async () => {
    const context = await getCheckoutEmailContext("chk-bare")

    expect(context?.billingAddress).toBeNull()
    expect(context?.shippingAddress).toBeNull()
    expect(context?.deliveryMethod).toBeNull()
    expect(context?.customerNote).toBeNull()
  })

  it("returns nothing for a checkout that does not exist", async () => {
    await expect(getCheckoutEmailContext("chk-missing")).resolves.toBeUndefined()
  })
})

describe("getCheckoutForFulfillment", () => {
  it("returns only what the order snapshot copies from the checkout", async () => {
    const snapshot = await getCheckoutForFulfillment("chk-business")

    expect(Object.keys(snapshot ?? {}).toSorted()).toStrictEqual([
      "billingAddress",
      "billingCompanyName",
      "billingNip",
      "customerNote",
      "deliveryMethod",
      "deliveryMethodId",
      "discount",
      "discountId",
      "lockerId",
      "shippingAddress",
    ])
  })

  it("carries the invoice details, the note and the locker the shopper entered", async () => {
    await expect(getCheckoutForFulfillment("chk-business")).resolves.toMatchObject({
      billingCompanyName: "Pracownia Złotnicza sp. z o.o.",
      billingNip: "5260001246",
      customerNote: "Invoice please",
      deliveryMethodId: "dm-locker",
      discountId: "disc-spring",
      lockerId: "WAW01A",
    })
  })

  it("joins only the delivery price, which the order total is computed from", async () => {
    const snapshot = await getCheckoutForFulfillment("chk-business")

    expect(snapshot?.deliveryMethod).toStrictEqual({ price: 1299 })
  })

  it("joins the discount the shopper applied so the order can spend it", async () => {
    const snapshot = await getCheckoutForFulfillment("chk-business")

    expect(snapshot?.discount).toMatchObject({ code: "SPRING", id: "disc-spring", isActive: true, type: "percentage", value: 10 })
  })

  it("joins the shipping and billing addresses the order will keep", async () => {
    const snapshot = await getCheckoutForFulfillment("chk-business")

    expect(snapshot?.shippingAddress).toMatchObject({ address1: "ul. Mokotowska 12/4", city: "Warszawa", postalCode: "00-640" })
    expect(snapshot?.billingAddress).toMatchObject({ address1: "ul. Firmowa 1", city: "Kraków", postalCode: "30-001" })
  })

  it("leaves every join empty for a checkout that carries none of them", async () => {
    await expect(getCheckoutForFulfillment("chk-bare")).resolves.toStrictEqual({
      billingAddress: null,
      billingCompanyName: null,
      billingNip: null,
      customerNote: null,
      deliveryMethod: null,
      deliveryMethodId: null,
      discount: null,
      discountId: null,
      lockerId: null,
      shippingAddress: null,
    })
  })

  it("returns nothing for a checkout that does not exist", async () => {
    await expect(getCheckoutForFulfillment("chk-missing")).resolves.toBeUndefined()
  })
})
