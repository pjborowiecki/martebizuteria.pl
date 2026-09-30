import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import {
  createCatalogTableGlobalFilterFn,
  rowMatchesCatalogTableSearch,
} from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
import { dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface CatalogRow {
  readonly id: string
  readonly sku: string | null
  readonly title: string
  readonly totalStock: number
}

const features = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof dataGridFeatures, CatalogRow>()

const columns = columnHelper.columns([columnHelper.accessor("id", {}), columnHelper.accessor("title", {})])

const data: CatalogRow[] = [
  { id: "silver-ring", sku: "SR-1", title: "Silver ring", totalStock: 4 },
  { id: "gold-ring", sku: null, title: "Gold ring", totalStock: 0 },
  { id: "bracelet", sku: "BR-9", title: "Onyx bracelet", totalStock: 12 },
]

const searchableParts = (row: CatalogRow): (string | number | null)[] => [row.title, row.sku, row.totalStock]

const catalogFilterFn = createCatalogTableGlobalFilterFn<CatalogRow>(searchableParts)

const filterIds = (query: unknown): string[] => {
  const table = constructTable({
    columns,
    data,
    features,
    globalFilterFn: catalogFilterFn,
  })
  table.setGlobalFilter(query)

  return table.getFilteredRowModel().rows.map((row) => row.original.id)
}

describe("rowMatchesCatalogTableSearch", () => {
  it.each([[""], ["   "], [null], [undefined], [{}]])("keeps every row for the empty query %j", (filterValue) => {
    expect(rowMatchesCatalogTableSearch(["Silver ring"], filterValue)).toBe(true)
  })

  it("matches case-insensitively across the searchable parts", () => {
    expect(rowMatchesCatalogTableSearch(["Silver ring", "SR-1"], "SILVER")).toBe(true)
    expect(rowMatchesCatalogTableSearch(["Silver ring", "SR-1"], "sr-1")).toBe(true)
  })

  it("matches a substring inside a part", () => {
    expect(rowMatchesCatalogTableSearch(["Onyx bracelet"], "race")).toBe(true)
  })

  it("does not match across the boundary between two parts", () => {
    expect(rowMatchesCatalogTableSearch(["Silver", "ring"], "silverring")).toBe(false)
  })

  it("matches a numeric part", () => {
    expect(rowMatchesCatalogTableSearch(["Silver ring", 12], "12")).toBe(true)
  })

  it("accepts a numeric query", () => {
    expect(rowMatchesCatalogTableSearch(["Silver ring", "SR-1"], 1)).toBe(true)
  })

  it("treats a NaN query as no query", () => {
    expect(rowMatchesCatalogTableSearch(["Silver ring"], Number.NaN)).toBe(true)
  })

  it("reports no match when nothing contains the query", () => {
    expect(rowMatchesCatalogTableSearch(["Silver ring"], "platinum")).toBe(false)
  })
})

describe("createCatalogTableGlobalFilterFn", () => {
  it("keeps every row for an empty query", () => {
    expect(filterIds("")).toHaveLength(data.length)
  })

  it("searches fields the table does not render as columns", () => {
    expect(filterIds("BR-9")).toStrictEqual(["bracelet"])
  })

  it("searches numeric fields", () => {
    expect(filterIds("12")).toStrictEqual(["bracelet"])
  })

  it("matches several rows on a shared term", () => {
    expect(filterIds("ring")).toStrictEqual(["silver-ring", "gold-ring"])
  })

  it("survives a row whose searchable part is null", () => {
    expect(filterIds("gold")).toStrictEqual(["gold-ring"])
  })
})
