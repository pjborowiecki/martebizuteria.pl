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
  newCustomersQuery,
  orderAggregatesQuery,
  pageViewsQuery,
  recentOrdersQuery,
  salesTotalsQuery,
  topProductsQuery,
} from "~/src/modules/admin-dashboard/admin-dashboard.accessors"
import {
  ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT,
  ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { resolveAdminDashboardDateRange, resolveAdminDashboardMonths } from "~/src/modules/admin-dashboard/admin-dashboard.utils"

const JANUARY = Date.UTC(2024, 0, 10)

const FEBRUARY = Date.UTC(2024, 1, 10)

const MARCH = Date.UTC(2024, 2, 10)

const APRIL = Date.UTC(2024, 3, 10)

const WINDOW_START = new Date(Date.UTC(2024, 0, 1))

const WINDOW_END = new Date(Date.UTC(2024, 2, 1))

const placeCompletedOrder = (id: string, createdAt: string): void => {
  const createdAtMs = Date.parse(createdAt)
  sqlite
    .prepare(
      `insert into "order" (id, email, status, total, created_at, updated_at) values (?, 'guest@example.com', 'completed', 1000, ?, ?)`,
    )
    .run(id, createdAtMs, createdAtMs)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists order_item;
    drop table if exists payment;
    drop table if exists user;
    drop table if exists audit_log;
    drop table if exists product;
    drop table if exists product_category;
    drop table if exists category_on_product;

    create table user (id text primary key, name text not null, email text not null, created_at integer not null, updated_at integer not null);
    create table payment (
      id text primary key, refunded_amount integer not null default 0, status text, created_at integer not null, updated_at integer not null
    );
    create table "order" (
      id text primary key, payment_id text, user_id text, email text not null,
      currency_code text not null default 'PLN', status text not null default 'pending',
      fulfillment_status text not null default 'not_fulfilled', metadata text, order_number text, total integer not null default 0,
      in_progress_email_at integer, shipped_email_at integer, delivered_email_at integer,
      created_at integer not null, updated_at integer not null
    );
    create table order_item (
      id text primary key, order_id text, product_id text, quantity integer not null default 1,
      thumbnail text, title text not null, total integer not null default 0,
      created_at integer not null, updated_at integer not null
    );
    create table audit_log (id text primary key, action text not null, created_at integer not null);
    create table product (id text primary key, titles text not null, created_at integer not null, updated_at integer not null);
    create table product_category (id text primary key, handle text not null, titles text not null, created_at integer not null, updated_at integer not null);
    create table category_on_product (product_id text not null, category_id text not null, is_primary integer not null default 0);

    insert into user (id, name, email, created_at, updated_at) values
      ('u-anna', 'Anna Kowalska', 'anna@example.com', ${JANUARY}, ${JANUARY}),
      ('u-borys', 'Borys Nowak', 'borys@example.com', ${FEBRUARY}, ${FEBRUARY}),
      ('u-celina', 'Celina Wolska', 'celina@example.com', ${MARCH}, ${MARCH});

    insert into payment (id, refunded_amount, status, created_at, updated_at) values
      ('pay-1', 0, 'succeeded', ${JANUARY}, ${JANUARY}),
      ('pay-partly-refunded', 5000, 'succeeded', ${JANUARY}, ${JANUARY}),
      ('pay-refunded', 8000, 'refunded', ${JANUARY}, ${JANUARY});

    insert into "order" (id, payment_id, user_id, email, status, fulfillment_status, total, created_at, updated_at) values
      ('o-jan-completed', 'pay-1', 'u-anna', 'anna@example.com', 'completed', 'delivered', 10000, ${JANUARY}, ${JANUARY}),
      ('o-jan-processing', 'pay-partly-refunded', 'u-anna', 'anna@example.com', 'processing', 'not_fulfilled', 20000, ${JANUARY}, ${JANUARY}),
      ('o-jan-refunded', 'pay-refunded', null, 'guest@example.com', 'refunded', 'not_fulfilled', 8000, ${JANUARY}, ${JANUARY}),
      ('o-feb-completed', null, 'u-borys', 'borys@example.com', 'completed', 'shipped', 30000, ${FEBRUARY}, ${FEBRUARY}),
      ('o-feb-pending', null, null, 'guest@example.com', 'pending', 'not_fulfilled', 5000, ${FEBRUARY}, ${FEBRUARY}),
      ('o-feb-cancelled', null, null, 'guest@example.com', 'cancelled', 'cancelled', 90000, ${FEBRUARY}, ${FEBRUARY}),
      ('o-mar-completed', null, null, 'guest@example.com', 'completed', 'delivered', 70000, ${MARCH}, ${MARCH}),
      ('o-apr-completed', null, null, 'guest@example.com', 'completed', 'delivered', 1000, ${APRIL}, ${APRIL});

    update "order" set order_number = 'MRT-' || id;

    insert into audit_log (id, action, created_at) values
      ('a-1', 'customer.page_viewed', ${JANUARY}),
      ('a-2', 'customer.page_viewed', ${FEBRUARY}),
      ('a-3', 'auth.login', ${FEBRUARY}),
      ('a-4', 'customer.page_viewed', ${MARCH});

    insert into product (id, titles, created_at, updated_at) values
      ('p-ring', '{"en-US":"Silver ring","pl-PL":"Srebrny pierscionek"}', ${JANUARY}, ${JANUARY}),
      ('p-cuff', '{"en-US":"Gold cuff","pl-PL":"Zlota bransoleta"}', ${JANUARY}, ${JANUARY});

    insert into product_category (id, handle, titles, created_at, updated_at) values
      ('c-rings', 'rings', '{"en-US":"Rings","pl-PL":"Pierscionki"}', ${JANUARY}, ${JANUARY});

    insert into category_on_product (product_id, category_id, is_primary) values ('p-ring', 'c-rings', 1);

    insert into order_item (id, order_id, product_id, quantity, thumbnail, title, total, created_at, updated_at) values
      ('oi-1', 'o-jan-completed', 'p-ring', 2, 'ring.avif', 'Silver ring', 10000, ${JANUARY}, ${JANUARY}),
      ('oi-2', 'o-feb-completed', 'p-ring', 3, 'ring.avif', 'Silver ring', 30000, ${FEBRUARY}, ${FEBRUARY}),
      ('oi-3', 'o-mar-completed', 'p-cuff', 1, null, 'Gold cuff', 70000, ${MARCH}, ${MARCH}),
      ('oi-4', 'o-feb-cancelled', 'p-cuff', 9, null, 'Gold cuff', 90000, ${FEBRUARY}, ${FEBRUARY}),
      ('oi-5', 'o-jan-processing', 'p-cuff', 1, null, 'Gold cuff', 20000, ${JANUARY}, ${JANUARY}),
      ('oi-6', 'o-jan-refunded', 'p-ring', 4, 'ring.avif', 'Silver ring', 8000, ${JANUARY}, ${JANUARY});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("salesTotalsQuery", () => {
  it("books a paid order that has not been sent yet at its full total", async () => {
    sqlite.exec(`
      delete from "order";
      insert into payment (id, status, created_at, updated_at) values ('pay-unsent', 'succeeded', ${MARCH}, ${MARCH});
      insert into "order" (id, payment_id, email, status, fulfillment_status, total, created_at, updated_at) values
        ('o-unsent', 'pay-unsent', 'guest@example.com', 'processing', 'not_fulfilled', 39899, ${MARCH}, ${MARCH});
    `)

    await expect(salesTotalsQuery(WINDOW_START)).resolves.toStrictEqual([{ averageOrderValue: 39_899, orders: 1, revenue: 39_899 }])
  })

  it("counts every processing and completed order, net of partial refunds, and leaves out unpaid pending, cancelled and refunded ones", async () => {
    const [totals] = await salesTotalsQuery(WINDOW_START)

    expect(totals?.orders).toBe(5)
    expect(totals?.revenue).toBe(126_000)
  })

  it("averages the same orders it counts, net of refunds, to whole minor units", async () => {
    const [totals] = await salesTotalsQuery(WINDOW_START)

    expect(totals?.averageOrderValue).toBe(25_200)
  })

  it("takes a partial refund off the order it was paid back on", async () => {
    sqlite.exec(`delete from "order" where id <> 'o-jan-processing'`)

    await expect(salesTotalsQuery(WINDOW_START)).resolves.toStrictEqual([{ averageOrderValue: 15_000, orders: 1, revenue: 15_000 }])
  })

  it("never lets a refund larger than the order total take revenue below zero", async () => {
    sqlite.exec(`
      delete from "order" where id <> 'o-jan-processing';
      update payment set refunded_amount = 25000 where id = 'pay-partly-refunded';
    `)

    await expect(salesTotalsQuery(WINDOW_START)).resolves.toStrictEqual([{ averageOrderValue: 0, orders: 1, revenue: 0 }])
  })

  it("stops before the exclusive window end", async () => {
    await expect(salesTotalsQuery(WINDOW_START, WINDOW_END)).resolves.toStrictEqual([
      { averageOrderValue: 18_333, orders: 3, revenue: 55_000 },
    ])
  })

  it("reports zeroes rather than null or a division by no orders for an empty window", async () => {
    const afterEveryOrder = new Date(Date.UTC(2030, 0, 1))

    await expect(salesTotalsQuery(afterEveryOrder)).resolves.toStrictEqual([{ averageOrderValue: 0, orders: 0, revenue: 0 }])
  })
})

describe("newCustomersQuery", () => {
  it("counts every account created since the window start", async () => {
    const rows = await newCustomersQuery(WINDOW_START)

    expect(rows[0]?.count).toBe(3)
  })

  it("counts only the accounts created before the window end", async () => {
    const rows = await newCustomersQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.count).toBe(2)
  })
})

describe("pageViewsQuery", () => {
  it("counts page view audit rows and ignores other actions", async () => {
    const rows = await pageViewsQuery(WINDOW_START)

    expect(rows[0]?.count).toBe(3)
  })

  it("counts only the page views inside the window", async () => {
    const rows = await pageViewsQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.count).toBe(2)
  })
})

