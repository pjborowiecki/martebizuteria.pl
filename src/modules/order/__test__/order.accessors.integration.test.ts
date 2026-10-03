import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { DATE_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  getAdminOrderCustomerStats,
  getAdminOrderDetailRow,
  getAdminOrderItemRows,
  getAdminOrderRefundTarget,
  getAdminOrderStats,
  getAdminOrderTimelineRows,
  getAdminOrdersExport,
  getAdminOrdersPage,
  getOrderByCheckoutId,
  getOrderByTransactionId,
  getOrderForShippedEmail,
  getOrderMetadata,
  getOrderTotalsForEmail,
  getRestockLinesForOrder,
  updateOrderMetadata,
} from "~/src/modules/order/order.accessors"
import {
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_STAT_FILTER,
  ADMIN_ORDER_TAB,
} from "~/src/modules/order/order.constants"

const JANUARY = Date.UTC(2024, 0, 10)

const JUNE = Date.UTC(2024, 5, 10)

const page = { limit: 25, offset: 0 }

const orderIds = async (params: Parameters<typeof getAdminOrdersPage>[0]): Promise<string[]> => {
  const result = await getAdminOrdersPage(params)

  return result.rows.map((row) => row.id)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists order_item;
    drop table if exists payment;
    drop table if exists user;

    create table user (id text primary key, name text not null, email text not null, created_at integer not null, updated_at integer not null);
    create table payment (id text primary key, status text, transaction_id text, created_at integer not null, updated_at integer not null);
    create table "order" (
      id text primary key, checkout_id text, payment_id text, user_id text, email text not null,
      currency_code text not null default 'PLN', status text not null default 'pending',
      fulfillment_status text not null default 'not_fulfilled', total integer not null default 0,
      metadata text, order_number text, tracking_number text, tracking_url text,
      discount_total integer not null default 0, shipping_total integer not null default 0,
      subtotal integer not null default 0, tax_total integer not null default 0, tax_basis_points integer not null default 2300,
      created_at integer not null, updated_at integer not null
    );
    create table order_item (
      id text primary key, order_id text, variant_id text, quantity integer not null default 1,
      created_at integer not null, updated_at integer not null
    );

    insert into user (id, name, email, created_at, updated_at) values ('u-anna', 'Anna Kowalska', 'anna@example.com', ${JANUARY}, ${JANUARY});

    insert into payment (id, status, transaction_id, created_at, updated_at) values
      ('pay-paid', 'succeeded', 'cs_paid', ${JANUARY}, ${JANUARY}),
      ('pay-refunded', 'refunded', 'pi_refunded', ${JUNE}, ${JUNE}),
      ('pay-pending', 'pending', null, ${JUNE}, ${JUNE});

    insert into "order" (id, checkout_id, payment_id, user_id, email, status, fulfillment_status, total, metadata, order_number, tracking_number, created_at, updated_at) values
      ('o-pending', 'chk-1', 'pay-pending', 'u-anna', 'anna@example.com', 'pending', 'not_fulfilled', 10000, '{"locale":"en-US"}', 'MRT-2024-00001', null, ${JANUARY}, ${JANUARY}),
      ('o-unfulfilled', 'chk-2', 'pay-paid', 'u-anna', 'anna@example.com', 'processing', 'not_fulfilled', 20000, null, 'MRT-2024-00002', null, ${JUNE}, ${JUNE}),
      ('o-shipped', 'chk-3', 'pay-paid', null, 'guest@example.com', 'processing', 'shipped', 30000, null, 'MRT-2024-00003', 'TRK-9', ${JUNE}, ${JUNE}),
      ('o-delivered', 'chk-4', 'pay-refunded', null, 'guest@example.com', 'completed', 'delivered', 40000, null, 'MRT-2024-00004', null, ${JUNE}, ${JUNE}),
      ('o-cancelled', 'chk-5', null, null, 'guest@example.com', 'cancelled', 'cancelled', 50000, null, 'MRT-2024-00005', null, ${JUNE}, ${JUNE});

    insert into order_item (id, order_id, variant_id, quantity, created_at, updated_at) values
      ('oi-1', 'o-pending', 'v-1', 2, ${JANUARY}, ${JANUARY}),
      ('oi-2', 'o-pending', 'v-2', 3, ${JANUARY}, ${JANUARY}),
      ('oi-3', 'o-shipped', 'v-1', 1, ${JUNE}, ${JUNE});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getAdminOrdersPage row shape", () => {
  it("lists the newest orders first with the total count", async () => {
    const result = await getAdminOrdersPage(page)

    expect(result.total).toBe(5)
    expect(result.rows[0]?.createdAt.getTime()).toBe(JUNE)
    expect(result.rows.at(-1)?.id).toBe("o-pending")
  })

  it("joins the customer name onto the order", async () => {
    const result = await getAdminOrdersPage(page)
    const withAccount = result.rows.find((row) => row.id === "o-unfulfilled")
    const guest = result.rows.find((row) => row.id === "o-shipped")

    expect(withAccount?.customerName).toBe("Anna Kowalska")
    expect(guest?.customerName).toBeNull()
  })

  it("keeps the payment status distinct from the order status through the batched read", async () => {
    const result = await getAdminOrdersPage(page)
    const row = result.rows.find((candidate) => candidate.id === "o-unfulfilled")

    expect(row?.paymentStatus).toBe("succeeded")
    expect(row?.status).toBe("processing")
    expect(row?.total).toBe(20_000)
    expect(row?.userId).toBe("u-anna")
  })

  it("sums the line quantities into the item count", async () => {
    const result = await getAdminOrdersPage(page)

    expect(result.rows.find((row) => row.id === "o-pending")?.itemCount).toBe(5)
    expect(result.rows.find((row) => row.id === "o-shipped")?.itemCount).toBe(1)
  })

  it("reports zero items for an order with no lines", async () => {
    const result = await getAdminOrdersPage(page)

    expect(result.rows.find((row) => row.id === "o-delivered")?.itemCount).toBe(0)
  })

  it("pages through the list", async () => {
    const first = await getAdminOrdersPage({ limit: 2, offset: 0 })
    const second = await getAdminOrdersPage({ limit: 2, offset: 2 })

    expect(first.rows).toHaveLength(2)
    expect(second.rows).toHaveLength(2)
    expect(first.rows.map((row) => row.id)).not.toStrictEqual(second.rows.map((row) => row.id))
  })

  it("does no line lookup for a page beyond the end", async () => {
    const result = await getAdminOrdersPage({ limit: 25, offset: 100 })

    expect(result.rows).toStrictEqual([])
    expect(result.total).toBe(5)
  })

  it.each([["o-shipped"], ["TRK-9"], ["guest@example.com"]])("finds an order by %j", async (search) => {
    expect(await orderIds({ ...page, search })).toContain("o-shipped")
  })

  it.each([["Anna"], ["u-anna"], ["anna@example.com"]])("finds an order by its customer %j", async (search) => {
    expect(await orderIds({ ...page, search })).toContain("o-unfulfilled")
  })

  it("ignores a blank search", async () => {
    expect(await orderIds({ ...page, search: "  " })).toHaveLength(5)
  })
})

