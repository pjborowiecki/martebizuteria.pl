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

import { DATE_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import {
  getAdminOrderCustomerStats,
  getAdminOrderRefundTarget,
  getAdminOrderStats,
  getAdminOrdersExport,
  getAdminOrdersPage,
  getOrderByCheckoutId,
  getOrderForShippedEmail,
  getOrderMetadata,
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
      metadata text, tracking_number text, tracking_url text, created_at integer not null, updated_at integer not null
    );
    create table order_item (
      id text primary key, order_id text, variant_id text, quantity integer not null default 1,
      created_at integer not null, updated_at integer not null
    );

    insert into user (id, name, email, created_at, updated_at) values ('u-anna', 'Anna Kowalska', 'anna@example.com', ${JANUARY}, ${JANUARY});

    insert into payment (id, status, transaction_id, created_at, updated_at) values
      ('pay-paid', 'succeeded', 'pi_paid', ${JANUARY}, ${JANUARY}),
      ('pay-refunded', 'refunded', 'pi_refunded', ${JUNE}, ${JUNE}),
      ('pay-pending', 'pending', null, ${JUNE}, ${JUNE});

    insert into "order" (id, checkout_id, payment_id, user_id, email, status, fulfillment_status, total, metadata, tracking_number, created_at, updated_at) values
      ('o-pending', 'chk-1', 'pay-pending', 'u-anna', 'anna@example.com', 'pending', 'not_fulfilled', 10000, '{"locale":"en-US"}', null, ${JANUARY}, ${JANUARY}),
      ('o-unfulfilled', 'chk-2', 'pay-paid', 'u-anna', 'anna@example.com', 'processing', 'not_fulfilled', 20000, null, null, ${JUNE}, ${JUNE}),
      ('o-shipped', 'chk-3', 'pay-paid', null, 'guest@example.com', 'processing', 'shipped', 30000, null, 'TRK-9', ${JUNE}, ${JUNE}),
      ('o-delivered', 'chk-4', 'pay-refunded', null, 'guest@example.com', 'completed', 'delivered', 40000, null, null, ${JUNE}, ${JUNE}),
      ('o-cancelled', 'chk-5', null, null, 'guest@example.com', 'cancelled', 'cancelled', 50000, null, null, ${JUNE}, ${JUNE});

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

  it("resolves the payment intent an admin refund would target", async () => {
    expect(await getAdminOrderRefundTarget("o-unfulfilled")).toStrictEqual({
      paymentStatus: "succeeded",
      status: "processing",
      transactionId: "pi_paid",
    })
  })

  it("reports an unpayable order rather than inventing a payment intent", async () => {
    expect(await getAdminOrderRefundTarget("o-cancelled")).toStrictEqual({
      paymentStatus: null,
      status: "cancelled",
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
