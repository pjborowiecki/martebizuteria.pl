import { QueryClient } from "@tanstack/react-query"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler:
        (handler: (options: { data: unknown }) => unknown) =>
        (options: { data: unknown }): unknown =>
          handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import {
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_QUERY_KEYS,
  ADMIN_DASHBOARD_QUERY_STALE_MS,
  ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT,
  ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import { getDashboardSnapshot, getDashboardSnapshotQuery } from "~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot"

const NOW = new Date("2026-06-15T12:00:00.000Z")

const DAY_MS = 86_400_000

const ago = (days: number): number => NOW.getTime() - days * DAY_MS

const DDL = `
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
  create table audit_log (
    id text primary key, action text not null, actor_id text, actor_name text not null, actor_role text not null,
    category text not null, detail text, ip text, metadata text, resource_id text, severity text not null,
    target text not null, created_at integer not null
  );
  create table "order" (
    id text primary key, checkout_id text, currency_code text not null default 'PLN', email text not null,
    fulfillment_status text not null default 'not_fulfilled', payment_id text, status text not null default 'pending',
    total integer not null default 0, user_id text, created_at integer not null, updated_at integer not null
  );
  create table order_item (
    id text primary key, order_id text not null, product_id text, quantity integer not null, subtotal integer not null,
    thumbnail text, title text not null, total integer not null, unit_price integer not null, variant_id text,
    variant_title text, metadata text, created_at integer not null, updated_at integer not null
  );
  create table product (
    id text primary key, handle text not null, titles text not null, subtitles text, descriptions text, tags text,
    thumbnail text, metadata text, primary_category_id text, rank integer not null default 0,
    status text not null default 'draft', created_at integer not null, updated_at integer not null
  );
  create table product_category (
    id text primary key, handle text not null, titles text not null, subtitles text, descriptions text,
    short_descriptions text, image text, metadata text, parent_id text, rank integer not null default 0,
    status text not null default 'draft', created_at integer not null, updated_at integer not null
  );
  create table category_on_product (
    category_id text not null, product_id text not null, is_primary integer not null default 0,
    primary key (product_id, category_id)
  );
`

const seed = (): void => {
  sqlite.exec(`
    insert into user (id, name, email, created_at, updated_at) values
      ('u-anna', 'Anna Kowalska', 'anna@example.com', ${ago(3)}, ${ago(3)}),
      ('u-piotr', 'Piotr Nowak', 'piotr@example.com', ${ago(10)}, ${ago(10)}),
      ('u-old', 'Old Customer', 'old@example.com', ${ago(45)}, ${ago(45)});

    insert into payment (id, status, created_at, updated_at) values
      ('pay-paid', 'succeeded', ${ago(3)}, ${ago(3)}),
      ('pay-refunded', 'refunded', ${ago(4)}, ${ago(4)});

    insert into audit_log (id, action, actor_name, actor_role, category, severity, target, created_at) values
      ('al-1', 'customer.page_viewed', 'Anna', 'customer', 'customer', 'info', '/products', ${ago(2)}),
      ('al-2', 'customer.page_viewed', 'Anna', 'customer', 'customer', 'info', '/products', ${ago(5)}),
      ('al-3', 'customer.page_viewed', 'Piotr', 'customer', 'customer', 'info', '/cart', ${ago(40)}),
      ('al-4', 'order.shipped', 'Admin', 'admin', 'order', 'info', 'o-done', ${ago(2)});

    insert into "order" (id, currency_code, email, fulfillment_status, payment_id, status, total, user_id, created_at, updated_at) values
      ('o-done-1', 'PLN', 'anna@example.com', 'delivered', 'pay-paid', 'completed', 30000, 'u-anna', ${ago(2)}, ${ago(2)}),
      ('o-done-2', 'PLN', 'anna@example.com', 'shipped', 'pay-paid', 'completed', 10000, 'u-anna', ${ago(4)}, ${ago(4)}),
      ('o-pending', 'PLN', 'guest@example.com', 'not_fulfilled', null, 'pending', 5000, null, ${ago(1)}, ${ago(1)}),
      ('o-cancelled', 'PLN', 'guest@example.com', 'cancelled', null, 'cancelled', 9900, null, ${ago(1)}, ${ago(1)}),
      ('o-old-done', 'PLN', 'old@example.com', 'delivered', 'pay-refunded', 'completed', 8000, 'u-old', ${ago(40)}, ${ago(40)}),
      ('o-last-year', 'PLN', 'old@example.com', 'delivered', 'pay-paid', 'completed', 70000, 'u-old', ${Date.UTC(2025, 10, 1)}, ${Date.UTC(2025, 10, 1)});

    insert into product_category (id, handle, titles, created_at, updated_at) values
      ('cat-rings', 'rings', '{"en-US":"Rings","pl-PL":"Pierścionki"}', ${ago(90)}, ${ago(90)});

    insert into product (id, handle, titles, thumbnail, created_at, updated_at) values
      ('p-ring', 'silver-ring', '{"en-US":"Silver ring","pl-PL":"Srebrny pierścionek"}', 'ring.avif', ${ago(90)}, ${ago(90)}),
      ('p-chain', 'gold-chain', '{"en-US":"Gold chain","pl-PL":"Złoty łańcuszek"}', null, ${ago(90)}, ${ago(90)});

    insert into category_on_product (category_id, product_id, is_primary) values ('cat-rings', 'p-ring', 1);

    insert into order_item (id, order_id, product_id, quantity, subtotal, thumbnail, title, total, unit_price, created_at, updated_at) values
      ('oi-1', 'o-done-1', 'p-ring', 3, 20000, 'ring-thumb.avif', 'Silver ring (stored)', 20000, 6667, ${ago(2)}, ${ago(2)}),
      ('oi-2', 'o-done-2', 'p-ring', 1, 6000, null, 'Silver ring (stored)', 6000, 6000, ${ago(4)}, ${ago(4)}),
      ('oi-3', 'o-done-1', 'p-chain', 1, 10000, null, 'Gold chain (stored)', 10000, 10000, ${ago(2)}, ${ago(2)}),
      ('oi-4', 'o-pending', 'p-chain', 9, 90000, null, 'Gold chain (stored)', 90000, 10000, ${ago(1)}, ${ago(1)}),
      ('oi-orphan', 'o-done-2', null, 2, 4000, null, 'Deleted product', 4000, 2000, ${ago(4)}, ${ago(4)}),
      ('oi-gone', 'o-done-2', 'p-gone', 1, 1000, null, 'Vanished bracelet', 1000, 1000, ${ago(4)}, ${ago(4)});
  `)
}

const snapshot = (locale = "en-US"): Promise<AdminDashboard["snapshot"]> => getDashboardSnapshot({ data: { locale } })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  sqlite.exec(DDL)
  seed()
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(() => {
  sqlite.close()
})

describe("getDashboardSnapshot revenue and order KPIs", () => {
  it("sums only completed orders inside the trailing 30 day window", async () => {
    const result = await snapshot()

    expect(result.revenue.current).toBe(40_000)
  })

  it("compares against the 30 days before that window", async () => {
    const result = await snapshot()

    expect(result.revenue.previous).toBe(8000)
    expect(result.revenue.trendPercent).toBe(400)
  })

  it("counts pending, processing and completed orders but not cancelled ones", async () => {
    const result = await snapshot()

    expect(result.orders.current).toBe(3)
    expect(result.orders.previous).toBe(1)
  })

  it("averages the completed order value to whole minor units", async () => {
    const result = await snapshot()

    expect(result.averageOrderValue.current).toBe(20_000)
    expect(result.averageOrderValue.previous).toBe(8000)
  })

  it("reports a zero average when the window holds no completed orders", async () => {
    sqlite.exec(`delete from "order" where status = 'completed'`)
    const result = await snapshot()

    expect(result.averageOrderValue.current).toBe(0)
    expect(result.revenue.current).toBe(0)
    expect(result.revenue.trendPercent).toBe(0)
  })
})

describe("getDashboardSnapshot customers and page views", () => {
  it("counts accounts created inside each window", async () => {
    const result = await snapshot()

    expect(result.customers.current).toBe(2)
    expect(result.customers.previous).toBe(1)
  })

  it("treats growth from nothing as a full hundred percent", async () => {
    sqlite.exec(`delete from user where id = 'u-old'`)
    const result = await snapshot()

    expect(result.customers.previous).toBe(0)
    expect(result.customers.trendPercent).toBe(100)
  })

  it("counts only customer page-view audit entries", async () => {
    const result = await snapshot()

    expect(result.pageViews.current).toBe(2)
    expect(result.pageViews.previous).toBe(1)
  })
})

describe("getDashboardSnapshot year to date", () => {
  it("sums completed revenue since the first of January only", async () => {
    const result = await snapshot()

    expect(result.yearToDateRevenueMinorUnits).toBe(48_000)
  })

  it("falls back to zero when nothing completed this year", async () => {
    sqlite.exec(`delete from "order" where status = 'completed'`)
    const result = await snapshot()

    expect(result.yearToDateRevenueMinorUnits).toBe(0)
  })
})

describe("getDashboardSnapshot chart frames", () => {
  it("returns one point per day for the thirty day chart", async () => {
    const result = await snapshot()

    expect(result.chartPoints30d).toHaveLength(ADMIN_DASHBOARD_CHART_DAYS_30)
    expect(result.chartPoints30d.at(-1)?.dateKey).toBe("2026-06-15")
  })

  it("derives the seven day chart from the tail of the thirty day chart", async () => {
    const result = await snapshot()

    expect(result.chartPoints7d).toStrictEqual(result.chartPoints30d.slice(-ADMIN_DASHBOARD_CHART_DAYS_7))
  })

  it("returns one point per month for the twelve month chart", async () => {
    const result = await snapshot()

    expect(result.chartPoints1y).toHaveLength(ADMIN_DASHBOARD_CHART_MONTHS_1Y)
    expect(result.chartPoints1y.at(-1)?.dateKey).toBe("2026-06")
    expect(result.chartPoints1y[0]?.dateKey).toBe("2025-07")
  })

  it("labels the daily points in the requested locale", async () => {
    const english = await snapshot()
    const polish = await snapshot("pl-PL")

    expect(english.chartPoints30d.at(-1)?.label).toBe("Jun 15")
    expect(polish.chartPoints30d.at(-1)?.label).toBe("15 cze")
  })

  it("labels the monthly points in the requested locale", async () => {
    const result = await snapshot()

    expect(result.chartPoints1y.at(-1)?.label).toBe("Jun 2026")
  })

  it("names one weekday point per day of the trailing week", async () => {
    const result = await snapshot()

    expect(result.weeklyOrders).toHaveLength(ADMIN_DASHBOARD_CHART_DAYS_7)
    expect(result.weeklyOrders.at(-1)?.dayLabel).toBe("Mon")
    expect(result.weeklyOrders.map((point) => point.dateKey)).toStrictEqual(result.chartPoints7d.map((point) => point.dateKey))
  })
})

describe("getDashboardSnapshot recent orders", () => {
  it("lists the newest orders first, capped at the dashboard limit", async () => {
    const result = await snapshot()

    expect(result.recentOrders).toHaveLength(ADMIN_DASHBOARD_RECENT_ORDERS_LIMIT)
    expect(result.recentOrders[0]?.id).toBe("o-pending")
  })

  it("keeps the joined customer name and falls back to the email for a guest", async () => {
    const result = await snapshot()
    const guest = result.recentOrders.find((row) => row.id === "o-pending")
    const account = result.recentOrders.find((row) => row.id === "o-done-1")

    expect(guest?.customerName).toBe("guest@example.com")
    expect(account?.customerName).toBe("Anna Kowalska")
  })

  it("derives the avatar initials from the resolved customer name", async () => {
    const result = await snapshot()
    const account = result.recentOrders.find((row) => row.id === "o-done-1")

    expect(account?.initials).toBe("AK")
  })

  it("reports no line count for the dashboard rows", async () => {
    const result = await snapshot()

    expect(result.recentOrders.map((row) => row.itemCount)).toStrictEqual([0, 0, 0, 0, 0])
  })

  it("keeps the payment status distinct from the order status through the batched read", async () => {
    const result = await snapshot()
    const paid = result.recentOrders.find((row) => row.id === "o-done-1")
    const unpaid = result.recentOrders.find((row) => row.id === "o-pending")

    expect(paid).toMatchObject({ paymentUiKey: "paid", status: "completed", totalMinorUnits: 30_000, userId: "u-anna" })
    expect(unpaid).toMatchObject({ paymentUiKey: "authorized", status: "pending", totalMinorUnits: 5000, userId: null })
  })
})

const topProduct = (result: AdminDashboard["snapshot"], productId: string): AdminDashboard["snapshot"]["topProducts"][number] | undefined =>
  result.topProducts.find((row) => row.productId === productId)

describe("getDashboardSnapshot top products", () => {
  it("ranks the best selling product first", async () => {
    const result = await snapshot()

    expect(result.topProducts[0]?.productId).toBe("p-ring")
  })

  it("counts units sold across completed orders only", async () => {
    const result = await snapshot()

    expect(topProduct(result, "p-ring")?.sold).toBe(4)
    expect(topProduct(result, "p-chain")?.sold).toBe(1)
  })

  it("sums line revenue per product", async () => {
    const result = await snapshot()

    expect(topProduct(result, "p-ring")?.revenueMinorUnits).toBe(26_000)
    expect(topProduct(result, "p-chain")?.revenueMinorUnits).toBe(10_000)
  })

  it("names the product from its live title in the requested locale", async () => {
    const english = await snapshot()
    const polish = await snapshot("pl-PL")

    expect(topProduct(english, "p-ring")?.name).toBe("Silver ring")
    expect(topProduct(polish, "p-ring")?.name).toBe("Srebrny pierścionek")
  })

  it("labels the primary category from its live title in the requested locale", async () => {
    const english = await snapshot()
    const polish = await snapshot("pl-PL")

    expect(topProduct(english, "p-ring")?.category).toBe("Rings")
    expect(topProduct(polish, "p-ring")?.category).toBe("Pierścionki")
  })

  it("falls back to the stored line title when the product row is gone", async () => {
    const result = await snapshot()

    expect(topProduct(result, "p-gone")?.name).toBe("Vanished bracelet")
  })

  it("leaves the category blank for a product with no primary category", async () => {
    const result = await snapshot()

    expect(topProduct(result, "p-chain")?.category).toBe("")
    expect(topProduct(result, "p-gone")?.category).toBe("")
  })

  it("carries the line thumbnail and reports none when the lines have no image", async () => {
    const result = await snapshot()

    expect(topProduct(result, "p-ring")?.imageUrl).toBe("ring-thumb.avif")
    expect(topProduct(result, "p-chain")?.imageUrl).toBeUndefined()
  })

  it("drops lines whose product id was never recorded", async () => {
    const result = await snapshot()

    expect(result.topProducts.map((row) => row.name)).not.toContain("Deleted product")
  })

  it("keeps the list within the dashboard limit", async () => {
    const result = await snapshot()

    expect(result.topProducts.length).toBeLessThanOrEqual(ADMIN_DASHBOARD_TOP_PRODUCTS_LIMIT)
  })

  it("reports the currency recorded on the orders behind the ranking", async () => {
    const result = await snapshot()

    expect(topProduct(result, "p-ring")?.currencyCode).toBe("PLN")
  })
})

describe("getDashboardSnapshot currency", () => {
  it("takes the currency from the best selling product", async () => {
    const result = await snapshot()

    expect(result.currencyCode).toBe("PLN")
  })

  it("falls back to the store currency when there is nothing to read it from", async () => {
    sqlite.exec(`delete from order_item; delete from "order";`)
    const result = await snapshot()

    expect(result.currencyCode).toBe(STORE_CURRENCY_CODE)
    expect(result.recentOrders).toStrictEqual([])
    expect(result.topProducts).toStrictEqual([])
  })
})

describe("getDashboardSnapshotQuery", () => {
  it("keys the cache entry by locale", () => {
    expect(getDashboardSnapshotQuery({ locale: "pl-PL" }).queryKey).toStrictEqual([...ADMIN_DASHBOARD_QUERY_KEYS.SNAPSHOT, "pl-PL"])
  })

  it("keeps the snapshot fresh for the configured window and does not refetch on mount or focus", () => {
    const options = getDashboardSnapshotQuery({ locale: "en-US" })

    expect(options.staleTime).toBe(ADMIN_DASHBOARD_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

it("loads the dashboard through its locale-specific cache query", async () => {
  const client = new QueryClient()
  await expect(client.query(getDashboardSnapshotQuery({ locale: "en-US" }))).resolves.toMatchObject({
    currencyCode: "PLN",
    revenue: { current: 40_000 },
  })
  client.clear()
})

it("resolves the dashboard currency from recent orders when no product ranking exists", async () => {
  sqlite.exec("delete from order_item")
  const result = await snapshot()
  expect(result.topProducts).toStrictEqual([])
  expect(result.recentOrders.length).toBeGreaterThan(0)
  expect(result.currencyCode).toBe("PLN")
})
