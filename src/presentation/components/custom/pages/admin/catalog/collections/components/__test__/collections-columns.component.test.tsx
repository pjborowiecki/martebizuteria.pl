import { type JSX } from "react"

import { useTable } from "@tanstack/react-table"
import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COLLECTION_TABLE_COLUMN_SIZE } from "~/src/modules/product-collection/product-collection.constants"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { useCollectionColumns } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-columns"

import { type CollectionRow, type CollectionsTable, collectionRow } from "./collections-grid-harness"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-row-actions", () => ({
  CollectionsRowActions: () => <span>row actions</span>,
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

const ROWS: CollectionRow[] = [
  collectionRow({
    descriptions: { "en-US": "The freshest pieces", "pl-PL": "Najnowsze wzory" },
    handle: "new-arrivals",
    id: "collection-1",
    productCount: 4,
    status: "active",
    titles: { "en-US": "New arrivals", "pl-PL": "Nowosci" },
  }),
  collectionRow({
    descriptions: null,
    handle: "sale",
    id: "collection-2",
    productCount: 0,
    status: "draft",
    titles: { "en-US": "", "pl-PL": "Wyprzedaz" },
  }),
]

const Probe = ({ onReady }: Readonly<{ onReady: (table: CollectionsTable) => void }>): JSX.Element => {
  const columns = useCollectionColumns()
  const table = useTable<DataGridFeatures, CollectionRow>({
    columns,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  onReady(table)

  return <span>ready</span>
}

const renderColumns = () => {
  const seen: { table?: CollectionsTable } = {}

  renderWithProviders(
    <Probe
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

const columnById = (table: CollectionsTable, columnId: string) => {
  const column = table.getColumn(columnId)
  if (column === undefined) {
    throw new Error(`expected a column named ${columnId}`)
  }

  return column
}

describe("useCollectionColumns", () => {
  afterEach(() => {
    cleanup()
  })

  it("lays the admin table out from selection to row actions", () => {
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
      "productCount",
      "description",
      "createdAt",
      "editedAt",
      "actions",
    ])
  })

  it("translates the visible headers", () => {
    const table = renderColumns()

    expect(columnById(table, "title").columnDef.header).toBe("Collection")
    expect(columnById(table, "status").columnDef.header).toBe("Status")
    expect(columnById(table, "productCount").columnDef.header).toBe("Products")
    expect(columnById(table, "description").columnDef.header).toBe("Description")
    expect(columnById(table, "recordId").columnDef.header).toBe("ID")
  })

  it("sorts and searches the localized collection title", () => {
    const table = renderColumns()

    expect(table.getRow("collection-1").getValue("title")).toBe("New arrivals")
  })

  it("falls back to the default locale title when the admin locale has none", () => {
    const table = renderColumns()

    expect(table.getRow("collection-2").getValue("title")).toBe("Wyprzedaz")
  })

  it("exposes the localized description and treats a missing one as empty", () => {
    const table = renderColumns()

    expect(table.getRow("collection-1").getValue("description")).toBe("The freshest pieces")
    expect(table.getRow("collection-2").getValue("description")).toBe("")
  })

  it("locks the utility columns to their design width", () => {
    const table = renderColumns()

    for (const [columnId, size] of [
      ["drag", COLLECTION_TABLE_COLUMN_SIZE.drag],
      ["image", COLLECTION_TABLE_COLUMN_SIZE.image],
      ["actions", COLLECTION_TABLE_COLUMN_SIZE.actions],
    ] as const) {
      const column = columnById(table, columnId)

      expect(column.getCanResize()).toBe(false)
      expect(column.columnDef.size).toBe(size)
    }
  })

  it("lets the description soak up the remaining table width", () => {
    expect(columnById(renderColumns(), "description").columnDef.meta?.fillsRemainingWidth).toBe(true)
  })

  it("keeps the drag handle and the row actions out of the row click and out of the column menu", () => {
    const table = renderColumns()

    for (const columnId of ["drag", "actions"]) {
      const column = columnById(table, columnId)

      expect(column.columnDef.meta?.preventRowClick).toBe(true)
      expect(column.getCanHide()).toBe(false)
      expect(column.getCanSort()).toBe(false)
    }
  })

  it("filters the table by an exact status", () => {
    const table = renderColumns()
    columnById(table, "status").setFilterValue("draft")

    expect(table.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["collection-2"])
  })

  it("sorts by the product count as a number", () => {
    const table = renderColumns()
    columnById(table, "productCount").toggleSorting(true)

    expect(table.getSortedRowModel().rows.map((row) => row.getValue("productCount"))).toStrictEqual([4, 0])
  })
})