describe("orderAggregatesQuery", () => {
  it("counts the sales and sums their revenue net of partial refunds per month", async () => {
    const rows = await orderAggregatesQuery(resolveAdminDashboardMonths(new Date(APRIL), 4))

    expect(rows).toStrictEqual([
      { orders: 2, periodKey: "2024-01", revenue: 25_000 },
      { orders: 1, periodKey: "2024-02", revenue: 30_000 },
      { orders: 1, periodKey: "2024-03", revenue: 70_000 },
      { orders: 1, periodKey: "2024-04", revenue: 1000 },
    ])
  })

  it("leaves out the orders placed before the window and from midnight in Poland after its last day", async () => {
    const rows = await orderAggregatesQuery(resolveAdminDashboardDateRange("2024-02-10", "2024-03-09"))

    expect(rows).toStrictEqual([{ orders: 1, periodKey: "2024-02-10", revenue: 30_000 }])
  })

  it("aggregates nothing outside the window", async () => {
    await expect(orderAggregatesQuery(resolveAdminDashboardDateRange("2030-01-01", "2030-01-31"))).resolves.toStrictEqual([])
  })

  it("puts an order placed in the first hour of 1 January in Poland on New Year's Day and in January", async () => {
    placeCompletedOrder("o-new-year", "2024-12-31T23:30:00.000Z")
    const midJanuary = new Date("2025-01-15T12:00:00.000Z")

    await expect(orderAggregatesQuery(resolveAdminDashboardDateRange("2024-12-31", "2025-01-01"))).resolves.toStrictEqual([
      { orders: 1, periodKey: "2025-01-01", revenue: 1000 },
    ])
    await expect(orderAggregatesQuery(resolveAdminDashboardMonths(midJanuary, 2))).resolves.toStrictEqual([
      { orders: 1, periodKey: "2025-01", revenue: 1000 },
    ])
  })

  it("splits the days at midnight in Poland around the night clocks go forward", async () => {
    placeCompletedOrder("o-saturday-late", "2024-03-30T22:30:00.000Z")
    placeCompletedOrder("o-sunday-early", "2024-03-30T23:30:00.000Z")
    placeCompletedOrder("o-sunday-late", "2024-03-31T21:30:00.000Z")
    placeCompletedOrder("o-monday-early", "2024-03-31T22:30:00.000Z")

    await expect(orderAggregatesQuery(resolveAdminDashboardDateRange("2024-03-30", "2024-04-01"))).resolves.toStrictEqual([
      { orders: 1, periodKey: "2024-03-30", revenue: 1000 },
      { orders: 2, periodKey: "2024-03-31", revenue: 2000 },
      { orders: 1, periodKey: "2024-04-01", revenue: 1000 },
    ])
  })

  it("splits the days at midnight in Poland around the night clocks go back", async () => {
    placeCompletedOrder("o-saturday-late", "2024-10-26T21:30:00.000Z")
    placeCompletedOrder("o-sunday-early", "2024-10-26T22:30:00.000Z")
    placeCompletedOrder("o-sunday-late", "2024-10-27T22:30:00.000Z")
    placeCompletedOrder("o-monday-early", "2024-10-27T23:30:00.000Z")

    await expect(orderAggregatesQuery(resolveAdminDashboardDateRange("2024-10-26", "2024-10-28"))).resolves.toStrictEqual([
      { orders: 1, periodKey: "2024-10-26", revenue: 1000 },
      { orders: 2, periodKey: "2024-10-27", revenue: 2000 },
      { orders: 1, periodKey: "2024-10-28", revenue: 1000 },
    ])
  })
})

