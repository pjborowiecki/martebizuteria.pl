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

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  countCustomerOrders,
  getCustomerActivityAuditRows,
  getCustomerLoginAuditRows,
  getCustomerOrderNumbers,
  getCustomerOrderRows,
  getCustomerPurchasedCategoryIds,
  getCustomerPurchasedProductIds,
  getCustomerSpendStats,
  getOrderItemsForOrders,
} from "~/src/modules/customer-account/customer-account.accessors.server"
import {
  CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT,
  CUSTOMER_ACCOUNT_ORDERS_LIMIT,
  CUSTOMER_ACCOUNT_RECOMMENDED_CATEGORY_LIMIT,
} from "~/src/modules/customer-account/customer-account.constants"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/customer-activity/customer-activity.constants"

const CUSTOMER = "user-1"

const OTHER_CUSTOMER = "user-2"

const DAY_MS = 86_400_000

const dayOf = (day: number): number => Date.UTC(2026, 0, day)

interface OrderFixture {
  readonly day: number
  readonly fulfillmentStatus: string
  readonly id: string
  readonly status: string
  readonly total: number
  readonly userId: string
}

const insertOrder = ({ day, fulfillmentStatus, id, status, total, userId }: OrderFixture): void => {
  sqlite
    .prepare(
      `insert into "order" (id, user_id, status, fulfillment_status, order_number, total, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, status, fulfillmentStatus, `MRT-${id}`, total, dayOf(day), dayOf(day))
}

const insertOrderItem = (id: string, orderId: string, variantId: string): void => {
  sqlite.prepare(`insert into order_item (id, order_id, variant_id, created_at) values (?, ?, ?, ?)`).run(id, orderId, variantId, dayOf(1))
}

interface AuditFixture {
  readonly action: string
  readonly createdAt: number
  readonly id: string
  readonly ip: string | null
  readonly resourceId: string
}

const insertAudit = ({ action, createdAt, id, ip, resourceId }: AuditFixture): void => {
  sqlite
    .prepare(`insert into audit_log (id, resource_id, action, created_at, ip) values (?, ?, ?, ?, ?)`)
    .run(id, resourceId, action, createdAt, ip)
}

beforeEach(() => {
  sqlite.exec(`
    drop table if exists "order";
    drop table if exists order_item;
    drop table if exists product_variant;
    drop table if exists product;
    drop table if exists category_on_product;
    drop table if exists audit_log;

    create table "order" (
      id text primary key, user_id text, status text not null, fulfillment_status text not null, order_number text not null,
      total integer not null default 0, currency_code text not null default 'PLN', created_at integer not null, updated_at integer not null
    );
    create table order_item (
      id text primary key, order_id text not null, variant_id text, quantity integer not null default 1, thumbnail text,
      title text not null default '', total integer not null default 0, unit_price integer not null default 0,
      variant_title text, created_at integer not null
    );
    create table product_variant (id text primary key, product_id text not null, title text);
    create table product (id text primary key, handle text not null, thumbnail text);
    create table category_on_product (category_id text not null, product_id text not null, primary key (product_id, category_id));
    create table audit_log (
      id text primary key, resource_id text, action text not null, created_at integer not null, ip text, detail text, metadata text
    );

    insert into product_variant (id, product_id) values
      ('v-ring', 'p-ring'), ('v-necklace', 'p-necklace'), ('v-earring', 'p-earring');
    insert into category_on_product (category_id, product_id) values
      ('c-rings', 'p-ring'), ('c-necklaces', 'p-necklace'), ('c-earrings', 'p-earring');
  `)

  insertOrder({ day: 1, fulfillmentStatus: "not_fulfilled", id: "processing", status: "processing", total: 10_000, userId: CUSTOMER })
  insertOrder({ day: 2, fulfillmentStatus: "shipped", id: "shipped", status: "processing", total: 20_000, userId: CUSTOMER })
  insertOrder({ day: 3, fulfillmentStatus: "delivered", id: "delivered", status: "completed", total: 30_000, userId: CUSTOMER })
  insertOrder({ day: 4, fulfillmentStatus: "not_fulfilled", id: "cancelled", status: "cancelled", total: 5000, userId: CUSTOMER })
  insertOrder({ day: 5, fulfillmentStatus: "cancelled", id: "fulfilment-cancelled", status: "processing", total: 7000, userId: CUSTOMER })
  insertOrder({ day: 6, fulfillmentStatus: "delivered", id: "refunded-after-delivery", status: "refunded", total: 8000, userId: CUSTOMER })
  insertOrder({ day: 7, fulfillmentStatus: "not_fulfilled", id: "pending", status: "pending", total: 4000, userId: CUSTOMER })
  insertOrder({ day: 8, fulfillmentStatus: "shipped", id: "someone-else", status: "processing", total: 90_000, userId: OTHER_CUSTOMER })
})

afterAll(() => {
  sqlite.close()
})

describe("getCustomerOrderRows filters", () => {
  it.each([
    {
      expected: ["pending", "refunded-after-delivery", "fulfilment-cancelled", "cancelled", "delivered", "shipped", "processing"],
      filter: "all",
    },
    { expected: ["fulfilment-cancelled", "cancelled"], filter: "cancelled" },
    { expected: ["refunded-after-delivery"], filter: "refunded" },
    { expected: ["delivered"], filter: "delivered" },
    { expected: ["shipped"], filter: "shipped" },
    { expected: ["pending", "processing"], filter: "processing" },
  ] as const)("lists the customer's own $filter orders newest first", async ({ expected, filter }) => {
    const rows = await getCustomerOrderRows(CUSTOMER, { filter })

    expect(rows.map((row) => row.id)).toStrictEqual(expected)
  })

  it("keeps a refunded order out of the delivered bucket even after it reached the customer", async () => {
    const rows = await getCustomerOrderRows(CUSTOMER, { filter: "delivered" })

    expect(rows.map((row) => row.status)).not.toContain("refunded")
  })

  it("counts the same orders the filter lists", async () => {
    await expect(countCustomerOrders(CUSTOMER)).resolves.toBe(7)
    await expect(countCustomerOrders(CUSTOMER, "cancelled")).resolves.toBe(2)
    await expect(countCustomerOrders(CUSTOMER, "processing")).resolves.toBe(2)
  })
})

describe("getCustomerSpendStats", () => {
  it("adds up only the orders that were paid for", async () => {
    await expect(getCustomerSpendStats(CUSTOMER)).resolves.toStrictEqual({ orderCount: 4, totalSpent: 67_000 })
  })

  it("reports nothing spent for a customer without paid orders", async () => {
    await expect(getCustomerSpendStats("user-without-orders")).resolves.toStrictEqual({ orderCount: 0, totalSpent: 0 })
  })
})

describe("getCustomerPurchasedCategoryIds", () => {
  beforeEach(() => {
    insertOrderItem("item-1", "processing", "v-ring")
    insertOrderItem("item-2", "processing", "v-necklace")
    insertOrderItem("item-3", "shipped", "v-ring")
    insertOrderItem("item-4", "delivered", "v-ring")
    insertOrderItem("item-5", "delivered", "v-necklace")
    insertOrderItem("item-6", "delivered", "v-earring")
    insertOrderItem("item-7", "cancelled", "v-earring")
    insertOrderItem("item-8", "cancelled", "v-earring")
    insertOrderItem("item-9", "pending", "v-earring")
    insertOrderItem("item-10", "someone-else", "v-earring")
  })

  it("ranks the categories the customer paid for most often and keeps only the top ones", async () => {
    const categories = await getCustomerPurchasedCategoryIds(CUSTOMER)

    expect(categories).toStrictEqual(["c-rings", "c-necklaces"])
    expect(categories).toHaveLength(CUSTOMER_ACCOUNT_RECOMMENDED_CATEGORY_LIMIT)
  })

  it("returns no categories for a customer who never paid for anything", async () => {
    await expect(getCustomerPurchasedCategoryIds("user-without-orders")).resolves.toStrictEqual([])
  })
})

describe("getCustomerPurchasedProductIds", () => {
  beforeEach(() => {
    insertOrderItem("item-1", "processing", "v-ring")
    insertOrderItem("item-2", "shipped", "v-ring")
    insertOrderItem("item-3", "pending", "v-necklace")
    insertOrderItem("item-4", "someone-else", "v-earring")
  })

  it("lists every product the customer ordered once, whatever became of the order", async () => {
    const products = await getCustomerPurchasedProductIds(CUSTOMER)

    expect(products.toSorted()).toStrictEqual(["p-necklace", "p-ring"])
  })

  it("returns nothing for a customer who never ordered", async () => {
    await expect(getCustomerPurchasedProductIds("user-without-orders")).resolves.toStrictEqual([])
  })
})

describe("getCustomerLoginAuditRows", () => {
  it("lists only the customer's own sign-in attempts newest first", async () => {
    insertAudit({ action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: dayOf(1), id: "audit-1", ip: "203.0.113.7", resourceId: CUSTOMER })
    insertAudit({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
      createdAt: dayOf(2),
      id: "audit-2",
      ip: "198.51.100.4",
      resourceId: CUSTOMER,
    })
    insertAudit({ action: AUDIT_LOG_ACTION.AUTH_LOGOUT, createdAt: dayOf(3), id: "audit-3", ip: null, resourceId: CUSTOMER })
    insertAudit({ action: AUDIT_LOG_ACTION.ORDER_PLACED, createdAt: dayOf(4), id: "audit-4", ip: null, resourceId: CUSTOMER })
    insertAudit({ action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: dayOf(5), id: "audit-5", ip: null, resourceId: OTHER_CUSTOMER })

    await expect(getCustomerLoginAuditRows(CUSTOMER)).resolves.toStrictEqual([
      { action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, createdAt: new Date(dayOf(2)), ip: "198.51.100.4" },
      { action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: new Date(dayOf(1)), ip: "203.0.113.7" },
    ])
  })

  it("stops at the login history limit and keeps the most recent attempts", async () => {
    for (let index = 0; index <= CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT; index += 1) {
      insertAudit({
        action: AUDIT_LOG_ACTION.AUTH_LOGIN,
        createdAt: dayOf(1) + index * DAY_MS,
        id: `audit-${index}`,
        ip: null,
        resourceId: CUSTOMER,
      })
    }

    const rows = await getCustomerLoginAuditRows(CUSTOMER)

    expect(rows).toHaveLength(CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT)
    expect(rows.at(-1)?.createdAt).toStrictEqual(new Date(dayOf(1) + DAY_MS))
  })
})

describe("getCustomerOrderNumbers", () => {
  it("lists the customer's own order numbers newest first", async () => {
    const rows = await getCustomerOrderNumbers(CUSTOMER)

    expect(rows.slice(0, 2)).toStrictEqual([
      { id: "pending", orderNumber: "MRT-pending" },
      { id: "refunded-after-delivery", orderNumber: "MRT-refunded-after-delivery" },
    ])
    expect(rows.map((row) => row.id)).not.toContain("someone-else")
  })

  it("stops at the account order limit", async () => {
    for (let index = 0; index <= CUSTOMER_ACCOUNT_ORDERS_LIMIT; index += 1) {
      insertOrder({
        day: 10 + index,
        fulfillmentStatus: "delivered",
        id: `bulk-${index}`,
        status: "completed",
        total: 1000,
        userId: "user-with-many-orders",
      })
    }

    await expect(getCustomerOrderNumbers("user-with-many-orders")).resolves.toHaveLength(CUSTOMER_ACCOUNT_ORDERS_LIMIT)
  })
})

describe("a customer with a long order history", () => {
  const LONG_HISTORY_CUSTOMER = "user-with-long-history"

  const orderIds = Array.from({ length: 150 }, (_, index) => `history-${String(index).padStart(3, "0")}`)

  beforeEach(() => {
    for (const [index, id] of orderIds.entries()) {
      insertOrder({ day: 10, fulfillmentStatus: "delivered", id, status: "completed", total: 1000, userId: LONG_HISTORY_CUSTOMER })
      insertOrderItem(`line-${id}`, id, "v-ring")
      insertAudit({ action: AUDIT_LOG_ACTION.ORDER_PLACED, createdAt: dayOf(10) + index, id: `audit-${id}`, ip: null, resourceId: id })
    }
  })

  it("reads the newest activity across the customer's account and every one of their orders", async () => {
    insertAudit({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN,
      createdAt: dayOf(20),
      id: "audit-login",
      ip: null,
      resourceId: LONG_HISTORY_CUSTOMER,
    })
    insertAudit({ action: AUDIT_LOG_ACTION.ORDER_SHIPPED, createdAt: dayOf(21), id: "audit-other", ip: null, resourceId: "someone-else" })

    const rows = await getCustomerActivityAuditRows(LONG_HISTORY_CUSTOMER, orderIds)

    expect(rows.map((row) => row.resourceId)).toStrictEqual([
      LONG_HISTORY_CUSTOMER,
      ...orderIds.toReversed().slice(0, CUSTOMER_AUDIT_TIMELINE_LIMIT - 1),
    ])
  })

  it("lists the lines of every one of the customer's orders", async () => {
    insertOrderItem("line-someone-else", "someone-else", "v-ring")

    const rows = await getOrderItemsForOrders(orderIds)

    expect(rows.map((row) => row.orderId).toSorted()).toStrictEqual(orderIds)
  })
})
