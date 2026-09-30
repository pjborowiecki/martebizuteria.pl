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

import {
  getAdminCustomerOrderRowsQuery,
  getCustomerAuditTimelineQuery,
  getCustomerCategoryBreakdownQuery,
  getCustomerMonthlySpendingQuery,
  getCustomerPreferredCategoryQuery,
  getCustomerPreferredCollectionQuery,
  getDefaultCustomerAddressFullQuery,
  getLatestSessionActivityQuery,
  getOrderItemTitlesQuery,
} from "~/src/modules/user/user.accessors"
import { ADMIN_CUSTOMER_DETAIL_ORDERS_LIMIT } from "~/src/modules/user/user.constants"

const JANUARY = Date.UTC(2026, 0, 10)

const FEBRUARY = Date.UTC(2026, 1, 10)

const MARCH = Date.UTC(2026, 2, 10)

const EPOCH_START = new Date(0)

const DDL = `
  drop table if exists address;
  drop table if exists session;
  drop table if exists "order";
  drop table if exists order_item;
  drop table if exists payment;
  drop table if exists audit_log;
  drop table if exists product_category;
  drop table if exists category_on_product;
  drop table if exists product_collection;
  drop table if exists collection_on_product;

  create table address (
    id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
    first_name text, is_default integer not null default 0, last_name text, phone text, postal_code text,
    province text, user_id text, created_at integer not null, updated_at integer not null
  );
  create table session (
    id text primary key, expires_at integer not null, impersonated_by text, ip_address text, token text not null,
    user_agent text, user_id text not null, created_at integer not null, updated_at integer not null
  );
  create table payment (id text primary key, status text, created_at integer not null, updated_at integer not null);
  create table "order" (
    id text primary key, currency_code text not null default 'PLN', email text not null,
    fulfillment_status text not null default 'not_fulfilled', payment_id text, status text not null default 'pending',
    total integer not null default 0, user_id text, created_at integer not null, updated_at integer not null
  );
  create table order_item (
    id text primary key, order_id text not null, product_id text, quantity integer not null, subtotal integer not null,
    thumbnail text, title text not null, total integer not null, unit_price integer not null,
    created_at integer not null, updated_at integer not null
  );
  create table audit_log (
    id text primary key, action text not null, actor_id text, actor_name text not null, actor_role text not null,
    category text not null, detail text, ip text, metadata text, resource_id text, severity text not null,
    target text not null, created_at integer not null
  );
  create table product_category (
    id text primary key, handle text not null, titles text not null, rank integer not null default 0,
    status text not null default 'draft', created_at integer not null, updated_at integer not null
  );
  create table category_on_product (
    category_id text not null, product_id text not null, is_primary integer not null default 0,
    primary key (product_id, category_id)
  );
  create table product_collection (
    id text primary key, handle text not null, titles text not null, rank integer not null default 0,
    status text not null default 'draft', created_at integer not null, updated_at integer not null
  );
  create table collection_on_product (
    collection_id text not null, product_id text not null, rank integer not null default 0,
    primary key (product_id, collection_id)
  );
`

