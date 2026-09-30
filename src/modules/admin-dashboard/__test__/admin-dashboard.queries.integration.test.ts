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
  averageCompletedOrderValueQuery,
  countableOrdersQuery,
  completedRevenueSumQuery,
  dailyOrderAggregatesQuery,
  monthlyOrderAggregatesQuery,
  newCustomersQuery,
  pageViewsQuery,
  recentOrdersQuery,
  topProductsQuery,
} from "~/src/modules/admin-dashboard/admin-dashboard.accessors"
import {
  ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT,
  ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"

const JANUARY = Date.UTC(2024, 0, 10)

const FEBRUARY = Date.UTC(2024, 1, 10)

const MARCH = Date.UTC(2024, 2, 10)

const APRIL = Date.UTC(2024, 3, 10)

const WINDOW_START = new Date(Date.UTC(2024, 0, 1))

const WINDOW_END = new Date(Date.UTC(2024, 2, 1))

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
    create table payment (id text primary key, status text, created_at integer not null, updated_at integer not null);
    create table "order" (
      id text primary key, payment_id text, user_id text, email text not null,
      currency_code text not null default 'PLN', status text not null default 'pending',
      fulfillment_status text not null default 'not_fulfilled', total integer not null default 0,
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

    insert into payment (id, status, created_at, updated_at) values ('pay-1', 'succeeded', ${JANUARY}, ${JANUARY});

    insert into "order" (id, payment_id, user_id, email, status, fulfillment_status, total, created_at, updated_at) values
      ('o-jan-completed', 'pay-1', 'u-anna', 'anna@example.com', 'completed', 'delivered', 10000, ${JANUARY}, ${JANUARY}),
      ('o-feb-completed', null, 'u-borys', 'borys@example.com', 'completed', 'shipped', 30000, ${FEBRUARY}, ${FEBRUARY}),
      ('o-feb-pending', null, null, 'guest@example.com', 'pending', 'not_fulfilled', 5000, ${FEBRUARY}, ${FEBRUARY}),
      ('o-feb-cancelled', null, null, 'guest@example.com', 'cancelled', 'cancelled', 90000, ${FEBRUARY}, ${FEBRUARY}),
      ('o-mar-completed', null, null, 'guest@example.com', 'completed', 'delivered', 70000, ${MARCH}, ${MARCH}),
      ('o-apr-completed', null, null, 'guest@example.com', 'completed', 'delivered', 1000, ${APRIL}, ${APRIL});

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
      ('oi-4', 'o-feb-cancelled', 'p-cuff', 9, null, 'Gold cuff', 90000, ${FEBRUARY}, ${FEBRUARY});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("completedRevenueSumQuery", () => {
  it("sums only completed orders from the window start onwards", async () => {
    const rows = await completedRevenueSumQuery(WINDOW_START)

    expect(rows[0]?.total).toBe(111_000)
  })

  it("stops before the exclusive window end", async () => {
    const rows = await completedRevenueSumQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.total).toBe(40_000)
  })

  it("coalesces an empty window to zero rather than null", async () => {
    const rows = await completedRevenueSumQuery(new Date(Date.UTC(2030, 0, 1)))

    expect(rows[0]?.total).toBe(0)
  })
})

describe("countableOrdersQuery", () => {
  it("counts completed, processing and pending orders but never cancelled ones", async () => {
    const rows = await countableOrdersQuery(WINDOW_START)

    expect(rows[0]?.count).toBe(5)
  })

  it("counts only the orders before the window end", async () => {
    const rows = await countableOrdersQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.count).toBe(3)
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

describe("averageCompletedOrderValueQuery", () => {
  it("rounds the average completed order to whole minor units", async () => {
    const rows = await averageCompletedOrderValueQuery(WINDOW_START)

    expect(rows[0]?.average).toBe(27_750)
  })

  it("averages only the window it was asked about", async () => {
    const rows = await averageCompletedOrderValueQuery(WINDOW_START, WINDOW_END)

    expect(rows[0]?.average).toBe(20_000)
  })

  it("reports zero instead of dividing by no orders", async () => {
    const rows = await averageCompletedOrderValueQuery(new Date(Date.UTC(2030, 0, 1)))

    expect(rows[0]?.average).toBe(0)
  })
})

describe("dailyOrderAggregatesQuery", () => {
  it("aggregates every countable order from the window start", async () => {
    const rows = await dailyOrderAggregatesQuery(WINDOW_START)

    expect(rows.reduce((sum, row) => sum + row.orders, 0)).toBe(5)
  })

  it("counts only completed orders towards the revenue it aggregates", async () => {
    const rows = await dailyOrderAggregatesQuery(WINDOW_START)

    expect(rows.reduce((sum, row) => sum + row.revenue, 0)).toBe(111_000)
  })

  it("treats the window end as inclusive", async () => {
    const rows = await dailyOrderAggregatesQuery(WINDOW_START, new Date(MARCH))

    expect(rows.reduce((sum, row) => sum + row.orders, 0)).toBe(4)
  })

  it("aggregates nothing outside the window", async () => {
    const rows = await dailyOrderAggregatesQuery(new Date(Date.UTC(2030, 0, 1)))

    expect(rows).toStrictEqual([])
  })
})

describe("monthlyOrderAggregatesQuery", () => {
  it("aggregates the countable orders and the completed revenue", async () => {
    const rows = await monthlyOrderAggregatesQuery(WINDOW_START)

    expect(rows.reduce((sum, row) => sum + row.orders, 0)).toBe(5)
    expect(rows.reduce((sum, row) => sum + row.revenue, 0)).toBe(111_000)
  })

  it("skips the orders placed before the window start", async () => {
    const rows = await monthlyOrderAggregatesQuery(new Date(Date.UTC(2024, 2, 1)))

    expect(rows.reduce((sum, row) => sum + row.orders, 0)).toBe(2)
    expect(rows.reduce((sum, row) => sum + row.revenue, 0)).toBe(71_000)
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

  it("leaves the guest name and the missing payment empty", async () => {
    const rows = await recentOrdersQuery()
    const guest = rows.find((row) => row.id === "o-mar-completed")

    expect(guest?.customerName).toBeNull()
    expect(guest?.paymentStatus).toBeNull()
    expect(guest?.email).toBe("guest@example.com")
  })
})

describe("topProductsQuery", () => {
  it("ranks products by the quantity sold in completed orders", async () => {
    const rows = await topProductsQuery()

    expect(rows.map((row) => [row.productId, row.sold])).toStrictEqual([
      ["p-ring", 5],
      ["p-cuff", 1],
    ])
  })

  it("ignores items that belong to an order that never completed", async () => {
    const rows = await topProductsQuery()

    expect(rows.find((row) => row.productId === "p-cuff")?.revenue).toBe(70_000)
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
