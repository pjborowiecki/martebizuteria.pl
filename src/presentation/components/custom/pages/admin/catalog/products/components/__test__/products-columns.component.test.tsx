import { type JSX } from "react"

import { type Table, flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_TABLE_COLUMN_SIZE } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { useProductColumns } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-columns"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-row-actions", () => ({
  ProductsRowActions: ({ product }: { readonly product: { readonly id: string } }): JSX.Element => <span>actions {product.id}</span>,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-cell", () => ({
  ProductReorderCell: ({ id }: { readonly id: string }): JSX.Element => <span>drag {id}</span>,
}))

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }): JSX.Element => <img alt={alt} src={src} />,
}))

afterEach(cleanup)

type ProductRow = Product["adminListItem"]

type ProductsTable = Table<DataGridFeatures, ProductRow>

const EPOCH = new Date("2026-03-04T10:00:00.000Z")

const productRow = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: "silver-ring",
  id: "product-1",
  inventoryLevel: "ok",
  metadata: null,
  primaryCategoryId: null,
  rank: 0,
  status: "published",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
  totalStock: 4,
  updatedAt: EPOCH,
  variantCount: 2,
  ...overrides,
})

const RICH_ROW = productRow({
  attributeTitles: "Weight, Material",
  categoryTitle: "Rings",
  collectionTitles: "New arrivals",
  minPrice: 24_900,
  skuSummary: "  MA-001  ",
  thumbnail: "https://cdn.test/ring.webp",
})

const BARE_ROW = productRow({
  categoryTitle: "",
  id: "product-2",
  inventoryLevel: "low",
  titles: { "en-US": "", "pl-PL": "Kolczyki" },
  totalStock: 1,
  variantCount: 1,
})