const seed = (): void => {
  sqlite.exec(`
    insert into address (id, address1, address2, city, country_code, is_default, postal_code, province, user_id, created_at, updated_at) values
      ('addr-default', 'ul. Krucza 1', 'm. 4', 'Warszawa', 'PL', 1, '00-001', 'mazowieckie', 'u-anna', ${JANUARY}, ${JANUARY}),
      ('addr-other', 'ul. Długa 9', null, 'Kraków', 'PL', 0, '30-001', null, 'u-anna', ${JANUARY}, ${JANUARY}),
      ('addr-piotr', 'ul. Polna 3', null, 'Gdańsk', 'PL', 1, '80-001', null, 'u-piotr', ${JANUARY}, ${JANUARY});

    insert into session (id, expires_at, token, user_id, created_at, updated_at) values
      ('s-old', ${MARCH}, 'tok-1', 'u-anna', ${JANUARY}, ${JANUARY}),
      ('s-new', ${MARCH}, 'tok-2', 'u-anna', ${FEBRUARY}, ${MARCH});

    insert into payment (id, status, created_at, updated_at) values
      ('pay-paid', 'succeeded', ${JANUARY}, ${JANUARY}),
      ('pay-refunded', 'refunded', ${FEBRUARY}, ${FEBRUARY});

    insert into "order" (id, currency_code, email, fulfillment_status, payment_id, status, total, user_id, created_at, updated_at) values
      ('o-jan', 'PLN', 'anna@example.com', 'delivered', 'pay-paid', 'completed', 30000, 'u-anna', ${JANUARY}, ${JANUARY}),
      ('o-feb', 'PLN', 'anna@example.com', 'shipped', 'pay-refunded', 'completed', 12000, 'u-anna', ${FEBRUARY}, ${FEBRUARY}),
      ('o-mar-pending', 'PLN', 'anna@example.com', 'not_fulfilled', null, 'pending', 5000, 'u-anna', ${MARCH}, ${MARCH}),
      ('o-cancelled', 'PLN', 'anna@example.com', 'cancelled', null, 'cancelled', 9900, 'u-anna', ${MARCH}, ${MARCH}),
      ('o-piotr', 'PLN', 'piotr@example.com', 'delivered', 'pay-paid', 'completed', 7000, 'u-piotr', ${JANUARY}, ${JANUARY});

    insert into product_category (id, handle, titles, created_at, updated_at) values
      ('cat-rings', 'rings', '{"en-US":"Rings","pl-PL":"Pierścionki"}', ${JANUARY}, ${JANUARY}),
      ('cat-chains', 'chains', '{"en-US":"Chains","pl-PL":"Łańcuszki"}', ${JANUARY}, ${JANUARY});

    insert into product_collection (id, handle, titles, created_at, updated_at) values
      ('col-new', 'new-arrivals', '{"en-US":"New arrivals","pl-PL":"Nowości"}', ${JANUARY}, ${JANUARY});

    insert into category_on_product (category_id, product_id, is_primary) values
      ('cat-rings', 'p-ring', 1),
      ('cat-chains', 'p-chain', 1),
      ('cat-rings', 'p-chain', 0);

    insert into collection_on_product (collection_id, product_id, rank) values ('col-new', 'p-ring', 0);

    insert into order_item (id, order_id, product_id, quantity, subtotal, title, total, unit_price, created_at, updated_at) values
      ('oi-ring', 'o-jan', 'p-ring', 1, 20000, 'Silver ring', 20000, 20000, ${JANUARY}, ${JANUARY}),
      ('oi-chain', 'o-jan', 'p-chain', 1, 10000, 'Gold chain', 10000, 10000, ${JANUARY}, ${JANUARY}),
      ('oi-chain-2', 'o-feb', 'p-chain', 1, 12000, 'Amber chain', 12000, 12000, ${FEBRUARY}, ${FEBRUARY}),
      ('oi-pending', 'o-mar-pending', 'p-ring', 1, 5000, 'Pending ring', 5000, 5000, ${MARCH}, ${MARCH}),
      ('oi-untracked', 'o-jan', null, 1, 500, 'Gift wrap', 500, 500, ${JANUARY}, ${JANUARY});

    insert into audit_log (id, action, actor_name, actor_role, category, severity, target, resource_id, detail, metadata, created_at) values
      ('al-login', 'auth.login', 'Anna', 'customer', 'auth', 'info', 'session', 'u-anna', 'Signed in', '{"ip":"1.1.1.1"}', ${MARCH}),
      ('al-view', 'customer.page_viewed', 'Anna', 'customer', 'customer', 'info', '/products', 'u-anna', null, null, ${FEBRUARY}),
      ('al-cart', 'customer.cart_item_added', 'Anna', 'customer', 'customer', 'info', 'cart', 'u-anna', null, null, ${JANUARY}),
      ('al-admin', 'order.shipped', 'Admin', 'admin', 'order', 'info', 'o-jan', 'u-anna', null, null, ${MARCH}),
      ('al-other', 'auth.login', 'Piotr', 'customer', 'auth', 'info', 'session', 'u-piotr', null, null, ${MARCH});
  `)
}