describe("getAdminOrdersPage filtering", () => {
  it.each([[ADMIN_ORDER_TAB.ALL], [undefined]])("keeps every order under the %j tab", async (tab) => {
    expect(await orderIds({ ...page, tab })).toHaveLength(5)
  })

  it("narrows the pending tab to orders awaiting confirmation", async () => {
    expect(await orderIds({ ...page, tab: ADMIN_ORDER_TAB.PENDING })).toStrictEqual(["o-pending"])
  })

  it("excludes pending and cancelled orders from the unfulfilled tab", async () => {
    expect(await orderIds({ ...page, tab: ADMIN_ORDER_TAB.UNFULFILLED })).toStrictEqual(["o-unfulfilled"])
  })

  it.each([
    [ADMIN_ORDER_TAB.SHIPPED, "o-shipped"],
    [ADMIN_ORDER_TAB.DELIVERED, "o-delivered"],
  ])("narrows the %s tab", async (tab, expected) => {
    expect(await orderIds({ ...page, tab })).toStrictEqual([expected])
  })

  it("narrows to pending orders for the pending stat card", async () => {
    expect(await orderIds({ ...page, statFilter: ADMIN_ORDER_STAT_FILTER.PENDING })).toStrictEqual(["o-pending"])
  })

  it("keeps every order for the total stat card", async () => {
    expect(await orderIds({ ...page, statFilter: ADMIN_ORDER_STAT_FILTER.TOTAL })).toHaveLength(5)
  })

  it("filters by order status", async () => {
    expect(await orderIds({ ...page, filters: { status: "cancelled" } })).toStrictEqual(["o-cancelled"])
  })

  it.each([
    [ADMIN_ORDER_PAYMENT_UI_KEY.PAID, ["o-shipped", "o-unfulfilled"]],
    [ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED, ["o-delivered"]],
  ])("filters by the %s payment state", async (payment, expected) => {
    const ids = await orderIds({ ...page, filters: { payment } })

    expect(ids.toSorted()).toStrictEqual(expected.toSorted())
  })

  it("treats an order with no payment row as merely authorized", async () => {
    const ids = await orderIds({ ...page, filters: { payment: ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED } })

    expect(ids.toSorted()).toStrictEqual(["o-cancelled", "o-pending"])
  })

  it.each([
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING, ["o-pending"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED, ["o-unfulfilled"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED, ["o-shipped"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED, ["o-delivered"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.RETURNED, ["o-cancelled"]],
  ])("filters by the %s fulfilment state", async (fulfillment, expected) => {
    expect(await orderIds({ ...page, filters: { fulfillment } })).toStrictEqual(expected)
  })

  it("filters by the order total", async () => {
    const ids = await orderIds({ ...page, filters: { total: { amountMinorUnits: 40_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE } } })

    expect(ids.toSorted()).toStrictEqual(["o-cancelled", "o-delivered"])
  })

  it("filters to the orders placed on one day", async () => {
    const filters = { createdAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON } }

    const ids = await orderIds({ ...page, filters })

    expect(ids.toSorted()).toStrictEqual(["o-cancelled", "o-delivered", "o-shipped", "o-unfulfilled"])
  })

  it("filters to the orders placed before a day", async () => {
    const filters = { createdAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE } }

    expect(await orderIds({ ...page, filters })).toStrictEqual(["o-pending"])
  })

  it("filters to the orders placed inside a day range", async () => {
    const filters = {
      createdAt: { endDate: "2024-01-31", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-01-01" },
    }

    expect(await orderIds({ ...page, filters })).toStrictEqual(["o-pending"])
  })

  it("combines a tab with a search", async () => {
    expect(await orderIds({ ...page, search: "guest", tab: ADMIN_ORDER_TAB.SHIPPED })).toStrictEqual(["o-shipped"])
  })
})

describe("getAdminOrdersExport", () => {
  it("returns every matching order without paging", async () => {
    expect(await getAdminOrdersExport({})).toHaveLength(5)
  })

  it("applies the same filters as the paged query", async () => {
    const rows = await getAdminOrdersExport({ tab: ADMIN_ORDER_TAB.SHIPPED })

    expect(rows.map((row) => row.id)).toStrictEqual(["o-shipped"])
    expect(rows[0]?.itemCount).toBe(1)
  })

  it("maps the duplicated status column correctly, unlike the batched paged query", async () => {
    const rows = await getAdminOrdersExport({ tab: ADMIN_ORDER_TAB.UNFULFILLED })

    expect(rows[0]).toMatchObject({ paymentStatus: "succeeded", status: "processing", total: 20_000, userId: "u-anna" })
  })

  it("returns nothing when no order matches", async () => {
    expect(await getAdminOrdersExport({ search: "nobody" })).toStrictEqual([])
  })
})

describe("getAdminOrderStats", () => {
  it("counts only the statuses that count as orders", async () => {
    const stats = await getAdminOrderStats()

    expect(stats.totalOrders).toBe(5)
    expect(stats.pending).toBe(1)
  })

  it("takes revenue from completed orders only", async () => {
    const stats = await getAdminOrderStats()

    expect(stats.revenueMinorUnits).toBe(40_000)
    expect(stats.avgValueMinorUnits).toBe(40_000)
  })

  it("reports the currency the completed orders were taken in", async () => {
    const stats = await getAdminOrderStats()

    expect(stats.currencyCode).toBe("PLN")
  })

  it("falls back to zeroes and the store currency for an empty book", async () => {
    sqlite.exec(`delete from "order"`)

    expect(await getAdminOrderStats()).toStrictEqual({
      avgValueMinorUnits: 0,
      currencyCode: "PLN",
      pending: 0,
      revenueMinorUnits: 0,
      totalOrders: 0,
    })
  })
})

describe("single order lookups", () => {
  it("finds an order by its checkout", async () => {
    expect(await getOrderByCheckoutId("chk-3")).toStrictEqual({ id: "o-shipped", status: "processing" })
  })

  it("reports nothing for an unknown checkout", async () => {
    expect(await getOrderByCheckoutId("chk-missing")).toBeUndefined()
  })

  it("reads the stored metadata", async () => {
    expect(await getOrderMetadata("o-pending")).toStrictEqual({ metadata: '{"locale":"en-US"}' })
    expect(await getOrderMetadata("o-shipped")).toStrictEqual({ metadata: null })
  })

  it("reads only what the shipped email needs", async () => {
    expect(await getOrderForShippedEmail("o-pending")).toStrictEqual({
      checkoutId: "chk-1",
      email: "anna@example.com",
      id: "o-pending",
      metadata: '{"locale":"en-US"}',
      orderNumber: "MRT-2024-00001",
      trackingNumber: null,
      trackingUrl: null,
      userId: "u-anna",
    })
  })

  it("carries the captured tracking details into the shipped email lookup", async () => {
    const shipped = await getOrderForShippedEmail("o-shipped")

    expect(shipped?.trackingNumber).toBe("TRK-9")
  })

  it("counts a customer's live orders but only banks revenue from completed ones", async () => {
    expect(await getAdminOrderCustomerStats("u-anna")).toStrictEqual({ orderCount: 2, totalSpent: 0 })
  })

  it("reports an empty history for a customer with no orders", async () => {
    expect(await getAdminOrderCustomerStats("u-nobody")).toStrictEqual({ orderCount: 0, totalSpent: 0 })
  })

  it("resolves the Checkout Session an admin refund would target", async () => {
    expect(await getAdminOrderRefundTarget("o-unfulfilled")).toStrictEqual({
      metadata: null,
      paymentStatus: "succeeded",
      status: "processing",
      total: 20_000,
      transactionId: "cs_paid",
    })
  })

  it("carries the metadata a dispute flag lives in, so the refund can refuse a disputed order", async () => {
    const disputed = '{"dispute":{"amount":20000,"id":"dp_1","reason":"fraudulent","status":"needs_response"}}'
    await updateOrderMetadata("o-unfulfilled", disputed)

    const target = await getAdminOrderRefundTarget("o-unfulfilled")

    expect(target?.metadata).toBe(disputed)
  })

  it("reports an unpayable order rather than inventing a payment intent", async () => {
    expect(await getAdminOrderRefundTarget("o-cancelled")).toStrictEqual({
      metadata: null,
      paymentStatus: null,
      status: "cancelled",
      total: 50_000,
      transactionId: null,
    })
  })

  it("resolves nothing for an order that does not exist", async () => {
    expect(await getAdminOrderRefundTarget("o-missing")).toBeUndefined()
  })

  it("lists the lines to restock for an order", async () => {
    const lines = await getRestockLinesForOrder("o-pending")

    expect(lines).toStrictEqual([
      { quantity: 2, variantId: "v-1" },
      { quantity: 3, variantId: "v-2" },
    ])
  })

  it("lists nothing to restock for an order with no lines", async () => {
    expect(await getRestockLinesForOrder("o-delivered")).toStrictEqual([])
  })

  it("replaces the stored metadata", async () => {
    await updateOrderMetadata("o-shipped", '{"locale":"pl-PL"}')

    expect(await getOrderMetadata("o-shipped")).toStrictEqual({ metadata: '{"locale":"pl-PL"}' })
  })

  it("leaves other orders' metadata alone", async () => {
    await updateOrderMetadata("o-shipped", '{"locale":"pl-PL"}')

    expect(await getOrderMetadata("o-pending")).toStrictEqual({ metadata: '{"locale":"en-US"}' })
  })
})

const createPlacedOrderTables = (): void => {
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists payment;
    drop table if exists user;
    drop table if exists checkout;
    drop table if exists address;
    drop table if exists order_address;
    drop table if exists delivery_method;
    drop table if exists courier;

    create table user (id text primary key, name text not null, phone text);
    create table payment (
      id text primary key, amount integer not null, checkout_id text not null, currency text not null default 'PLN',
      provider text not null, refunded_amount integer not null default 0, refunded_at integer,
      status text not null default 'pending', transaction_id text, created_at integer not null, updated_at integer not null
    );
    create table courier (id text primary key, name text not null);
    create table delivery_method (
      id text primary key, api_service_code text not null, courier_id text not null, description text,
      is_active integer not null default 1, name text not null, price integer not null, type text not null,
      created_at integer not null, updated_at integer not null
    );
    create table address (
      id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
      first_name text, is_default integer not null default 0, last_name text, phone text, postal_code text,
      province text, user_id text, created_at integer not null, updated_at integer not null
    );
    create table checkout (id text primary key, billing_address_id text, shipping_address_id text);
    create table "order" (
      id text primary key, billing_company_name text, billing_nip text, canceled_at integer, checkout_id text,
      currency_code text not null default 'PLN', customer_note text, delivered_at integer, delivery_method_id text,
      discount_id text, discount_total integer not null default 0, email text not null,
      fulfillment_status text not null default 'not_fulfilled', locker_id text, metadata text, order_number text not null,
      payment_id text, shipped_at integer, shipping_total integer not null default 0, status text not null default 'pending',
      subtotal integer not null default 0, tax_basis_points integer not null default 2300, tax_total integer not null default 0,
      total integer not null default 0, tracking_number text, tracking_url text, user_id text,
      created_at integer not null, updated_at integer not null
    );
    create table order_address (
      id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
      first_name text not null, last_name text not null, order_id text not null, phone text, postal_code text,
      province text, type text not null, created_at integer not null, updated_at integer not null
    );
  `)
}

describe("getAdminOrderDetailRow", () => {
  beforeEach(() => {
    createPlacedOrderTables()
    sqlite.exec(`
      insert into user (id, name) values ('u-anna', 'Anna Kowalska');
      insert into address (id, address1, city, country_code, first_name, last_name, user_id, created_at, updated_at) values
        ('addr-anna', 'ul. Edited 1', 'Gdansk', 'PL', 'Anna', 'Kowalska', 'u-anna', ${JUNE}, ${JUNE});
      insert into checkout (id, billing_address_id, shipping_address_id) values ('chk-1', 'addr-anna', 'addr-anna');
      insert into "order" (id, checkout_id, email, order_number, user_id, created_at, updated_at) values
        ('o-placed', 'chk-1', 'anna@example.com', 'MRT-2024-00001', 'u-anna', ${JANUARY}, ${JANUARY});
      insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, type, created_at, updated_at) values
        ('oa-ship', 'ul. Mokotowska 12', 'Warszawa', 'PL', 'Anna', 'Kowalska', 'o-placed', 'shipping', ${JANUARY}, ${JANUARY}),
        ('oa-bill', 'ul. Firmowa 1', 'Krakow', 'PL', 'Anna', 'Kowalska', 'o-placed', 'billing', ${JANUARY}, ${JANUARY});
    `)
  })

  it("reads the address snapshots written when the order was placed alongside the editable checkout rows", async () => {
    const row = await getAdminOrderDetailRow("o-placed")
    const snapshots = row?.addresses.map(({ address1, type }) => ({ address1, type }))

    expect(snapshots?.toSorted((left, right) => left.type.localeCompare(right.type))).toStrictEqual([
      { address1: "ul. Firmowa 1", type: "billing" },
      { address1: "ul. Mokotowska 12", type: "shipping" },
    ])
    expect(row?.checkout?.shippingAddress?.address1).toBe("ul. Edited 1")
  })
})

describe("aggregate reads when the database answers with no rows", () => {
  beforeEach(() => {
    const prepare = sqlite.prepare.bind(sqlite)
    vi.spyOn(sqlite, "prepare").mockImplementation((query: string) => prepare(`select * from (${query}) where 0`))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("reports an empty page with no total", async () => {
    expect(await getAdminOrdersPage(page)).toStrictEqual({ rows: [], total: 0 })
  })

  it("reports zeroed stats in the store currency", async () => {
    expect(await getAdminOrderStats()).toStrictEqual({
      avgValueMinorUnits: 0,
      currencyCode: STORE_CURRENCY_CODE,
      pending: 0,
      revenueMinorUnits: 0,
      totalOrders: 0,
    })
  })

  it("reports an empty customer history", async () => {
    expect(await getAdminOrderCustomerStats("u-anna")).toStrictEqual({ orderCount: 0, totalSpent: 0 })
  })
})

const seedPlacedOrderReads = (): void => {
  createPlacedOrderTables()
  sqlite.exec(`
    drop table if exists checkout;
    drop table if exists order_item;
    drop table if exists product_variant;
    drop table if exists product;
    drop table if exists audit_log;

    create table checkout (
      id text primary key, billing_address_id text, billing_company_name text, billing_nip text, cart_id text,
      customer_note text, delivery_method_id text, discount_id text, email text, locker_id text, shipping_address_id text,
      status text, user_id text, created_at integer, updated_at integer
    );
    create table product (id text primary key, handle text not null, thumbnail text);
    create table product_variant (id text primary key, product_id text not null, sku text, title text not null);
    create table order_item (
      id text primary key, order_id text not null, variant_id text, quantity integer not null, thumbnail text,
      title text not null, total integer not null, unit_price integer not null, variant_title text,
      created_at integer not null, updated_at integer not null
    );
    create table audit_log (
      id text primary key, action text not null, actor_name text not null, detail text, resource_id text,
      severity text not null, created_at integer not null
    );

    insert into courier (id, name) values ('courier-inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type, created_at, updated_at) values
      ('dm-locker', 'inpost_locker', 'courier-inpost', 'Paczkomat 24/7', 1500, 'locker', ${JANUARY}, ${JANUARY});
    insert into address (id, address1, city, country_code, first_name, last_name, created_at, updated_at) values
      ('addr-edited', 'ul. Edited 1', 'Gdansk', 'PL', 'Anna', 'Kowalska', ${JUNE}, ${JUNE});
    insert into checkout (id, billing_address_id, shipping_address_id) values ('chk-placed', 'addr-edited', 'addr-edited');
    insert into payment (id, amount, checkout_id, provider, status, transaction_id, created_at, updated_at) values
      ('pay-placed', 12900, 'chk-placed', 'stripe', 'succeeded', 'cs_placed', ${JANUARY}, ${JANUARY}),
      ('pay-other', 4900, 'chk-other', 'stripe', 'succeeded', 'cs_other', ${JANUARY}, ${JANUARY});
    insert into "order" (
      id, checkout_id, delivery_method_id, discount_total, email, order_number, payment_id, shipping_total,
      subtotal, tax_total, total, created_at, updated_at
    ) values
      ('o-placed', 'chk-placed', 'dm-locker', 1000, 'anna@example.com', 'MRT-2024-00001', 'pay-placed', 1500, 12400, 2412, 12900, ${JANUARY}, ${JANUARY}),
      ('o-other', 'chk-other', null, 0, 'guest@example.com', 'MRT-2024-00002', 'pay-other', 0, 4900, 916, 4900, ${JUNE}, ${JUNE});
    insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, type, created_at, updated_at) values
      ('oa-ship', 'ul. Mokotowska 12', 'Warszawa', 'PL', 'Anna', 'Kowalska', 'o-placed', 'shipping', ${JANUARY}, ${JANUARY});

    insert into product (id, handle, thumbnail) values ('p-aura', 'aura-hoop', 'products/aura.jpg');
    insert into product_variant (id, product_id, sku, title) values ('v-gold', 'p-aura', 'AUR-HP-GD', 'Gold / Medium');
    insert into order_item (id, order_id, variant_id, quantity, thumbnail, title, total, unit_price, variant_title, created_at, updated_at) values
      ('oi-snapshot', 'o-placed', 'v-gold', 1, 'orders/aura-snapshot.jpg', 'Aura Hoop', 6200, 6200, 'Gold / Small', ${JANUARY}, ${JANUARY}),
      ('oi-current', 'o-placed', 'v-gold', 2, null, 'Aura Hoop', 12400, 6200, null, ${JANUARY + 1}, ${JANUARY + 1}),
      ('oi-deleted', 'o-placed', null, 1, null, 'Retired Ring', 3000, 3000, null, ${JANUARY + 2}, ${JANUARY + 2}),
      ('oi-other', 'o-other', 'v-gold', 1, null, 'Aura Hoop', 4900, 4900, null, ${JUNE}, ${JUNE});

    insert into audit_log (id, action, actor_name, detail, resource_id, severity, created_at) values
      ('audit-placed', '${AUDIT_LOG_ACTION.ORDER_PLACED}', 'System', null, 'o-placed', 'success', ${JANUARY}),
      ('audit-shipped', '${AUDIT_LOG_ACTION.ORDER_SHIPPED}', 'Admin', 'TRK-9', 'o-placed', 'success', ${JUNE}),
      ('audit-product', '${AUDIT_LOG_ACTION.PRODUCT_UPDATED}', 'Admin', null, 'o-placed', 'info', ${JUNE}),
      ('audit-other', '${AUDIT_LOG_ACTION.ORDER_PLACED}', 'System', null, 'o-other', 'success', ${JUNE});
  `)
}

describe("order line and timeline reads for the admin detail", () => {
  beforeEach(seedPlacedOrderReads)

  it("lists an order's lines in the order they were bought", async () => {
    const rows = await getAdminOrderItemRows("o-placed")

    expect(rows.map((row) => row.id)).toStrictEqual(["oi-snapshot", "oi-current", "oi-deleted"])
  })

  it("keeps the thumbnail and variant title captured on the line", async () => {
    const [snapshot] = await getAdminOrderItemRows("o-placed")

    expect(snapshot).toStrictEqual({
      id: "oi-snapshot",
      productHandle: "aura-hoop",
      quantity: 1,
      sku: "AUR-HP-GD",
      thumbnail: "orders/aura-snapshot.jpg",
      title: "Aura Hoop",
      total: 6200,
      unitPrice: 6200,
      variantTitle: "Gold / Small",
    })
  })

  it("falls back to the product thumbnail and the variant's title for a line that captured neither", async () => {
    const rows = await getAdminOrderItemRows("o-placed")

    expect(rows[1]).toMatchObject({ thumbnail: "products/aura.jpg", variantTitle: "Gold / Medium" })
  })

  it("still lists a line whose variant has since been deleted", async () => {
    const rows = await getAdminOrderItemRows("o-placed")

    expect(rows[2]).toMatchObject({ productHandle: null, sku: null, thumbnail: null, title: "Retired Ring", variantTitle: null })
  })

  it("lists only the order's timeline events, newest first", async () => {
    const rows = await getAdminOrderTimelineRows("o-placed")

    expect(rows).toStrictEqual([
      {
        action: AUDIT_LOG_ACTION.ORDER_SHIPPED,
        actorName: "Admin",
        createdAt: new Date(JUNE),
        detail: "TRK-9",
        id: "audit-shipped",
        severity: "success",
      },
      {
        action: AUDIT_LOG_ACTION.ORDER_PLACED,
        actorName: "System",
        createdAt: new Date(JANUARY),
        detail: null,
        id: "audit-placed",
        severity: "success",
      },
    ])
  })
})

describe("order reads for the confirmation page and the emails", () => {
  beforeEach(seedPlacedOrderReads)

  it("finds the order a Checkout Session paid for, with its addresses and delivery", async () => {
    const found = await getOrderByTransactionId("cs_placed")

    expect(found?.id).toBe("o-placed")
    expect(found?.addresses.map((row) => row.address1)).toStrictEqual(["ul. Mokotowska 12"])
    expect(found?.checkout?.shippingAddress?.address1).toBe("ul. Edited 1")
    expect(found?.deliveryMethod?.name).toBe("Paczkomat 24/7")
    expect(found?.deliveryMethod?.courier).toStrictEqual({ name: "InPost" })
  })

  it("matches the transaction against each order's own payment", async () => {
    const found = await getOrderByTransactionId("cs_other")

    expect(found?.id).toBe("o-other")
    expect(found?.deliveryMethod).toBeNull()
  })

  it("finds nothing for a Checkout Session no order was paid with", async () => {
    expect(await getOrderByTransactionId("cs_unknown")).toBeUndefined()
  })

  it("reads only the totals the confirmation email prints", async () => {
    expect(await getOrderTotalsForEmail("o-placed")).toStrictEqual({
      discountTotal: 1000,
      orderNumber: "MRT-2024-00001",
      shippingTotal: 1500,
      subtotal: 12_400,
      taxBasisPoints: 2300,
      taxTotal: 2412,
      total: 12_900,
    })
  })

  it("reads no totals for an order that does not exist", async () => {
    expect(await getOrderTotalsForEmail("o-missing")).toBeUndefined()
  })
})