describe("recentOrdersQuery", () => {
  it("lists the newest orders first", async () => {
    const rows = await recentOrdersQuery()

    expect(rows.map((row) => row.id)).toStrictEqual([
      "o-apr-completed",
      "o-mar-completed",
      "o-feb-completed",
      "o-feb-pending",
      "o-feb-cancelled",
    ])
  })

  it("never returns more rows than the dashboard shows", async () => {
    const rows = await recentOrdersQuery()

    expect(rows).toHaveLength(ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT)
  })

  it("joins the customer name and the payment status when they exist", async () => {
    const rows = await recentOrdersQuery()

    expect(rows.find((row) => row.id === "o-jan-completed")).toBeUndefined()
    expect(rows.find((row) => row.id === "o-feb-completed")?.customerName).toBe("Borys Nowak")
  })

  it("carries the order number the shop shows instead of the database id", async () => {
    const rows = await recentOrdersQuery()

    expect(rows[0]).toMatchObject({ id: "o-apr-completed", orderNumber: "MRT-o-apr-completed" })
  })

  it("leaves the guest name and the missing payment empty", async () => {
    const rows = await recentOrdersQuery()
    const guest = rows.find((row) => row.id === "o-mar-completed")

    expect(guest?.customerName).toBeNull()
    expect(guest?.paymentStatus).toBeNull()
    expect(guest?.email).toBe("guest@example.com")
  })
})

