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
import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  getAdminOrderCustomerStats,
  getAdminOrderDetailRow,
  getAdminOrderItemCountRows,
  getAdminOrderItemRows,
  getAdminOrderRefundTarget,
  getAdminOrderStats,
  getAdminOrderTimelineRows,
  getAdminOrdersExport,
  getAdminOrdersPage,
  getOrderByCheckoutId,
  getOrderByInpostShipmentId,
  getOrderByTransactionId,
  getOrderInpostShipment,
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

const SHIPPED_EMAIL_DELIVERY = JSON.stringify({ idempotencyKey: "order-shipped/o-placed", orderEmail: { kind: "order-shipped" } })

const page = { limit: 25, offset: 0, timeZone: "Europe/Warsaw" }

const orderIds = async (params: Parameters<typeof getAdminOrdersPage>[0]): Promise<string[]> => {
  const result = await getAdminOrdersPage(params)

  return result.rows.map((row) => row.id)
}

const placedOn = (date: string): Promise<string[]> =>
  orderIds({ ...page, filters: { createdAt: { date, operator: DATE_COLUMN_FILTER_OPERATOR.ON } } })

beforeEach(() => {
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists order_item;
    drop table if exists payment;
    drop table if exists user;

    create table user (id text primary key, name text not null, email text not null, created_at integer not null, updated_at integer not null);
    create table payment (
      id text primary key, refunded_amount integer not null default 0, status text, transaction_id text,
      created_at integer not null, updated_at integer not null
    );
    create table "order" (
      id text primary key, checkout_id text, payment_id text, user_id text, email text not null,
      billing_company_name text, billing_nip text,
      currency_code text not null default 'PLN', status text not null default 'pending',
      fulfillment_status text not null default 'not_fulfilled', total integer not null default 0,
      metadata text, order_number text, tracking_number text, tracking_url text, inpost_shipment_id text,
      discount_total integer not null default 0, shipping_total integer not null default 0,
      subtotal integer not null default 0, tax_total integer not null default 0, tax_basis_points integer not null default 2300,
      in_progress_email_at integer, shipped_email_at integer, delivered_email_at integer,
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

    insert into "order" (id, checkout_id, payment_id, user_id, email, billing_company_name, billing_nip, status, fulfillment_status, total, metadata, order_number, tracking_number, created_at, updated_at) values
      ('o-pending', 'chk-1', 'pay-pending', 'u-anna', 'anna@example.com', null, null, 'pending', 'not_fulfilled', 10000, '{"locale":"en-US"}', 'MRT-2024-00001', null, ${JANUARY}, ${JANUARY}),
      ('o-unfulfilled', 'chk-2', 'pay-paid', 'u-anna', 'anna@example.com', 'Pracownia Złotnicza sp. z o.o.', '5260001246', 'processing', 'not_fulfilled', 20000, null, 'MRT-2024-00002', null, ${JUNE}, ${JUNE}),
      ('o-shipped', 'chk-3', 'pay-paid', null, 'guest@example.com', null, null, 'processing', 'shipped', 30000, null, 'MRT-2024-00003', 'TRK-9', ${JUNE}, ${JUNE}),
      ('o-delivered', 'chk-4', 'pay-refunded', null, 'guest@example.com', null, null, 'completed', 'delivered', 40000, null, 'MRT-2024-00004', null, ${JUNE}, ${JUNE}),
      ('o-cancelled', 'chk-5', null, null, 'guest@example.com', null, null, 'cancelled', 'cancelled', 50000, null, 'MRT-2024-00005', null, ${JUNE}, ${JUNE});

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

  it("sums the line quantities into the item count, and reads no count for an order with no lines", async () => {
    const rows = await getAdminOrderItemCountRows(["o-pending", "o-shipped", "o-delivered"])

    expect(new Map(rows.map((row) => [row.orderId, row.itemCount]))).toStrictEqual(
      new Map([
        ["o-pending", 5],
        ["o-shipped", 1],
      ]),
    )
  })

  it("carries the metadata a dispute flag lives in, so the list can block the cancellation of a disputed order", async () => {
    const result = await getAdminOrdersPage(page)

    expect(result.rows.find((row) => row.id === "o-pending")?.metadata).toBe('{"locale":"en-US"}')
    expect(result.rows.find((row) => row.id === "o-shipped")?.metadata).toBeNull()
  })

  it("pages through the list", async () => {
    const first = await getAdminOrdersPage({ limit: 2, offset: 0, timeZone: "Europe/Warsaw" })
    const second = await getAdminOrdersPage({ limit: 2, offset: 2, timeZone: "Europe/Warsaw" })

    expect(first.rows).toHaveLength(2)
    expect(second.rows).toHaveLength(2)
    expect(first.rows.map((row) => row.id)).not.toStrictEqual(second.rows.map((row) => row.id))
  })

  it("does no line lookup for a page beyond the end", async () => {
    const result = await getAdminOrdersPage({ limit: 25, offset: 100, timeZone: "Europe/Warsaw" })

    expect(result.rows).toStrictEqual([])
    expect(result.total).toBe(5)
  })

  it.each([["o-shipped"], ["TRK-9"], ["guest@example.com"]])("finds an order by %j", async (search) => {
    expect(await orderIds({ ...page, search })).toContain("o-shipped")
  })

  it.each([["Anna"], ["u-anna"], ["anna@example.com"]])("finds an order by its customer %j", async (search) => {
    expect(await orderIds({ ...page, search })).toContain("o-unfulfilled")
  })

  it("finds an order by the number the shop gave it and carries that number on the row", async () => {
    const result = await getAdminOrdersPage({ ...page, search: "MRT-2024-00003" })

    expect(result.rows.map((row) => [row.id, row.orderNumber])).toStrictEqual([["o-shipped", "MRT-2024-00003"]])
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
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.CONFIRMED, ["o-unfulfilled"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED, ["o-shipped"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED, ["o-delivered"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.CANCELLED, ["o-cancelled"]],
  ])("filters by the %s fulfilment step", async (fulfillment, expected) => {
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
    expect(await getAdminOrdersExport({ timeZone: "Europe/Warsaw" })).toHaveLength(5)
  })

  it("applies the same filters as the paged query", async () => {
    const rows = await getAdminOrdersExport({ tab: ADMIN_ORDER_TAB.SHIPPED, timeZone: "Europe/Warsaw" })

    expect(rows.map((row) => row.id)).toStrictEqual(["o-shipped"])
  })

  it("maps the duplicated status column correctly, unlike the batched paged query", async () => {
    const rows = await getAdminOrdersExport({ tab: ADMIN_ORDER_TAB.UNFULFILLED, timeZone: "Europe/Warsaw" })

    expect(rows[0]).toMatchObject({ paymentStatus: "succeeded", status: "processing", total: 20_000, userId: "u-anna" })
  })

  it("reads the company and NIP a business buyer gave, and nothing for an order without them", async () => {
    const rows = await getAdminOrdersExport({ timeZone: "Europe/Warsaw" })
    const company = rows.find((row) => row.id === "o-unfulfilled")
    const guest = rows.find((row) => row.id === "o-shipped")

    expect(company).toMatchObject({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" })
    expect(guest).toMatchObject({ billingCompanyName: null, billingNip: null })
  })

  it("returns nothing when no order matches", async () => {
    expect(await getAdminOrdersExport({ search: "nobody", timeZone: "Europe/Warsaw" })).toStrictEqual([])
  })
})

describe("getAdminOrderStats", () => {
  it("counts only the statuses that count as orders", async () => {
    const stats = await getAdminOrderStats()

    expect(stats.totalOrders).toBe(5)
    expect(stats.pending).toBe(1)
  })

  it("books every processing and completed order, sent or not, and leaves out the unpaid pending and the cancelled one", async () => {
    const stats = await getAdminOrderStats()

    expect(stats.revenueMinorUnits).toBe(90_000)
    expect(stats.avgValueMinorUnits).toBe(30_000)
  })

  it("takes a partial refund off the revenue and averages over the same orders", async () => {
    sqlite.exec(`update payment set refunded_amount = 6000, status = 'succeeded' where id = 'pay-refunded'`)
    const stats = await getAdminOrderStats()

    expect(stats.revenueMinorUnits).toBe(84_000)
    expect(stats.avgValueMinorUnits).toBe(28_000)
  })

  it("leaves a fully refunded order out of the revenue and the average", async () => {
    sqlite.exec(`update "order" set status = 'refunded' where id = 'o-delivered'`)
    const stats = await getAdminOrderStats()

    expect(stats.revenueMinorUnits).toBe(50_000)
    expect(stats.avgValueMinorUnits).toBe(25_000)
  })

  it("reports the currency the sales were taken in", async () => {
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

  it("reads the InPost shipment an order holds with the order number its label is named after", async () => {
    sqlite.exec(`update "order" set inpost_shipment_id = '49' where id = 'o-shipped'`)

    expect(await getOrderInpostShipment("o-shipped")).toStrictEqual({ inpostShipmentId: "49", orderNumber: "MRT-2024-00003" })
    expect(await getOrderInpostShipment("o-pending")).toStrictEqual({ inpostShipmentId: null, orderNumber: "MRT-2024-00001" })
    expect(await getOrderInpostShipment("o-missing")).toBeUndefined()
  })

  it("finds the order an InPost shipment belongs to, and none for a shipment no order holds", async () => {
    sqlite.exec(`update "order" set inpost_shipment_id = '49' where id = 'o-shipped'`)

    expect(await getOrderByInpostShipmentId("49")).toStrictEqual({ id: "o-shipped" })
    expect(await getOrderByInpostShipmentId("50")).toBeUndefined()
  })

  it("counts what a customer paid for their processing and completed orders, sent or not, and leaves out the unpaid pending one", async () => {
    expect(await getAdminOrderCustomerStats("u-anna")).toStrictEqual({ orderCount: 1, totalSpent: 20_000 })
  })

  it("takes a partial refund off what the customer spent and leaves out a refunded order", async () => {
    sqlite.exec(`
      update payment set refunded_amount = 5000 where id = 'pay-paid';
      update "order" set user_id = 'u-anna', status = 'refunded' where id = 'o-delivered';
    `)

    expect(await getAdminOrderCustomerStats("u-anna")).toStrictEqual({ orderCount: 1, totalSpent: 15_000 })
  })

  it("reports an empty history for a customer with no orders", async () => {
    expect(await getAdminOrderCustomerStats("u-nobody")).toStrictEqual({ orderCount: 0, totalSpent: 0 })
  })

  it("resolves the Checkout Session an admin refund would target", async () => {
    expect(await getAdminOrderRefundTarget("o-unfulfilled")).toStrictEqual({
      fulfillmentStatus: "not_fulfilled",
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
      fulfillmentStatus: "cancelled",
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
    drop table if exists user_email_history;

    create table user (id text primary key, name text not null, email text not null default '', phone text);
    create table user_email_history (id integer primary key, user_id text not null, email text not null, added_at integer not null, replaced_at integer);
    create table payment (
      id text primary key, amount integer not null, checkout_id text not null, currency text not null default 'PLN', lines text not null default '[]',
      provider text not null, refunded_amount integer not null default 0, refunded_at integer, reserved_lines text not null default '[]',
      status text not null default 'pending', transaction_id text, created_at integer not null, updated_at integer not null
    );
    create table courier (id text primary key, internal_code text not null, name text not null);
    create table delivery_method (
      id text primary key, api_service_code text not null, courier_id text not null, description text,
      is_active integer not null default 1, name text not null, names text not null default '{"pl-PL":"","en-US":""}',
      price integer not null, rank integer not null default 0, archived_at integer, type text not null,
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
      currency_code text not null default 'PLN', customer_note text, delivered_at integer, delivered_email_at integer, delivery_method_id text,
      discount_id text, discount_total integer not null default 0, email text not null,
      fulfillment_started_at integer, fulfillment_status text not null default 'not_fulfilled', in_progress_email_at integer,
      inpost_shipment_id text, inpost_shipment_status text,
      locker_id text, locker_point text, locker_unconfirmed integer not null default 0, metadata text, order_number text not null,
      payment_id text, restocked_at integer, shipped_at integer, shipped_email_at integer, shipping_total integer not null default 0, status text not null default 'pending',
      subtotal integer not null default 0, tax_basis_points integer not null default 2300, tax_total integer not null default 0,
      total integer not null default 0, tracking_email_number text, tracking_number text, tracking_url text, user_id text,
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
      id text primary key, billing_address_id text, billing_company_name text, billing_nip text, cart_id text, client_address text,
      customer_note text, delivery_method_id text, discount_id text, email text, locker_id text, locker_point text, locker_unconfirmed integer not null default 0, shipping_address_id text,
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
      id text primary key, action text not null, actor_name text not null, detail text, metadata text, resource_id text,
      severity text not null, created_at integer not null
    );

    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, names, price, type, created_at, updated_at) values
      ('dm-locker', 'inpost_locker', 'courier-inpost', 'Paczkomat 24/7', '{"pl-PL":"Paczkomat 24/7","en-US":"Parcel locker 24/7"}', 1500, 'locker', ${JANUARY}, ${JANUARY});
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

    insert into audit_log (id, action, actor_name, detail, metadata, resource_id, severity, created_at) values
      ('audit-placed', '${AUDIT_LOG_ACTION.ORDER_PLACED}', 'System', null, null, 'o-placed', 'success', ${JANUARY}),
      ('audit-shipped', '${AUDIT_LOG_ACTION.ORDER_SHIPPED}', 'Admin', 'TRK-9', null, 'o-placed', 'success', ${JUNE}),
      ('audit-email', '${AUDIT_LOG_ACTION.EMAIL_FAILED}', 'System', 'Order shipped — timeout', '${SHIPPED_EMAIL_DELIVERY}', 'o-placed', 'error', ${JUNE + 1}),
      ('audit-product', '${AUDIT_LOG_ACTION.PRODUCT_UPDATED}', 'Admin', null, null, 'o-placed', 'info', ${JUNE}),
      ('audit-other', '${AUDIT_LOG_ACTION.ORDER_PLACED}', 'System', null, null, 'o-other', 'success', ${JUNE});
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
        action: AUDIT_LOG_ACTION.EMAIL_FAILED,
        actorName: "System",
        createdAt: new Date(JUNE + 1),
        detail: "Order shipped — timeout",
        id: "audit-email",
        metadata: SHIPPED_EMAIL_DELIVERY,
        severity: "error",
      },
      {
        action: AUDIT_LOG_ACTION.ORDER_SHIPPED,
        actorName: "Admin",
        createdAt: new Date(JUNE),
        detail: "TRK-9",
        id: "audit-shipped",
        metadata: null,
        severity: "success",
      },
      {
        action: AUDIT_LOG_ACTION.ORDER_PLACED,
        actorName: "System",
        createdAt: new Date(JANUARY),
        detail: null,
        id: "audit-placed",
        metadata: null,
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
    expect(found?.deliveryMethod?.courier).toStrictEqual({ internalCode: "inpost", name: "InPost" })
  })

  it("matches the transaction against each order's own payment", async () => {
    const found = await getOrderByTransactionId("cs_other")

    expect(found?.id).toBe("o-other")
    expect(found?.deliveryMethod).toBeNull()
  })

  it("finds nothing for a Checkout Session no order was paid with", async () => {
    expect(await getOrderByTransactionId("cs_unknown")).toBeUndefined()
  })

  it("reads only the recipient, the account and the totals the confirmation email prints", async () => {
    expect(await getOrderTotalsForEmail("o-placed")).toStrictEqual({
      discountTotal: 1000,
      email: "anna@example.com",
      orderNumber: "MRT-2024-00001",
      recipient: "anna@example.com",
      shippingTotal: 1500,
      subtotal: 12_400,
      taxBasisPoints: 2300,
      taxTotal: 2412,
      total: 12_900,
      userId: null,
    })
  })

  it("reads no totals for an order that does not exist", async () => {
    expect(await getOrderTotalsForEmail("o-missing")).toBeUndefined()
  })
})

describe("a full admin page of orders", () => {
  const ids = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `bulk-${String(index).padStart(3, "0")}`)

  beforeEach(() => {
    const insertOrder = sqlite.prepare(`insert into "order" (id, email, created_at, updated_at) values (?, 'bulk@example.com', ?, ?)`)
    const insertLine = sqlite.prepare("insert into order_item (id, order_id, quantity, created_at, updated_at) values (?, ?, ?, ?, ?)")

    for (const [index, id] of ids.entries()) {
      insertOrder.run(id, JUNE + index + 1, JUNE + index + 1)
      insertLine.run(`line-${id}`, id, index + 1, JUNE, JUNE)
    }
  })

  it("lists every order of the page and of the export newest first", async () => {
    const result = await getAdminOrdersPage({ limit: LIST_PAGE_SIZE_MAX, offset: 0, timeZone: "Europe/Warsaw" })
    const exported = await getAdminOrdersExport({ search: "bulk@example.com", timeZone: "Europe/Warsaw" })

    expect(result.total).toBe(LIST_PAGE_SIZE_MAX + 5)
    expect(result.rows.map(({ id }) => id)).toStrictEqual(ids.toReversed())
    expect(exported.map(({ id }) => id)).toStrictEqual(ids.toReversed())
  })

  it("counts the items of every order on the page", async () => {
    const rows = await getAdminOrderItemCountRows(ids)

    expect(new Map(rows.map((row) => [row.orderId, row.itemCount]))).toStrictEqual(new Map(ids.map((id, index) => [id, index + 1])))
  })
})

describe("getAdminOrdersPage date filters on the Polish clock", () => {
  it("files an order by the day in Poland, so half past midnight there is not the UTC day before", async () => {
    const insertOrder = sqlite.prepare(`insert into "order" (id, email, created_at, updated_at) values (?, 'night@example.com', ?, ?)`)
    insertOrder.run("o-late-14", Date.parse("2026-10-14T21:59:00.000Z"), JUNE)
    insertOrder.run("o-early-15", Date.parse("2026-10-14T22:30:00.000Z"), JUNE)

    expect(await placedOn("2026-10-14")).toStrictEqual(["o-late-14"])
    expect(await placedOn("2026-10-15")).toStrictEqual(["o-early-15"])
  })
})
