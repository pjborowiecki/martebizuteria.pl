import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

const validated = vi.hoisted((): { parse?: (input: unknown) => unknown } => ({}))

const access = vi.hoisted(() => ({ customersPage: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/user/user.accessors", () => ({ getAdminCustomersPage: access.customersPage }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler(options),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        validated.parse = validate

        return builder
      },
    }

    return builder
  },
}))

import { getAdminCustomersPage, getAdminCustomersPageQuery } from "~/src/modules/user/use-cases/get-admin-customers-page"

const CREATED_AT = new Date("2024-02-03T08:00:00.000Z")

const ORDER_AT = new Date("2025-08-01T08:00:00.000Z")

const userRow = (overrides: Partial<User["select"]> = {}): User["select"] => ({
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: CREATED_AT,
  email: "anna@example.com",
  emailVerified: true,
  id: "customer-1",
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  phone: null,
  role: "customer",
  stripeCustomerId: null,
  timezone: null,
  twoFactorEnabled: false,
  updatedAt: CREATED_AT,
  ...overrides,
})

const pageResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  addresses: [],
  orderStats: [],
  rows: [userRow()],
  total: 1,
  ...overrides,
})

const listedParams = () => access.customersPage.mock.lastCall

const page = (input: Record<string, unknown> = {}) => getAdminCustomersPage({ data: input })

beforeEach(() => {
  vi.clearAllMocks()
  access.customersPage.mockResolvedValue(pageResult())
})

describe("getAdminCustomersPage paging", () => {
  it("asks for the first page with the admin page size by default", async () => {
    await page()

    expect(listedParams()?.[0]).toMatchObject({ limit: ADMIN_CUSTOMER_PAGE_SIZE, offset: 0 })
  })

  it("turns a page number into an offset", async () => {
    await page({ page: 3 })

    expect(listedParams()?.[0]).toMatchObject({ limit: ADMIN_CUSTOMER_PAGE_SIZE, offset: ADMIN_CUSTOMER_PAGE_SIZE * 2 })
  })

  it("honours a caller supplied page size", async () => {
    await page({ page: 2, pageSize: 10 })

    expect(listedParams()?.[0]).toMatchObject({ limit: 10, offset: 10 })
  })

  it("never asks for a page before the first", async () => {
    await page({ page: 0 })

    expect(listedParams()?.[0]).toMatchObject({ offset: 0 })
  })

  it("reports the window it read back to the caller", async () => {
    access.customersPage.mockResolvedValue(pageResult({ total: 40 }))

    const result = await page({ page: 2, pageSize: 10 })

    expect(result.limit).toBe(10)
    expect(result.offset).toBe(10)
    expect(result.total).toBe(40)
  })

  it("flags that more customers remain beyond the page", async () => {
    access.customersPage.mockResolvedValue(pageResult({ total: 40 }))

    await expect(page()).resolves.toMatchObject({ hasMore: true })
  })

  it("flags the last page as complete", async () => {
    await expect(page()).resolves.toMatchObject({ hasMore: false })
  })
})

describe("getAdminCustomersPage filters", () => {
  it("passes every column filter straight through", async () => {
    await page({ banned: true, emailVerified: false, role: "admin", statFilter: "banned" })

    expect(listedParams()?.[0]).toMatchObject({
      filters: { banned: true, emailVerified: false, role: "admin" },
      statFilter: "banned",
    })
  })

  it("trims the search term", async () => {
    await page({ search: "  anna  " })

    expect(listedParams()?.[0]).toMatchObject({ search: "anna" })
  })

  it("drops a search term that is only whitespace", async () => {
    await page({ search: "   " })

    expect(listedParams()?.[0]).toMatchObject({ search: undefined })
  })
})

describe("getAdminCustomersPage rows", () => {
  it("starts a customer with no orders at zero", async () => {
    const result = await page()

    expect(result.items[0]).toMatchObject({ averageOrderValue: 0, orderCount: 0, totalSpent: 0 })
  })

  it("attaches the order stats that belong to the row", async () => {
    access.customersPage.mockResolvedValue(
      pageResult({ orderStats: [{ lastOrderAt: ORDER_AT, orderCount: 4, totalSpent: 48_000, userId: "customer-1" }] }),
    )

    const result = await page()

    expect(result.items[0]).toMatchObject({ averageOrderValue: 12_000, lastOrderAt: ORDER_AT, orderCount: 4, totalSpent: 48_000 })
  })

  it("attaches the default address of the row", async () => {
    access.customersPage.mockResolvedValue(
      pageResult({ addresses: [{ city: "Warszawa", countryCode: "PL", province: null, userId: "customer-1" }] }),
    )

    const result = await page()

    expect(result.items[0]).toMatchObject({ city: "Warszawa", countryCode: "PL", province: undefined })
  })

  it("ignores address rows that belong to nobody", async () => {
    access.customersPage.mockResolvedValue(
      pageResult({ addresses: [{ city: "Warszawa", countryCode: "PL", province: null, userId: null }] }),
    )

    const result = await page()

    expect(result.items[0]?.city).toBeUndefined()
  })

  it("keeps the stored user columns on every row", async () => {
    const result = await page()

    expect(result.items[0]).toMatchObject({ email: "anna@example.com", id: "customer-1", name: "Anna Kowalska" })
  })
})

describe("getAdminCustomersPage input validation", () => {
  it("accepts an empty filter set", () => {
    expect(validated.parse?.({})).toStrictEqual({})
  })

  it("rejects a role the store does not define", () => {
    expect(() => validated.parse?.({ role: "superuser" })).toThrow()
  })

  it("rejects a page that is not a number", () => {
    expect(() => validated.parse?.({ page: "two" })).toThrow()
  })
})

describe("getAdminCustomersPageQuery", () => {
  it("keys the page by its whole input", () => {
    const options = getAdminCustomersPageQuery({ page: 2, search: "anna" })

    expect(options.queryKey).toStrictEqual([...USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE, { page: 2, search: "anna" }])
    expect(options.staleTime).toBe(ADMIN_CUSTOMER_QUERY_STALE_MS)
  })

  it("does not refetch on mount or focus", () => {
    const options = getAdminCustomersPageQuery({})

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

it("loads the requested customer page through its cache query", async () => {
  await expect(new QueryClient().query(getAdminCustomersPageQuery({ page: 2, pageSize: 10 }))).resolves.toMatchObject({ total: 1 })
  expect(access.customersPage).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 10 }))
})
