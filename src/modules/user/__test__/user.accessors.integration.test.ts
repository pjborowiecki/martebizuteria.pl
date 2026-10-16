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
  getAdminCustomerOrderRollupStatsQuery,
  getAdminCustomerTotalCountQuery,
  getAdminCustomersFilteredList,
  getAdminCustomersPage,
  getAverageProductsPerOrderQuery,
  getCustomerOrderStatsQuery,
  getDefaultCustomerAddressesQuery,
  getLatestOrderShippingAddressesQuery,
  getUserById,
  getUserIdByEmail,
} from "~/src/modules/user/user.accessors"
import { ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { formatAdminCustomerLocation, mapCustomerLocations } from "~/src/modules/user/user.utils"

const JANUARY = Date.UTC(2024, 0, 10)

const MARCH = Date.UTC(2024, 2, 10)

const JUNE = Date.UTC(2024, 5, 10)

const page = { limit: 25, offset: 0, timeZone: "Europe/Warsaw" }

const AUGUST = Date.UTC(2024, 7, 10)

const SEEDED_CUSTOMER_IDS = ["u-anna", "u-jan", "u-admin", "u_score"]

const insertNewerOrder = ({ id, orderNumber, status, userId }: { id: string; orderNumber: string; status: string; userId: string }) => {
  sqlite
    .prepare(`insert into "order" (id, user_id, order_number, status, created_at, updated_at) values (?, ?, ?, ?, ?, ?)`)
    .run(id, userId, orderNumber, status, AUGUST, AUGUST)
}

const insertNewerOrderAddress = ({ city, orderId, type }: { city: string; orderId: string; type: "billing" | "shipping" }) => {
  sqlite
    .prepare(
      `insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, type, created_at, updated_at)
        values (?, 'ul. Nowa 7', ?, 'PL', 'Anna', 'Kowalska', ?, ?, ?, ?)`,
    )
    .run(`${orderId}-${type}`, city, orderId, type, AUGUST, AUGUST)
}

const insertCheckoutSavedDefaultAddress = ({ city, id }: { city: string; id: string }) => {
  sqlite
    .prepare(
      `insert into address (id, city, country_code, user_id, is_default, created_at, updated_at) values (?, ?, 'PL', 'u_score', 1, ?, ?)`,
    )
    .run(id, city, AUGUST, AUGUST)
}

const locationsOf = (result: {
  defaultAddresses: readonly User["customerLocationRow"][]
  latestShippingAddresses: readonly User["customerLocationRow"][]
}) =>
  Object.fromEntries(
    [...mapCustomerLocations(result.defaultAddresses, result.latestShippingAddresses)].map(([userId, location]) => [
      userId,
      formatAdminCustomerLocation(location),
    ]),
  )

beforeEach(() => {
  sqlite.exec(`
    drop table if exists user;
    drop table if exists "order";
    drop table if exists order_item;
    drop table if exists order_address;
    drop table if exists address;
    drop table if exists payment;

    create table user (
      id text primary key, name text not null, email text not null, email_verified integer not null default 0,
      phone text, role text not null default 'customer', banned integer default 0, ban_reason text, ban_expires integer,
      image text, is_anonymous integer default 0, metadata text, stripe_customer_id text, timezone text, format_locale text,
      two_factor_enabled integer default 0, created_at integer not null, updated_at integer not null
    );
    create table payment (id text primary key, refunded_amount integer not null default 0, status text);
    create table "order" (
      id text primary key, payment_id text, user_id text, email text not null default '', order_number text not null default '',
      status text not null default 'pending', total integer not null default 0, currency_code text not null default 'PLN',
      created_at integer not null, updated_at integer not null
    );
    create table order_item (id text primary key, order_id text, quantity integer not null default 1);
    create table order_address (
      id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
      first_name text not null, last_name text not null, order_id text not null, phone text, postal_code text,
      province text, type text not null, created_at integer not null, updated_at integer not null
    );
    create table address (
      id text primary key, address1 text not null default '', city text not null default '', country_code text not null default 'PL',
      province text, user_id text, is_default integer not null default 0, created_at integer not null, updated_at integer not null
    );

    insert into user (id, name, email, email_verified, phone, role, banned, stripe_customer_id, created_at, updated_at) values
      ('u-anna', 'Anna Kowalska', 'anna@example.com', 1, '+48111', 'customer', 0, 'cus_anna', ${JANUARY}, ${JANUARY}),
      ('u-jan', 'Jan Nowak', 'jan@example.com', 0, '+48222', 'customer', 1, null, ${JUNE}, ${JUNE}),
      ('u-admin', 'Admin One', 'admin@example.com', 1, null, 'admin', 0, null, ${JUNE}, ${JUNE}),
      ('u_score', 'Under Score', 'under_score@example.com', 1, null, 'customer', 0, null, ${JUNE}, ${JUNE});

    insert into "order" (id, user_id, order_number, status, total, created_at, updated_at) values
      ('o-1', 'u-anna', 'MRT-2024-00001', 'completed', 20000, ${JANUARY}, ${JANUARY}),
      ('o-2', 'u-anna', 'MRT-2024-00002', 'completed', 10000, ${JUNE}, ${JUNE}),
      ('o-3', 'u-jan', 'MRT-2024-00003', 'completed', 5000, ${JUNE}, ${JUNE}),
      ('o-4', 'u-jan', 'MRT-2024-00004', 'cancelled', 90000, ${JUNE}, ${JUNE}),
      ('o-guest', null, 'MRT-2024-00005', 'completed', 7000, ${JUNE}, ${JUNE});

    insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, province, type, created_at, updated_at) values
      ('oa-1', 'ul. Długa 1', 'Poznań', 'PL', 'Anna', 'Kowalska', 'o-1', 'Wielkopolskie', 'shipping', ${JANUARY}, ${JANUARY}),
      ('oa-2', 'ul. Piotrkowska 2', 'Łódź', 'PL', 'Anna', 'Kowalska', 'o-2', 'Łódzkie', 'shipping', ${JUNE}, ${JUNE}),
      ('oa-2-billing', 'ul. Firmowa 3', 'Wrocław', 'PL', 'Anna', 'Kowalska', 'o-2', null, 'billing', ${JUNE}, ${JUNE}),
      ('oa-3', 'ul. Monte Cassino 4', 'Sopot', 'PL', 'Jan', 'Nowak', 'o-3', null, 'shipping', ${JUNE}, ${JUNE}),
      ('oa-4', 'ul. Świętojańska 5', 'Gdynia', 'PL', 'Jan', 'Nowak', 'o-4', null, 'shipping', ${JUNE}, ${JUNE}),
      ('oa-guest', 'ul. Szeroka 6', 'Toruń', 'PL', 'Gość', 'Sklepu', 'o-guest', null, 'shipping', ${JUNE}, ${JUNE});

    insert into payment (id, refunded_amount, status) values ('pay-partly-refunded', 2000, 'succeeded'), ('pay-refunded', 30000, 'refunded');

    insert into "order" (id, payment_id, user_id, status, total, created_at, updated_at) values
      ('o-score-unsent', 'pay-partly-refunded', 'u_score', 'processing', 12000, ${MARCH}, ${MARCH}),
      ('o-score-refunded', 'pay-refunded', 'u_score', 'refunded', 30000, ${MARCH}, ${MARCH});

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

  it("books a paid order that is still being fulfilled net of its partial refund and leaves out the refunded one", async () => {
    const [score] = await getCustomerOrderStatsQuery(["u_score"])

    expect(score).toMatchObject({ orderCount: 1, totalSpent: 10_000 })
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

  it("lists several default addresses of one customer in the order they were saved", async () => {
    insertCheckoutSavedDefaultAddress({ city: "Kraków", id: "z-shipping" })
    insertCheckoutSavedDefaultAddress({ city: "Wrocław", id: "a-billing" })

    const addresses = await getDefaultCustomerAddressesQuery(["u_score"])

    expect(addresses.map((row) => row.city)).toStrictEqual(["Kraków", "Wrocław"])
  })
})

describe("getLatestOrderShippingAddressesQuery", () => {
  it("takes the shipping address of the customer's newest order", async () => {
    await expect(getLatestOrderShippingAddressesQuery(["u-anna"])).resolves.toStrictEqual([
      { city: "Łódź", countryCode: "PL", province: "Łódzkie", userId: "u-anna" },
    ])
  })

  it("skips a newer order that carries only a billing address", async () => {
    insertNewerOrder({ id: "o-billing-only", orderNumber: "MRT-2024-00006", status: "completed", userId: "u-anna" })
    insertNewerOrderAddress({ city: "Wrocław", orderId: "o-billing-only", type: "billing" })

    const [location] = await getLatestOrderShippingAddressesQuery(["u-anna"])

    expect(location?.city).toBe("Łódź")
  })

  it.each([["processing"], ["cancelled"], ["refunded"]])("takes a newer %s order, whatever became of it", async (status) => {
    insertNewerOrder({ id: "o-newer", orderNumber: "MRT-2024-00006", status, userId: "u-jan" })
    insertNewerOrderAddress({ city: "Elbląg", orderId: "o-newer", type: "shipping" })

    const [location] = await getLatestOrderShippingAddressesQuery(["u-jan"])

    expect(location?.city).toBe("Elbląg")
  })

  it("breaks a tie between orders placed in the same millisecond by the later order number", async () => {
    insertNewerOrder({ id: "o-a", orderNumber: "MRT-2024-00008", status: "completed", userId: "u_score" })
    insertNewerOrder({ id: "o-b", orderNumber: "MRT-2024-00007", status: "completed", userId: "u_score" })
    insertNewerOrderAddress({ city: "Lublin", orderId: "o-b", type: "shipping" })
    insertNewerOrderAddress({ city: "Rzeszów", orderId: "o-a", type: "shipping" })

    await expect(getLatestOrderShippingAddressesQuery(["u_score"])).resolves.toStrictEqual([
      { city: "Rzeszów", countryCode: "PL", province: null, userId: "u_score" },
    ])
  })

  it("takes one address per requested customer", async () => {
    const rows = await getLatestOrderShippingAddressesQuery(SEEDED_CUSTOMER_IDS)

    expect(Object.fromEntries(rows.map((row) => [row.userId, row.city]))).toStrictEqual({ "u-anna": "Łódź", "u-jan": "Gdynia" })
  })

  it("keeps guest orders and the orders of customers who were not requested out", async () => {
    const rows = await getLatestOrderShippingAddressesQuery(["u-anna", "u-admin"])

    expect(rows.map((row) => [row.userId, row.city])).toStrictEqual([["u-anna", "Łódź"]])
  })

  it("reports nothing for a customer who never ordered", async () => {
    await expect(getLatestOrderShippingAddressesQuery(["u-admin"])).resolves.toStrictEqual([])
  })

  it("reports nothing for a customer whose orders carry no shipping address", async () => {
    insertNewerOrder({ id: "o-unaddressed", orderNumber: "MRT-2024-00006", status: "completed", userId: "u_score" })

    await expect(getLatestOrderShippingAddressesQuery(["u_score"])).resolves.toStrictEqual([])
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

  it("attaches the order rollup, default addresses and latest shipping addresses for the page", async () => {
    const result = await getAdminCustomersPage(page)

    expect(result.orderStats.map((row) => row.userId ?? "").toSorted()).toStrictEqual(["u-anna", "u-jan", "u_score"])
    expect(result.defaultAddresses).toHaveLength(2)
    expect(result.latestShippingAddresses).toHaveLength(2)
  })

  it("pages through the list", async () => {
    const first = await getAdminCustomersPage({ limit: 2, offset: 0, timeZone: "Europe/Warsaw" })
    const second = await getAdminCustomersPage({ limit: 2, offset: 2, timeZone: "Europe/Warsaw" })

    expect(first.rows).toHaveLength(2)
    expect(second.rows).toHaveLength(2)
    expect(first.rows.map((row) => row.id)).not.toStrictEqual(second.rows.map((row) => row.id))
  })

  it("returns no rollup work for a page beyond the end of the list", async () => {
    const result = await getAdminCustomersPage({ limit: 25, offset: 100, timeZone: "Europe/Warsaw" })

    expect(result.rows).toStrictEqual([])
    expect(result.orderStats).toStrictEqual([])
    expect(result.defaultAddresses).toStrictEqual([])
    expect(result.latestShippingAddresses).toStrictEqual([])
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

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-admin"])
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

describe("getAdminCustomersPage order rollup of a customer with a refund", () => {
  it("filters on the average of what each paid order brought in after refunds", async () => {
    const result = await getAdminCustomersPage({
      ...page,
      filters: { averageOrderValue: { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ } },
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u_score"])
  })

  it("filters on what the paid orders brought in after refunds", async () => {
    const result = await getAdminCustomersPage({
      ...page,
      filters: { totalSpent: { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ } },
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u_score"])
  })
})

describe("getAdminCustomersFilteredList", () => {
  it("exports all matches for an order-total filter and includes their addresses and orders", async () => {
    const result = await getAdminCustomersFilteredList({
      filters: { totalSpent: { amountMinorUnits: 20_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE } },
      timeZone: "Europe/Warsaw",
    })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
    expect(result.orderStats).toMatchObject([{ orderCount: 2, totalSpent: 30_000, userId: "u-anna" }])
    expect(result.defaultAddresses).toMatchObject([{ city: "Warszawa", userId: "u-anna" }])
    expect(result.latestShippingAddresses).toMatchObject([{ city: "Łódź", userId: "u-anna" }])
  })

  it("exports the full set of returning customers with matching order totals", async () => {
    const result = await getAdminCustomersFilteredList({ statFilter: ADMIN_CUSTOMER_STAT_FILTER.RETURNING, timeZone: "Europe/Warsaw" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-anna"])
    expect(result.orderStats).toMatchObject([{ orderCount: 2, totalSpent: 30_000, userId: "u-anna" }])
  })

  it("returns every matching row without paging", async () => {
    const result = await getAdminCustomersFilteredList({ timeZone: "Europe/Warsaw" })

    expect(result.rows).toHaveLength(4)
    expect(result.orderStats).toHaveLength(3)
  })

  it("applies the same filters as the paged query", async () => {
    const result = await getAdminCustomersFilteredList({ filters: { role: "admin" }, timeZone: "Europe/Warsaw" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(["u-admin"])
  })

  it("exports the unpaged rollup join for a last-order-day filter", async () => {
    const filters = { lastOrderAt: { date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON } }
    const result = await getAdminCustomersFilteredList({ filters, timeZone: "Europe/Warsaw" })

    expect(result.rows.map((row) => row.id).toSorted()).toStrictEqual(["u-anna", "u-jan"])
  })

  it("skips the rollup queries when nothing matches", async () => {
    const result = await getAdminCustomersFilteredList({ search: "nobody", timeZone: "Europe/Warsaw" })

    expect(result).toStrictEqual({ defaultAddresses: [], latestShippingAddresses: [], orderStats: [], rows: [] })
  })
})

describe("the customer location on the admin list and its export", () => {
  it("keeps the saved default address of a customer who has also ordered", async () => {
    expect(locationsOf(await getAdminCustomersPage(page))).toStrictEqual({ "u-anna": "Warszawa, Mazowieckie, PL", "u-jan": "Gdańsk, PL" })
  })

  it("falls back to the shipping address of the latest order when no default address is saved", async () => {
    sqlite.exec("update address set is_default = 0")

    expect(locationsOf(await getAdminCustomersPage(page))).toStrictEqual({ "u-anna": "Łódź, Łódzkie, PL", "u-jan": "Gdynia, PL" })
  })

  it("exports the same locations as the list, falling back to the latest order only without a default address", async () => {
    sqlite.exec("update address set is_default = 0 where user_id = 'u-jan'")

    const exported = locationsOf(await getAdminCustomersFilteredList({ timeZone: "Europe/Warsaw" }))

    expect(exported).toStrictEqual({ "u-anna": "Warszawa, Mazowieckie, PL", "u-jan": "Gdynia, PL" })
    expect(exported).toStrictEqual(locationsOf(await getAdminCustomersPage(page)))
  })

  it("keeps the shipping address when checkout saved both the shipping and the billing address as defaults", async () => {
    insertCheckoutSavedDefaultAddress({ city: "Kraków", id: "z-shipping" })
    insertCheckoutSavedDefaultAddress({ city: "Wrocław", id: "a-billing" })

    expect(locationsOf(await getAdminCustomersPage(page))).toMatchObject({ u_score: "Kraków, PL" })
  })

  it("prefers a billing address saved as the default at checkout over the latest order's shipping address", async () => {
    insertNewerOrder({ id: "o-newer", orderNumber: "MRT-2024-00006", status: "completed", userId: "u_score" })
    insertNewerOrderAddress({ city: "Lublin", orderId: "o-newer", type: "shipping" })
    insertCheckoutSavedDefaultAddress({ city: "Wrocław", id: "a-billing" })

    expect(locationsOf(await getAdminCustomersPage(page))).toMatchObject({ u_score: "Wrocław, PL" })
  })
})

describe("a full admin page of customers", () => {
  const ids = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `bulk-${String(index).padStart(3, "0")}`)

  const totalSpentByCustomer = new Map(ids.map((id, index) => [id, index + 1]))

  const cityByCustomer = new Map(ids.map((id) => [id, `City ${id}`]))

  const shippingCityByCustomer = new Map(ids.map((id) => [id, `Shipping ${id}`]))

  beforeEach(() => {
    const insertUser = sqlite.prepare("insert into user (id, name, email, created_at, updated_at) values (?, ?, ?, ?, ?)")
    const insertOrder = sqlite.prepare(
      `insert into "order" (id, user_id, status, total, created_at, updated_at) values (?, ?, 'completed', ?, ?, ?)`,
    )
    const insertAddress = sqlite.prepare(
      "insert into address (id, city, user_id, is_default, created_at, updated_at) values (?, ?, ?, 1, ?, ?)",
    )
    const insertOrderAddress = sqlite.prepare(
      `insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, type, created_at, updated_at)
        values (?, 'ul. Hurtowa 1', ?, 'PL', 'Bulk', 'Customer', ?, 'shipping', ?, ?)`,
    )

    for (const [index, id] of ids.entries()) {
      const createdAt = JUNE + index + 1
      insertUser.run(id, `Bulk ${id}`, `${id}@example.com`, createdAt, createdAt)
      insertOrder.run(`order-${id}`, id, index + 1, createdAt, createdAt)
      insertAddress.run(`address-${id}`, `City ${id}`, id, createdAt, createdAt)
      insertOrderAddress.run(`order-address-${id}`, `Shipping ${id}`, `order-${id}`, createdAt, createdAt)
    }
  })

  it("attaches the order rollup, default address and latest shipping address of every customer on the page", async () => {
    const result = await getAdminCustomersPage({ limit: LIST_PAGE_SIZE_MAX, offset: 0, timeZone: "Europe/Warsaw" })

    expect(result.rows.map((row) => row.id)).toStrictEqual(ids.toReversed())
    expect(new Map(result.orderStats.map((row) => [row.userId, row.totalSpent]))).toStrictEqual(totalSpentByCustomer)
    expect(new Map(result.defaultAddresses.map((row) => [row.userId, row.city]))).toStrictEqual(cityByCustomer)
    expect(new Map(result.latestShippingAddresses.map((row) => [row.userId, row.city]))).toStrictEqual(shippingCityByCustomer)
  })

  it("exports the order rollup, default address and latest shipping address of every matching customer", async () => {
    const result = await getAdminCustomersFilteredList({ search: "bulk", timeZone: "Europe/Warsaw" })

    expect(result.rows).toHaveLength(LIST_PAGE_SIZE_MAX)
    expect(new Map(result.orderStats.map((row) => [row.userId, row.totalSpent]))).toStrictEqual(totalSpentByCustomer)
    expect(new Map(result.defaultAddresses.map((row) => [row.userId, row.city]))).toStrictEqual(cityByCustomer)
    expect(new Map(result.latestShippingAddresses.map((row) => [row.userId, row.city]))).toStrictEqual(shippingCityByCustomer)
  })
})

describe("the admin customer stats queries", () => {
  it("count every account and roll up only the sales of signed-in customers", async () => {
    sqlite.exec(`
      insert into order_item (id, order_id, quantity) values
        ('i-1', 'o-1', 2), ('i-2', 'o-1', 1), ('i-3', 'o-3', 1), ('i-4', 'o-4', 5), ('i-5', 'o-guest', 4);
    `)

    const [[total], [rollup], [averageProductsPerOrder]] = await Promise.all([
      getAdminCustomerTotalCountQuery(),
      getAdminCustomerOrderRollupStatsQuery(),
      getAverageProductsPerOrderQuery(),
    ])

    expect(total).toStrictEqual({ count: 4 })
    expect(rollup).toStrictEqual({ averageLtv: 15_000, customersWithOrders: 3, repeatCustomers: 1 })
    expect(averageProductsPerOrder).toStrictEqual({ value: 2 })
  })
})