beforeEach(() => {
  sqlite.exec(DDL)
  seed()
})

afterAll(() => {
  sqlite.close()
})

describe("getDefaultCustomerAddressFullQuery", () => {
  it("returns only the address flagged as the default one", async () => {
    const rows = await getDefaultCustomerAddressFullQuery("u-anna")

    expect(rows).toStrictEqual([
      { address1: "ul. Krucza 1", address2: "m. 4", city: "Warszawa", countryCode: "PL", postalCode: "00-001", province: "mazowieckie" },
    ])
  })

  it("keeps the optional lines null when the customer left them out", async () => {
    const rows = await getDefaultCustomerAddressFullQuery("u-piotr")

    expect(rows[0]?.address2).toBeNull()
    expect(rows[0]?.province).toBeNull()
  })

  it("returns nothing for a customer with no default address", async () => {
    sqlite.exec(`update address set is_default = 0`)

    await expect(getDefaultCustomerAddressFullQuery("u-anna")).resolves.toStrictEqual([])
  })
})

describe("getLatestSessionActivityQuery", () => {
  it("reports the most recent session update", async () => {
    const rows = await getLatestSessionActivityQuery("u-anna")

    expect(rows[0]?.lastActiveAt?.getTime()).toBe(MARCH)
  })

  it("reports no activity for a customer who never signed in", async () => {
    const rows = await getLatestSessionActivityQuery("u-nobody")

    expect(rows).toHaveLength(1)
    expect(rows[0]?.lastActiveAt).toBeNull()
  })
})

describe("getCustomerMonthlySpendingQuery", () => {
  it("sums only the customer's own completed orders", async () => {
    const rows = await getCustomerMonthlySpendingQuery("u-anna", EPOCH_START)
    const total = rows.reduce((sum, row) => sum + row.amount, 0)

    expect(total).toBe(42_000)
  })

  it("leaves out orders placed before the window opens", async () => {
    const rows = await getCustomerMonthlySpendingQuery("u-anna", new Date(FEBRUARY))
    const total = rows.reduce((sum, row) => sum + row.amount, 0)

    expect(total).toBe(12_000)
  })

  it("returns nothing for a customer with no completed orders", async () => {
    await expect(getCustomerMonthlySpendingQuery("u-nobody", EPOCH_START)).resolves.toStrictEqual([])
  })
})

describe("getCustomerCategoryBreakdownQuery", () => {
  it("ranks the primary categories the customer spent most on", async () => {
    const rows = await getCustomerCategoryBreakdownQuery("u-anna")

    expect(rows.map((row) => row.amount)).toStrictEqual([22_000, 20_000])
  })

  it("ignores the non-primary category link so a line is counted once", async () => {
    const rows = await getCustomerCategoryBreakdownQuery("u-anna")

    expect(rows).toHaveLength(2)
  })

  it("leaves out lines from orders that are not completed", async () => {
    sqlite.exec(`delete from "order" where id in ('o-jan', 'o-feb')`)

    await expect(getCustomerCategoryBreakdownQuery("u-anna")).resolves.toStrictEqual([])
  })

  it("returns nothing for another customer's orders", async () => {
    await expect(getCustomerCategoryBreakdownQuery("u-piotr")).resolves.toStrictEqual([])
  })
})

