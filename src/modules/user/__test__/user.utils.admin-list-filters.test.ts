import { describe, expect, it } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { DATE_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { adminCustomersListFiltersNeedOrderRollup, parseAdminCustomersListFilters } from "~/src/modules/user/user.utils"

const numeric = { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE }

const dateFilter = { date: "2024-06-01", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER }

describe("parseAdminCustomersListFilters", () => {
  it("is empty when the table has no filters", () => {
    expect(parseAdminCustomersListFilters([])).toStrictEqual({})
  })

  it("ignores a column the server cannot filter on", () => {
    expect(parseAdminCustomersListFilters([{ id: "customer", value: "anna" }])).toStrictEqual({})
  })

  it("accepts the two known roles and rejects anything else", () => {
    expect(parseAdminCustomersListFilters([{ id: "role", value: ROLES.ADMIN }])).toStrictEqual({ role: ROLES.ADMIN })
    expect(parseAdminCustomersListFilters([{ id: "role", value: "superuser" }])).toStrictEqual({})
    expect(parseAdminCustomersListFilters([{ id: "role", value: 1 }])).toStrictEqual({})
  })

  it.each([["emailVerified"], ["banned"]])("accepts a boolean %s filter only", (id) => {
    expect(parseAdminCustomersListFilters([{ id, value: true }])).toStrictEqual({ [id]: true })
    expect(parseAdminCustomersListFilters([{ id, value: false }])).toStrictEqual({ [id]: false })
    expect(parseAdminCustomersListFilters([{ id, value: "yes" }])).toStrictEqual({})
  })

  it.each([["totalSpent"], ["averageOrderValue"]])("accepts a well formed numeric %s filter only", (id) => {
    expect(parseAdminCustomersListFilters([{ id, value: numeric }])).toStrictEqual({ [id]: numeric })
    expect(parseAdminCustomersListFilters([{ id, value: { operator: "gte" } }])).toStrictEqual({})
  })

  it.each([["lastOrderAt"], ["createdAt"]])("accepts a well formed date %s filter only", (id) => {
    expect(parseAdminCustomersListFilters([{ id, value: dateFilter }])).toStrictEqual({ [id]: dateFilter })
    expect(parseAdminCustomersListFilters([{ id, value: { date: "2024-02-30", operator: "on" } }])).toStrictEqual({})
  })

  it("collects several filters at once", () => {
    expect(
      parseAdminCustomersListFilters([
        { id: "role", value: ROLES.CUSTOMER },
        { id: "banned", value: false },
        { id: "totalSpent", value: numeric },
      ]),
    ).toStrictEqual({ banned: false, role: ROLES.CUSTOMER, totalSpent: numeric })
  })

  it("lets the last filter for a column win", () => {
    expect(
      parseAdminCustomersListFilters([
        { id: "role", value: ROLES.ADMIN },
        { id: "role", value: ROLES.CUSTOMER },
      ]),
    ).toStrictEqual({ role: ROLES.CUSTOMER })
  })
})

describe("adminCustomersListFiltersNeedOrderRollup", () => {
  it.each([["totalSpent"], ["averageOrderValue"]])("needs the order rollup for the %s filter", (id) => {
    expect(adminCustomersListFiltersNeedOrderRollup(parseAdminCustomersListFilters([{ id, value: numeric }]))).toBe(true)
  })

  it("needs the order rollup for the last order date filter", () => {
    expect(adminCustomersListFiltersNeedOrderRollup({ lastOrderAt: dateFilter })).toBe(true)
  })

  it("skips the order rollup for filters that live on the user row", () => {
    expect(adminCustomersListFiltersNeedOrderRollup({ banned: false, createdAt: dateFilter, role: ROLES.ADMIN })).toBe(false)
    expect(adminCustomersListFiltersNeedOrderRollup({})).toBe(false)
  })
})