const CellsProbe = ({
  onReady,
  rows,
}: Readonly<{
  onReady: (table: ProductsTable) => void
  rows: readonly ProductRow[]
}>): JSX.Element => {
  const columns = useProductColumns()
  const table = useTable<DataGridFeatures, ProductRow>({
    columns,
    data: [...rows],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  onReady(table)

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr data-testid={`row-${row.id}`} key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td data-testid={`cell-${row.id}-${cell.column.id}`} key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const renderColumns = (rows: readonly ProductRow[] = [RICH_ROW, BARE_ROW]) => {
  const seen: { table?: ProductsTable } = {}

  renderWithProviders(
    <CellsProbe
      onReady={(table) => {
        seen.table = table
      }}
      rows={rows}
    />,
  )

  const { table } = seen
  if (table === undefined) {
    throw new Error("expected the probe to build a table")
  }

  return table
}

const cell = (rowId: string, columnId: string): HTMLElement => screen.getByTestId(`cell-${rowId}-${columnId}`)

const columnById = (table: ProductsTable, columnId: string) => {
  const column = table.getColumn(columnId)
  if (column === undefined) {
    throw new Error(`expected a column named ${columnId}`)
  }

  return column
}

describe("useProductColumns layout", () => {
  it("lays the table out from selection to row actions", () => {
    expect(
      renderColumns()
        .getAllLeafColumns()
        .map((column) => column.id),
    ).toStrictEqual([
      "select",
      "drag",
      "image",
      "title",
      "recordId",
      "status",
      "sku",
      "variantKind",
      "minPrice",
      "stock",
      "category",
      "collection",
      "attributes",
      "createdAt",
      "editedAt",
      "actions",
    ])
  })

  it("translates the visible headers", () => {
    const table = renderColumns()

    expect(columnById(table, "title").columnDef.header).toBe("Product")
    expect(columnById(table, "status").columnDef.header).toBe("Status")
    expect(columnById(table, "sku").columnDef.header).toBe("SKU")
    expect(columnById(table, "variantKind").columnDef.header).toBe("Variants")
    expect(columnById(table, "minPrice").columnDef.header).toBe("Price")
    expect(columnById(table, "stock").columnDef.header).toBe("Stock")
    expect(columnById(table, "category").columnDef.header).toBe("Categories")
    expect(columnById(table, "collection").columnDef.header).toBe("Collections")
    expect(columnById(table, "attributes").columnDef.header).toBe("Attributes")
    expect(columnById(table, "createdAt").columnDef.header).toBe("Created at")
    expect(columnById(table, "editedAt").columnDef.header).toBe("Last edited")
  })

  it("locks the utility columns to their design width", () => {
    const table = renderColumns()

    for (const [columnId, size] of [
      ["drag", PRODUCT_TABLE_COLUMN_SIZE.drag],
      ["image", PRODUCT_TABLE_COLUMN_SIZE.image],
      ["recordId", PRODUCT_TABLE_COLUMN_SIZE.recordId],
      ["actions", PRODUCT_TABLE_COLUMN_SIZE.actions],
    ] as const) {
      const column = columnById(table, columnId)

      expect(column.getCanResize()).toBe(false)
      expect(column.columnDef.size).toBe(size)
    }
  })

  it("lets the attributes column soak up the remaining width", () => {
    expect(columnById(renderColumns(), "attributes").columnDef.meta?.fillsRemainingWidth).toBe(true)
  })

  it("keeps the row actions out of the row click and out of the column menu", () => {
    const column = columnById(renderColumns(), "actions")

    expect(column.columnDef.meta?.preventRowClick).toBe(true)
    expect(column.getCanHide()).toBe(false)
    expect(column.getCanSort()).toBe(false)
  })

  it("labels the row selection controls for assistive technology", () => {
    renderColumns()

    expect(within(cell("product-1", "select")).getByLabelText("Select row")).toBeInTheDocument()
  })

  it("gives the actions column a screen reader header", () => {
    renderColumns()

    expect(screen.getByRole("columnheader", { name: "Row actions" })).toBeInTheDocument()
    expect(screen.getByText("Row actions")).toHaveClass("sr-only")
  })
})

describe("useProductColumns values", () => {
  it("sorts and searches the localized product title", () => {
    const table = renderColumns()

    expect(table.getRow("product-1").getValue("title")).toBe("Silver ring")
  })

  it("falls back to the other locale title when the admin locale has none", () => {
    const table = renderColumns()

    expect(table.getRow("product-2").getValue("title")).toBe("Kolczyki")
  })

  it("filters the table by an exact status", () => {
    const table = renderColumns()
    columnById(table, "status").setFilterValue("draft")

    expect(table.getFilteredRowModel().rows).toHaveLength(0)
  })

  it("filters the table by the derived variant kind", () => {
    const table = renderColumns()
    columnById(table, "variantKind").setFilterValue("single")

    expect(table.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["product-2"])
  })

  it("filters the price column by a numeric range", () => {
    const table = renderColumns()
    columnById(table, "minPrice").setFilterValue({ amountMinorUnits: 1, operator: "gte" })

    expect(table.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["product-1"])
  })

  it("filters the stock column by a numeric comparison", () => {
    const table = renderColumns()
    columnById(table, "stock").setFilterValue({ amountMinorUnits: 2, operator: "lt" })

    expect(table.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["product-2"])
  })

  it("filters the created date column", () => {
    const table = renderColumns()
    columnById(table, "createdAt").setFilterValue({ date: "2020-01-01", operator: "before" })

    expect(table.getFilteredRowModel().rows).toHaveLength(0)
  })
})

describe("useProductColumns cells", () => {
  it("renders the thumbnail with the localized title as its alternative text", () => {
    renderColumns()

    expect(within(cell("product-1", "image")).getByRole("img", { name: "Silver ring" })).toHaveAttribute(
      "src",
      "https://cdn.test/ring.webp",
    )
  })

  it("leaves the image placeholder empty when the product has no thumbnail", () => {
    renderColumns()

    expect(within(cell("product-2", "image")).queryByRole("img")).toBeNull()
  })

  it("shows the title and the handle of the product", () => {
    renderColumns()

    const titleCell = cell("product-1", "title")
    expect(within(titleCell).getByText("Silver ring")).toBeInTheDocument()
    expect(within(titleCell).getByText("/silver-ring")).toBeInTheDocument()
  })

  it("prints the raw record id", () => {
    renderColumns()

    expect(cell("product-1", "recordId")).toHaveTextContent("product-1")
  })

  it("translates the status badge", () => {
    renderColumns([RICH_ROW, productRow({ id: "product-3", status: "draft" }), productRow({ id: "product-4", status: "archived" })])

    expect(cell("product-1", "status")).toHaveTextContent("Active")
    expect(cell("product-3", "status")).toHaveTextContent("Draft")
    expect(cell("product-4", "status")).toHaveTextContent("Archived")
  })

  it("trims the SKU summary and shows a placeholder when there is none", () => {
    renderColumns()

    expect(cell("product-1", "sku")).toHaveTextContent("MA-001")
    expect(cell("product-2", "sku")).toHaveTextContent("—")
  })

  it("names a single variant product and counts a multi variant one", () => {
    renderColumns()

    expect(cell("product-1", "variantKind")).toHaveTextContent("2 variants")
    expect(cell("product-2", "variantKind")).toHaveTextContent("Single variant")
  })

  it("formats the price in store currency and falls back to a placeholder", () => {
    renderColumns()

    expect(cell("product-1", "minPrice").textContent).toContain("249")
    expect(cell("product-2", "minPrice")).toHaveTextContent("—")
  })

  it("prints the total stock and warns about a low level", () => {
    renderColumns()

    expect(cell("product-1", "stock")).toHaveTextContent("4")
    const lowStock = within(cell("product-2", "stock")).getByTitle("Low stock")
    expect(lowStock).toHaveTextContent("1")
  })

  it("colours an out of stock row in red without a tooltip", () => {
    renderColumns([productRow({ inventoryLevel: "out", totalStock: 0 })])

    const stockCell = cell("product-1", "stock")
    expect(within(stockCell).queryByTitle("Low stock")).toBeNull()
    expect(stockCell.firstElementChild).toHaveClass("text-red-500")
  })

  it("shows the category title and a placeholder for an empty one", () => {
    renderColumns()

    expect(cell("product-1", "category")).toHaveTextContent("Rings")
    expect(cell("product-2", "category")).toHaveTextContent("—")
  })

  it("shows a placeholder when the category is missing altogether", () => {
    renderColumns([productRow()])

    expect(cell("product-1", "category")).toHaveTextContent("—")
  })

  it("lists the collections and the attributes of the product", () => {
    renderColumns()

    expect(cell("product-1", "collection")).toHaveTextContent("New arrivals")
    expect(cell("product-1", "attributes")).toHaveTextContent("Weight, Material")
    expect(cell("product-2", "collection")).toHaveTextContent("—")
    expect(cell("product-2", "attributes")).toHaveTextContent("—")
  })

  it("formats both timestamps in the admin locale", () => {
    renderColumns()

    expect(cell("product-1", "createdAt")).toHaveTextContent("Mar 4, 2026")
    expect(cell("product-1", "editedAt")).toHaveTextContent("Mar 4, 2026")
  })

  it("hands each row to the row actions menu", () => {
    renderColumns()

    expect(cell("product-1", "actions")).toHaveTextContent("actions product-1")
  })
})
