import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type User } from "~/src/modules/user/user.types"

const validated = vi.hoisted((): { parse?: (input: unknown) => unknown } => ({}))

const access = vi.hoisted(() => ({ filteredList: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/user/user.accessors", () => ({ getAdminCustomersFilteredList: access.filteredList }))
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

import { exportAdminCustomers } from "~/src/modules/user/use-cases/export-admin-customers"

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

const listResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  addresses: [],
  orderStats: [],
  rows: [userRow()],
  ...overrides,
})

const requestedParams = () => access.filteredList.mock.lastCall

const exportRows = (input: Record<string, unknown> = {}) => exportAdminCustomers({ data: input })

beforeEach(() => {
  vi.clearAllMocks()
  access.filteredList.mockResolvedValue(listResult())
})

describe("exportAdminCustomers filters", () => {
  it("reads the whole filtered list rather than one page", async () => {
    await exportRows()

    expect(requestedParams()?.[0]).toStrictEqual({
      filters: {
        averageOrderValue: undefined,
        banned: undefined,
        createdAt: undefined,
        emailVerified: undefined,
        lastOrderAt: undefined,
        role: undefined,
        totalSpent: undefined,
      },
      search: undefined,
      statFilter: undefined,
    })
  })

  it("passes every column filter straight through", async () => {
    await exportRows({ banned: true, emailVerified: false, role: "admin", statFilter: "banned" })

    expect(requestedParams()?.[0]).toMatchObject({
      filters: { banned: true, emailVerified: false, role: "admin" },
      statFilter: "banned",
    })
  })

  it("carries the numeric spend filters through", async () => {
    await exportRows({ totalSpent: { amountMinorUnits: 10_000, operator: "gte" } })

    expect(requestedParams()?.[0]).toMatchObject({ filters: { totalSpent: { amountMinorUnits: 10_000, operator: "gte" } } })
  })

  it("trims the search term", async () => {
    await exportRows({ search: "  anna  " })

    expect(requestedParams()?.[0]).toMatchObject({ search: "anna" })
  })

  it("drops a search term that is only whitespace", async () => {
    await exportRows({ search: "   " })

    expect(requestedParams()?.[0]).toMatchObject({ search: undefined })
  })
})

describe("exportAdminCustomers rows", () => {
  it("starts a customer with no orders at zero", async () => {
    const rows = await exportRows()

    expect(rows[0]).toMatchObject({ averageOrderValue: 0, orderCount: 0, totalSpent: 0 })
  })

  it("attaches the order stats that belong to the row", async () => {
    access.filteredList.mockResolvedValue(
      listResult({ orderStats: [{ lastOrderAt: ORDER_AT, orderCount: 4, totalSpent: 48_000, userId: "customer-1" }] }),
    )

    const rows = await exportRows()

    expect(rows[0]).toMatchObject({ averageOrderValue: 12_000, lastOrderAt: ORDER_AT, orderCount: 4, totalSpent: 48_000 })
  })

  it("attaches the default address of the row", async () => {
    access.filteredList.mockResolvedValue(
      listResult({ addresses: [{ city: "Warszawa", countryCode: "PL", province: "Mazowieckie", userId: "customer-1" }] }),
    )

    const rows = await exportRows()

    expect(rows[0]).toMatchObject({ city: "Warszawa", countryCode: "PL", province: "Mazowieckie" })
  })

  it("ignores address rows that belong to nobody", async () => {
    access.filteredList.mockResolvedValue(
      listResult({ addresses: [{ city: "Warszawa", countryCode: "PL", province: null, userId: null }] }),
    )

    const rows = await exportRows()

    expect(rows[0]?.city).toBeUndefined()
  })

  it("keeps the stored user columns on every exported row", async () => {
    const rows = await exportRows()

    expect(rows[0]).toMatchObject({ email: "anna@example.com", id: "customer-1", name: "Anna Kowalska" })
  })

  it("exports one row per customer in the order the list returns them", async () => {
    access.filteredList.mockResolvedValue(
      listResult({ rows: [userRow(), userRow({ email: "beata@example.com", id: "customer-2", name: "Beata Nowak" })] }),
    )

    const rows = await exportRows()

    expect(rows.map((row) => row.id)).toStrictEqual(["customer-1", "customer-2"])
  })

  it("exports nothing when the filters match no customer", async () => {
    access.filteredList.mockResolvedValue(listResult({ rows: [] }))

    await expect(exportRows()).resolves.toStrictEqual([])
  })
})

describe("exportAdminCustomers input validation", () => {
  it("accepts an empty filter set", () => {
    expect(validated.parse?.({})).toStrictEqual({})
  })

  it("rejects a role the store does not define", () => {
    expect(() => validated.parse?.({ role: "superuser" })).toThrow()
  })

  it("rejects a stat filter the list does not offer", () => {
    expect(() => validated.parse?.({ statFilter: "vip" })).toThrow()
  })
})