describe("getCustomerPreferredCategoryQuery", () => {
  it("returns the single highest spending category", async () => {
    const rows = await getCustomerPreferredCategoryQuery("u-anna")

    expect(rows).toHaveLength(1)
    expect(rows[0]?.amount).toBe(22_000)
  })

  it("returns nothing when the customer bought nothing categorised", async () => {
    sqlite.exec(`delete from category_on_product`)

    await expect(getCustomerPreferredCategoryQuery("u-anna")).resolves.toStrictEqual([])
  })
})

describe("getCustomerPreferredCollectionQuery", () => {
  it("returns the collection the customer spent most on", async () => {
    const rows = await getCustomerPreferredCollectionQuery("u-anna")

    expect(rows).toHaveLength(1)
    expect(rows[0]?.amount).toBe(20_000)
  })

  it("requires the product to be in a collection at all", async () => {
    sqlite.exec(`delete from collection_on_product`)

    await expect(getCustomerPreferredCollectionQuery("u-anna")).resolves.toStrictEqual([])
  })
})

describe("getAdminCustomerOrderRowsQuery", () => {
  it("lists the countable orders newest first and drops the cancelled one", async () => {
    const rows = await getAdminCustomerOrderRowsQuery("u-anna")

    expect(rows.map((row) => row.id)).toStrictEqual(["o-mar-pending", "o-feb", "o-jan"])
  })

  it("joins the payment status and leaves it null without a payment row", async () => {
    const rows = await getAdminCustomerOrderRowsQuery("u-anna")

    expect(rows.find((row) => row.id === "o-jan")?.paymentStatus).toBe("succeeded")
    expect(rows.find((row) => row.id === "o-mar-pending")?.paymentStatus).toBeNull()
  })

  it("stops at the customer detail page limit", async () => {
    const rows = await getAdminCustomerOrderRowsQuery("u-anna")

    expect(rows.length).toBeLessThanOrEqual(ADMIN_CUSTOMER_DETAIL_ORDERS_LIMIT)
  })

  it("returns nothing for a customer with no orders", async () => {
    await expect(getAdminCustomerOrderRowsQuery("u-nobody")).resolves.toStrictEqual([])
  })
})

describe("getCustomerAuditTimelineQuery", () => {
  it("returns the customer's own storefront activity newest first", async () => {
    const rows = await getCustomerAuditTimelineQuery("u-anna")

    expect(rows.map((row) => row.action)).toStrictEqual(["auth.login", "customer.page_viewed", "customer.cart_item_added"])
  })

  it("leaves out admin actions recorded against the same customer", async () => {
    const rows = await getCustomerAuditTimelineQuery("u-anna")

    expect(rows.map((row) => row.action)).not.toContain("order.shipped")
  })

  it("carries the detail and metadata of each entry", async () => {
    const rows = await getCustomerAuditTimelineQuery("u-anna")

    expect(rows[0]?.detail).toBe("Signed in")
    expect(rows[0]?.metadata).toBe('{"ip":"1.1.1.1"}')
    expect(rows[0]?.createdAt.getTime()).toBe(MARCH)
  })

  it("returns nothing for a customer with no tracked activity", async () => {
    await expect(getCustomerAuditTimelineQuery("u-nobody")).resolves.toStrictEqual([])
  })
})

describe("getOrderItemTitlesQuery", () => {
  it("short circuits to an empty list without touching the database", async () => {
    await expect(getOrderItemTitlesQuery([])).resolves.toStrictEqual([])
  })

  it("returns every line of the requested orders sorted by title", async () => {
    const rows = await getOrderItemTitlesQuery(["o-jan", "o-feb"])

    expect(rows).toStrictEqual([
      { orderId: "o-feb", title: "Amber chain" },
      { orderId: "o-jan", title: "Gift wrap" },
      { orderId: "o-jan", title: "Gold chain" },
      { orderId: "o-jan", title: "Silver ring" },
    ])
  })

  it("ignores order ids that hold no lines", async () => {
    await expect(getOrderItemTitlesQuery(["o-cancelled"])).resolves.toStrictEqual([])
  })
})
