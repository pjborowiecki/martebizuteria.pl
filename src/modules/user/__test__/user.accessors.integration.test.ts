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
import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import {
  getAdminCustomersFilteredList,
  getAdminCustomersPage,
  getCustomerOrderStatsQuery,
  getDefaultCustomerAddressesQuery,
  getUserById,
  getUserIdByEmail,
} from "~/src/modules/user/user.accessors"
import { ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"

const JANUARY = Date.UTC(2024, 0, 10)

const JUNE = Date.UTC(2024, 5, 10)

const page = { limit: 25, offset: 0 }

beforeEach(() => {
  sqlite.exec(`
    drop table if exists user;
    drop table if exists "order";
    drop table if exists order_item;
    drop table if exists address;

    create table user (
      id text primary key, name text not null, email text not null, email_verified integer not null default 0,
      phone text, role text not null default 'customer', banned integer default 0, ban_reason text, ban_expires integer,
      image text, is_anonymous integer default 0, metadata text, stripe_customer_id text, timezone text,
      two_factor_enabled integer default 0, created_at integer not null, updated_at integer not null
    );
    create table "order" (
      id text primary key, user_id text, email text not null default '', status text not null default 'pending',
      total integer not null default 0, currency_code text not null default 'PLN',
      created_at integer not null, updated_at integer not null
    );
    create table order_item (id text primary key, order_id text, quantity integer not null default 1);
    create table address (
      id text primary key, address1 text not null default '', city text not null default '', country_code text not null default 'PL',
      province text, user_id text, is_default integer not null default 0, created_at integer not null, updated_at integer not null
    );

    insert into user (id, name, email, email_verified, phone, role, banned, stripe_customer_id, created_at, updated_at) values
      ('u-anna', 'Anna Kowalska', 'anna@example.com', 1, '+48111', 'customer', 0, 'cus_anna', ${JANUARY}, ${JANUARY}),
      ('u-jan', 'Jan Nowak', 'jan@example.com', 0, '+48222', 'customer', 1, null, ${JUNE}, ${JUNE}),
      ('u-admin', 'Admin One', 'admin@example.com', 1, null, 'admin', 0, null, ${JUNE}, ${JUNE}),
      ('u_score', 'Under Score', 'under_score@example.com', 1, null, 'customer', 0, null, ${JUNE}, ${JUNE});

    insert into "order" (id, user_id, status, total, created_at, updated_at) values
      ('o-1', 'u-anna', 'completed', 20000, ${JANUARY}, ${JANUARY}),
      ('o-2', 'u-anna', 'completed', 10000, ${JUNE}, ${JUNE}),
      ('o-3', 'u-jan', 'completed', 5000, ${JUNE}, ${JUNE}),
      ('o-4', 'u-jan', 'cancelled', 90000, ${JUNE}, ${JUNE}),
      ('o-guest', null, 'completed', 7000, ${JUNE}, ${JUNE});

    insert into address (id, city, country_code, province, user_id, is_default, created_at, updated_at) values
      ('a-1', 'Warszawa', 'PL', 'Mazowieckie', 'u-anna', 1, ${JANUARY}, ${JANUARY}),
      ('a-2', 'Kraków', 'PL', null, 'u-anna', 0, ${JANUARY}, ${JANUARY}),
      ('a-3', 'Gdańsk', 'PL', null, 'u-jan', 1, ${JUNE}, ${JUNE});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getCustomerOrderStatsQuery", () => {
  it("counts only the statuses that count towards a customer's history", async () => {
    const stats = await getCustomerOrderStatsQuery()
    const anna = stats.find((row) => row.userId === "u-anna")
    const jan = stats.find((row) => row.userId === "u-jan")

    expect(anna).toMatchObject({ orderCount: 2, totalSpent: 30_000 })
    expect(jan).toMatchObject({ orderCount: 1, totalSpent: 5000 })
  })

  it("excludes guest orders that carry no account", async () => {
    const stats = await getCustomerOrderStatsQuery()

    expect(stats.every((row) => row.userId !== null)).toBe(true)
  })

  it("narrows the rollup to the requested accounts", async () => {
    const stats = await getCustomerOrderStatsQuery(["u-anna"])

    expect(stats.map((row) => row.userId)).toStrictEqual(["u-anna"])
  })

  it("rolls up every account when the caller passes an empty list", async () => {
    const stats = await getCustomerOrderStatsQuery([])

    expect(stats.length).toBeGreaterThan(1)
  })

  it("reports the most recent countable order date", async () => {
    const stats = await getCustomerOrderStatsQuery(["u-anna"])

    expect(stats[0]?.lastOrderAt?.getTime()).toBe(JUNE)
  })
})

describe("getDefaultCustomerAddressesQuery", () => {
  it("returns one default address per customer", async () => {
    const addresses = await getDefaultCustomerAddressesQuery()

    expect(addresses.map((row) => row.userId ?? "").toSorted()).toStrictEqual(["u-anna", "u-jan"])
  })

  it("narrows to the requested accounts", async () => {
    const addresses = await getDefaultCustomerAddressesQuery(["u-jan"])

    expect(addresses).toStrictEqual([{ city: "Gdańsk", countryCode: "PL", province: null, userId: "u-jan" }])
  })
})

describe("getUserById", () => {
  it("loads the account", async () => {
    expect(await getUserById("u-anna")).toMatchObject({ email: "anna@example.com", name: "Anna Kowalska" })
  })

  it("reports nothing for an unknown id", async () => {
    expect(await getUserById("missing")).toBeUndefined()
  })
})

describe("getUserIdByEmail", () => {
  it("finds the account behind an address typed with stray spaces and capitals", async () => {
    await expect(getUserIdByEmail("  Anna@Example.COM ")).resolves.toBe("u-anna")
  })

  it("reports no account for an address nobody registered", async () => {
    await expect(getUserIdByEmail("nobody@example.com")).resolves.toBeUndefined()
  })
})

describe("getAdminCustomersPage", () => {
  it("lists the newest accounts first with the total count", async () => {
    const result = await getAdminCustomersPage(page)

    expect(result.total).toBe(4)
    expect(result.rows[0]?.createdAt.getTime()).toBe(JUNE)
    expect(result.rows.at(-1)?.id).toBe("u-anna")
  })

  it("attaches the order rollup and default addresses for the page", async () => {
    const result = await getAdminCustomersPage(page)

    expect(result.orderStats.map((row) => row.userId ?? "").toSorted()).toStrictEqual(["u-anna", "u-jan"])
    expect(result.addresses).toHaveLength(2)
  })

  it("pages through the list", async () => {
    const first = await getAdminCustomersPage({ limit: 2, offset: 0 })
    const second = await getAdminCustomersPage({ limit: 2, offset: 2 })

    expect(first.rows).toHaveLength(2)
    expect(second.rows).toHaveLength(2)
    expect(first.rows.map((row) => row.id)).not.toStrictEqual(second.rows.map((row) => row.id))
  })

  it("returns no rollup work for a page beyond the end of the list", async () => {
    const result = await getAdminCustomersPage({ limit: 25, offset: 100 })

    expect(result.rows).toStrictEqual([])
    expect(result.orderStats).toStrictEqual([])
    expect(result.addresses).toStrictEqual([])
    expect(result.total).toBe(4)
  })

  it.each([["anna"], ["ANNA"], ["kowalska"], ["+48111"], ["u-anna"]])("finds the account by %j", async (search) => {
    const result = await getAdminCustomersPage({ ...page, search })

    expect(result.rows.map((row) => row.id)).toContain("u-anna")
  })

  it("ignores a blank search", async () => {
    const result = await getAdminCustomersPage({ ...page, search: "   " })

    expect(result.total).toBe(4)
  })

  it.each([
    { expectedId: "u_score", search: "under_score" },
    { expectedId: "u-anna", search: "cus_anna" },
  ])("finds a customer by the literal underscore in $search", async ({ expectedId, search }) => {
    const result = await getAdminCustomersPage({ ...page, search })

    expect(result.rows.map((row) => row.id)).toStrictEqual([expectedId])
    expect(result.total).toBe(1)
  })

  it("still finds the same account when the underscore is replaced by a wildcard", async () => {
    const result = await getAdminCustomersPage({ ...page, search: "under" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u_score"])
  })

  it("filters by role", async () => {
    const result = await getAdminCustomersPage({ ...page, filters: { role: "admin" } })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-admin"])
  })

  it("filters by the verification and ban flags", async () => {
    const unverified = await getAdminCustomersPage({ ...page, filters: { emailVerified: false } })
    const banned = await getAdminCustomersPage({ ...page, filters: { banned: true } })

    expect(unverified.rows.map((row) => row.id)).toStrictEqual(["u-jan"])
    expect(banned.rows.map((row) => row.id)).toStrictEqual(["u-jan"])
  })

  it("filters to the accounts created before a day", async () => {
    const filters = { createdAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE } }
    const result = await getAdminCustomersPage({ ...page, filters })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
  })

  it("filters to the accounts created on one day", async () => {
    const filters = { createdAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON } }
    const result = await getAdminCustomersPage({ ...page, filters })

    expect(result.rows.map((row) => row.id).toSorted()).toStrictEqual(["u-admin", "u-jan", "u_score"])
  })

  it("narrows to returning customers", async () => {
    const result = await getAdminCustomersPage({ ...page, statFilter: ADMIN_CUSTOMER_STAT_FILTER.RETURNING })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
  })

  it("joins the order rollup to filter on lifetime spend", async () => {
    const result = await getAdminCustomersPage({
      ...page,
      filters: { totalSpent: { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GT } },
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
    expect(result.total).toBe(1)
  })

  it("treats a customer with no orders as having spent nothing rather than dropping them", async () => {
    const result = await getAdminCustomersPage({
      ...page,
      filters: { totalSpent: { amountMinorUnits: 0, operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ } },
    })

    expect(result.rows.map((row) => row.id).toSorted()).toStrictEqual(["u-admin", "u_score"])
  })

  it("filters on the average order value", async () => {
    const result = await getAdminCustomersPage({
      ...page,
      filters: { averageOrderValue: { amountMinorUnits: 15_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE } },
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
  })

  it("filters on the day of the last order through the rollup subquery", async () => {
    const filters = { lastOrderAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON } }
    const result = await getAdminCustomersPage({ ...page, filters })

    expect(result.rows.map((row) => row.id).toSorted()).toStrictEqual(["u-anna", "u-jan"])
  })

  it("drops the customers whose last order predates the filtered day", async () => {
    const filters = { lastOrderAt: { date: "2024-01-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON } }
    const result = await getAdminCustomersPage({ ...page, filters })

    expect(result.rows).toStrictEqual([])
  })

  it("combines a search with a rollup filter", async () => {
    const result = await getAdminCustomersPage({
      ...page,
      filters: { totalSpent: { amountMinorUnits: 1, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE } },
      search: "anna",
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
  })
})

describe("getAdminCustomersFilteredList", () => {
  it("exports all matches for an order-total filter and includes their addresses and orders", async () => {
    const result = await getAdminCustomersFilteredList({
      filters: { totalSpent: { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE } },
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
    expect(result.orderStats).toMatchObject([{ orderCount: 2, totalSpent: 30_000, userId: "u-anna" }])
    expect(result.addresses).toMatchObject([{ city: "Warszawa", userId: "u-anna" }])
  })

  it("exports the full set of returning customers with matching order totals", async () => {
    const result = await getAdminCustomersFilteredList({ statFilter: ADMIN_CUSTOMER_STAT_FILTER.RETURNING })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
    expect(result.orderStats).toMatchObject([{ orderCount: 2, totalSpent: 30_000, userId: "u-anna" }])
  })

  it("returns every matching row without paging", async () => {
    const result = await getAdminCustomersFilteredList({})

    expect(result.rows).toHaveLength(4)
    expect(result.orderStats).toHaveLength(2)
  })

  it("applies the same filters as the paged query", async () => {
    const result = await getAdminCustomersFilteredList({ filters: { role: "admin" } })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-admin"])
  })

  it("exports the unpaged rollup join for a last-order-day filter", async () => {
    const filters = { lastOrderAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON } }
    const result = await getAdminCustomersFilteredList({ filters })

    expect(result.rows.map((row) => row.id).toSorted()).toStrictEqual(["u-anna", "u-jan"])
  })

  it("skips the rollup queries when nothing matches", async () => {
    const result = await getAdminCustomersFilteredList({ search: "nobody" })

    expect(result).toStrictEqual({ addresses: [], orderStats: [], rows: [] })
  })
})

describe("a full admin page of customers", () => {
  const ids = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `bulk-${String(index).padStart(3, "0")}`)

  const totalSpentByCustomer = new Map(ids.map((id, index) => [id, index + 1]))

  const cityByCustomer = new Map(ids.map((id) => [id, `City ${id}`]))

  beforeEach(() => {
    const insertUser = sqlite.prepare("insert into user (id, name, email, created_at, updated_at) values (?, ?, ?, ?, ?)")
    const insertOrder = sqlite.prepare(
      `insert into "order" (id, user_id, status, total, created_at, updated_at) values (?, ?, 'completed', ?, ?, ?)`,
    )
    const insertAddress = sqlite.prepare(
      "insert into address (id, city, user_id, is_default, created_at, updated_at) values (?, ?, ?, 1, ?, ?)",
    )

    for (const [index, id] of ids.entries()) {
      const createdAt = JUNE + index + 1
      insertUser.run(id, `Bulk ${id}`, `${id}@example.com`, createdAt, createdAt)
      insertOrder.run(`order-${id}`, id, index + 1, createdAt, createdAt)
      insertAddress.run(`address-${id}`, `City ${id}`, id, createdAt, createdAt)
    }
  })

  it("attaches the order rollup and default address of every customer on the page", async () => {
    const result = await getAdminCustomersPage({ limit: LIST_PAGE_SIZE_MAX, offset: 0 })

    expect(result.rows.map((row) => row.id)).toStrictEqual(ids.toReversed())
    expect(new Map(result.orderStats.map((row) => [row.userId, row.totalSpent]))).toStrictEqual(totalSpentByCustomer)
    expect(new Map(result.addresses.map((row) => [row.userId, row.city]))).toStrictEqual(cityByCustomer)
  })

  it("exports the order rollup and default address of every matching customer", async () => {
    const result = await getAdminCustomersFilteredList({ search: "bulk" })

    expect(result.rows).toHaveLength(LIST_PAGE_SIZE_MAX)
    expect(new Map(result.orderStats.map((row) => [row.userId, row.totalSpent]))).toStrictEqual(totalSpentByCustomer)
    expect(new Map(result.addresses.map((row) => [row.userId, row.city]))).toStrictEqual(cityByCustomer)
  })
})
