import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { hasAdminProductsListColumnFilters, parseAdminProductsListColumnFilters } from "~/src/modules/product/product.admin-list-filters"
import { adminProductsListSortRequiresVariantStats, parseAdminProductsListSort } from "~/src/modules/product/product.admin-list-sort"

const numeric = { amountMinorUnits: 10_000, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GT }

const dateFilter = { date: "2024-06-01", operator: DATE_COLUMN_FILTER_OPERATOR.ON }

describe("parseAdminProductsListColumnFilters", () => {
  it("is empty when the table has no filters", () => {
    expect(parseAdminProductsListColumnFilters([])).toStrictEqual({})
  })

  it("ignores a column the server cannot filter on", () => {
    expect(parseAdminProductsListColumnFilters([{ id: "title", value: "ring" }])).toStrictEqual({})
  })

  it("accepts a well formed price filter only", () => {
    expect(parseAdminProductsListColumnFilters([{ id: "minPrice", value: numeric }])).toStrictEqual({ minPrice: numeric })
    expect(parseAdminProductsListColumnFilters([{ id: "minPrice", value: 10_000 }])).toStrictEqual({})
  })

  it("maps the stock column onto the total stock filter", () => {
    expect(parseAdminProductsListColumnFilters([{ id: "stock", value: numeric }])).toStrictEqual({ totalStock: numeric })
  })

  it("ignores invalid stock filters without discarding a valid price filter", () => {
    expect(
      parseAdminProductsListColumnFilters([
        { id: "minPrice", value: numeric },
        { id: "stock", value: { operator: "gt" } },
      ]),
    ).toStrictEqual({ minPrice: numeric })
  })

  it("accepts a well formed created-at filter only", () => {
    expect(parseAdminProductsListColumnFilters([{ id: "createdAt", value: dateFilter }])).toStrictEqual({ createdAt: dateFilter })
    expect(parseAdminProductsListColumnFilters([{ id: "createdAt", value: { date: "2024-13-01", operator: "on" } }])).toStrictEqual({})
  })
})

describe("hasAdminProductsListColumnFilters", () => {
  it("is false for an empty filter set", () => {
    expect(hasAdminProductsListColumnFilters({})).toBe(false)
  })

  it.each([[{ minPrice: numeric }], [{ totalStock: numeric }], [{ createdAt: dateFilter }]])("is true once %j is set", (filters) => {
    expect(hasAdminProductsListColumnFilters(filters)).toBe(true)
  })
})

describe("parseAdminProductsListSort", () => {
  it("ignores an unsorted table", () => {
    expect(parseAdminProductsListSort([])).toBeUndefined()
  })

  it.each([["title"], ["recordId"], ["status"], ["minPrice"], ["stock"], ["variantKind"], ["createdAt"], ["editedAt"]])(
    "accepts the server sortable column %s",
    (id) => {
      expect(parseAdminProductsListSort([{ desc: true, id }])).toStrictEqual({ columnId: id, desc: true })
    },
  )

  it.each([["category"], ["attributes"], ["sku"], ["handle"]])("declines to sort on %s at the server", (id) => {
    expect(parseAdminProductsListSort([{ desc: false, id }])).toBeUndefined()
  })

  it("uses only the first sort when several are active", () => {
    expect(
      parseAdminProductsListSort([
        { desc: false, id: "title" },
        { desc: true, id: "status" },
      ]),
    ).toStrictEqual({ columnId: "title", desc: false })
  })
})

describe("adminProductsListSortRequiresVariantStats", () => {
  it.each([["minPrice"], ["stock"], ["variantKind"]])("needs the variant rollup to sort on %s", (columnId) => {
    expect(adminProductsListSortRequiresVariantStats({ columnId, desc: false })).toBe(true)
  })

  it.each([["title"], ["status"], ["createdAt"]])("sorts on %s without the variant rollup", (columnId) => {
    expect(adminProductsListSortRequiresVariantStats({ columnId, desc: false })).toBe(false)
  })

  it("needs nothing when the table is unsorted", () => {
    expect(adminProductsListSortRequiresVariantStats(undefined)).toBe(false)
  })
})
