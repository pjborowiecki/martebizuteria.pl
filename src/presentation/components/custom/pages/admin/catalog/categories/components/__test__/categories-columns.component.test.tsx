import { type JSX } from "react"

import { flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path.replace(/^\//u, "")}`,
  getBaseURL: () => "https://marte.test/",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) =>
    pathOrUrl.startsWith("https://") ? pathOrUrl : `https://assets.test/${pathOrUrl.replace(/^\//u, "")}`,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-reorder-cell", () => ({
  CategoryReorderCell: ({ id }: Readonly<{ id: string }>) => <span>{`drag ${id}`}</span>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-row-actions", () => ({
  CategoriesRowActions: () => <span>row actions</span>,
}))

import { useCategoryColumns } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-columns"

type CategoryRow = ProductCategory["adminListItem"]

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z")

const localized = (english: string, polish: string) => ({ "en-US": english, "pl-PL": polish })

const category = (overrides: Partial<CategoryRow> = {}): CategoryRow => ({
  createdAt: CREATED_AT,
  descriptions: localized("Rings cast in gold.", "Pierścienie ze złota."),
  handle: "rings",
  id: "category-1",
  image: "categories/rings.webp",
  metadata: null,
  parentId: "category-0",
  parentTitles: localized("Jewelry", "Biżuteria"),
  productCount: 7,
  rank: 1,
  shortDescriptions: localized("Gold rings", "Złote pierścienie"),
  status: "active",
  subtitles: localized("Every ring", "Każdy pierścień"),
  titles: localized("Rings", "Pierścienie"),
  updatedAt: new Date("2026-02-20T10:00:00.000Z"),
  ...overrides,
})

const ColumnsProbe = ({ row }: Readonly<{ row: CategoryRow }>): JSX.Element => {
  const columns = useCategoryColumns()
  const table = useTable<DataGridFeatures, CategoryRow>({
    columns,
    data: [row],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  const [headerGroup] = table.getHeaderGroups()
  const [tableRow] = table.getRowModel().rows

  return (
    <div>
      <div>
        {headerGroup?.headers.map((header) => (
          <span key={header.id} data-testid={`head-${header.column.id}`}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
        ))}
      </div>
      <div>
        {tableRow?.getVisibleCells().map((visibleCell) => (
          <span key={visibleCell.id} data-testid={`cell-${visibleCell.column.id}`}>
            {flexRender(visibleCell.column.columnDef.cell, visibleCell.getContext())}
          </span>
        ))}
      </div>
    </div>
  )
}

const renderColumns = (overrides: Partial<CategoryRow> = {}): void => {
  renderWithProviders(<ColumnsProbe row={category(overrides)} />)
}

const cell = (id: string): HTMLElement => screen.getByTestId(`cell-${id}`)

afterEach(() => {
  cleanup()
})

describe("useCategoryColumns headers", () => {
  it("translates the category headers", () => {
    renderColumns()

    expect(screen.getByTestId("head-title")).toHaveTextContent("Category")
    expect(screen.getByTestId("head-parent")).toHaveTextContent("Parent category")
    expect(screen.getByTestId("head-status")).toHaveTextContent("Status")
  })
})

describe("useCategoryColumns cells", () => {
  it("renders the localized title with its handle", () => {
    renderColumns()

    expect(cell("title")).toHaveTextContent("Rings")
    expect(cell("title")).toHaveTextContent("rings")
  })

  it("renders the record id verbatim", () => {
    renderColumns()

    expect(cell("recordId")).toHaveTextContent("category-1")
  })

  it("labels an active category with the active badge", () => {
    renderColumns()

    expect(cell("status")).toHaveTextContent("Active")
  })

  it("labels a draft category with the draft badge", () => {
    renderColumns({ status: "draft" })

    expect(cell("status")).toHaveTextContent("Draft")
  })

  it("renders the parent title for a nested category", () => {
    renderColumns()

    expect(cell("parent")).toHaveTextContent("Jewelry")
  })

  it("renders a dash for a root category", () => {
    renderColumns({ parentTitles: undefined })

    expect(cell("parent")).toHaveTextContent("—")
  })

  it("renders the localized subtitle and descriptions", () => {
    renderColumns()

    expect(cell("subtitle")).toHaveTextContent("Every ring")
    expect(cell("shortDescription")).toHaveTextContent("Gold rings")
    expect(cell("description")).toHaveTextContent("Rings cast in gold.")
  })

  it("renders the product count", () => {
    renderColumns()

    expect(cell("productCount")).toHaveTextContent("7")
  })

  it("formats both timestamps", () => {
    renderColumns()

    expect(cell("createdAt")).toHaveTextContent("Jan 15, 2026")
    expect(cell("editedAt")).toHaveTextContent("Feb 20, 2026")
  })

  it("renders the thumbnail with the category title as its alt text", () => {
    renderColumns()

    expect(screen.getByRole("img", { name: "Rings" })).toBeInTheDocument()
  })

  it("renders no thumbnail image when the category has none", () => {
    renderColumns({ image: null })

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("renders the drag handle for the row it belongs to", () => {
    renderColumns()

    expect(cell("drag")).toHaveTextContent("drag category-1")
  })

  it("renders the row actions in their own column", () => {
    renderColumns()

    expect(cell("actions")).toHaveTextContent("row actions")
  })
})
