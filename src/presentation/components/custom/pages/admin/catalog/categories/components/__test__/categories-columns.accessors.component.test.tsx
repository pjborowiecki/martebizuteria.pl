import { type JSX } from "react"

import { type Table, useTable } from "@tanstack/react-table"
import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-reorder-cell", () => ({
  CategoryReorderCell: () => <span>drag</span>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-row-actions", () => ({
  CategoriesRowActions: () => <span>row actions</span>,
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt }: { readonly alt: string }) => <img alt={alt} src="thumb.webp" />,
}))

import { useCategoryColumns } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-columns"

type CategoryRow = ProductCategory["adminListItem"]

const EPOCH = new Date("2026-01-15T10:00:00.000Z")

const localized = (english: string, polish: string) => ({ "en-US": english, "pl-PL": polish })

const category = (overrides: Partial<CategoryRow> = {}): CategoryRow => ({
  createdAt: EPOCH,
  descriptions: localized("Rings cast in gold.", "Pierscienie ze zlota."),
  handle: "rings",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: "category-0",
  parentTitles: localized("Jewelry", "Bizuteria"),
  productCount: 7,
  rank: 1,
  shortDescriptions: localized("Gold rings", "Zlote pierscienie"),
  status: "active",
  subtitles: localized("Every ring", "Kazdy pierscien"),
  titles: localized("Rings", "Pierscienie"),
  updatedAt: EPOCH,
  ...overrides,
})

const ROWS: CategoryRow[] = [
  category(),
  category({
    descriptions: null,
    handle: "necklaces",
    id: "category-2",
    parentId: null,
    parentTitles: undefined,
    shortDescriptions: null,
    subtitles: null,
    titles: localized("", "Naszyjniki"),
  }),
]

const AccessorProbe = ({ onReady }: Readonly<{ onReady: (table: Table<DataGridFeatures, CategoryRow>) => void }>): JSX.Element => {
  const columns = useCategoryColumns()
  const table = useTable<DataGridFeatures, CategoryRow>({
    columns,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  onReady(table)

  return <span>ready</span>
}

const renderTable = (): Table<DataGridFeatures, CategoryRow> => {
  const seen: { table?: Table<DataGridFeatures, CategoryRow> } = {}
  renderWithProviders(
    <AccessorProbe
      onReady={(table) => {
        seen.table = table
      }}
    />,
  )

  const { table } = seen
  if (table === undefined) {
    throw new Error("expected the probe to build a table")
  }

  return table
}

afterEach(cleanup)

describe("category column accessors", () => {
  it("sorts and searches on the localized title", () => {
    expect(renderTable().getRow("category-1").getValue("title")).toBe("Rings")
  })

  it("falls back to the default locale title when the admin locale has none", () => {
    expect(renderTable().getRow("category-2").getValue("title")).toBe("Naszyjniki")
  })

  it("exposes the record id as its own searchable value", () => {
    expect(renderTable().getRow("category-1").getValue("recordId")).toBe("category-1")
  })

  it("exposes the localized parent title", () => {
    expect(renderTable().getRow("category-1").getValue("parent")).toBe("Jewelry")
  })

  it("treats a root category as having no parent value", () => {
    expect(renderTable().getRow("category-2").getValue("parent")).toBe("")
  })

  it("exposes the localized subtitle and both descriptions", () => {
    const table = renderTable()
    const row = table.getRow("category-1")

    expect(row.getValue("subtitle")).toBe("Every ring")
    expect(row.getValue("shortDescription")).toBe("Gold rings")
    expect(row.getValue("description")).toBe("Rings cast in gold.")
  })

  it("reports empty text for a category that carries none", () => {
    const row = renderTable().getRow("category-2")

    expect(row.getValue("subtitle")).toBe("")
    expect(row.getValue("shortDescription")).toBe("")
    expect(row.getValue("description")).toBe("")
  })

  it("sorts categories by their localized title", () => {
    const table = renderTable()
    table.getColumn("title")?.toggleSorting(false)

    expect(table.getSortedRowModel().rows.map((row) => row.id)).toStrictEqual(["category-2", "category-1"])
  })
})