describe("topProductsQuery", () => {
  it("ranks products by the quantity sold in paid orders, cancelled and refunded ones aside", async () => {
    const rows = await topProductsQuery()

    expect(rows.map((row) => [row.productId, row.sold])).toStrictEqual([
      ["p-ring", 5],
      ["p-cuff", 2],
    ])
  })

  it("sums the line revenue of the items in orders still being fulfilled and ignores the cancelled ones", async () => {
    const rows = await topProductsQuery()

    expect(rows.find((row) => row.productId === "p-cuff")?.revenue).toBe(90_000)
  })

  it("carries the live product titles and the primary category titles under distinct result columns", async () => {
    const rows = await topProductsQuery()

    expect(rows[0]?.productTitles).toBe('{"en-US":"Silver ring","pl-PL":"Srebrny pierscionek"}')
    expect(rows[0]?.categoryTitles).toBe('{"en-US":"Rings","pl-PL":"Pierscionki"}')
  })

  it("leaves the category titles empty for a product with no primary category", async () => {
    const rows = await topProductsQuery()

    expect(rows.find((row) => row.productId === "p-cuff")?.categoryTitles).toBeNull()
  })

  it("keeps the ranking inside the dashboard limit", async () => {
    const rows = await topProductsQuery()

    expect(rows.length).toBeLessThanOrEqual(ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT)
  })
})
