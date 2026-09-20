import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import { dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

const features = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })
const columnHelper = createColumnHelper<typeof features, { id: string; title: string; price: number }>()
const columns = columnHelper.columns([
  columnHelper.accessor("id", {}),
  columnHelper.accessor("title", {}),
  columnHelper.accessor("price", {}),
])
const data = [
  { id: "silver-ring", price: 200, title: "Silver ring" },
  { id: "gold-ring", price: 400, title: "Gold ring" },
  { id: "silver-chain", price: 100, title: "Silver chain" },
]

describe("admin data grid features", () => {
  it("filters and sorts before paginating the client catalog", () => {
    const table = constructTable({ columns, data, features, globalFilterFn: "includesString" })

    table.setGlobalFilter("silver")
    table.setSorting([{ desc: false, id: "price" }])
    table.setPageSize(1)

    expect(table.getRowModel().rows.map((row) => row.original.id)).toStrictEqual(["silver-chain"])
    expect(table.getPageCount()).toBe(2)

    table.nextPage()
    expect(table.getRowModel().rows.map((row) => row.original.id)).toStrictEqual(["silver-ring"])

    table.setGlobalFilter("")
    table.getColumn("price")?.setFilterValue([150, 450])
    expect(table.getFilteredRowModel().rows.map((row) => row.original.id)).toStrictEqual(["silver-ring", "gold-ring"])
  })

  it("keeps column layout and resize state in the native table", () => {
    const table = constructTable({ columns, data, features })
    const title = table.getColumn("title")

    table.setColumnOrder(["price", "id", "title"])
    table.getColumn("id")?.pin("start")
    title?.pin("end")
    table.getColumn("price")?.toggleVisibility(false)
    table.setColumnSizing({ title: 240 })

    const [firstRow] = table.getRowModel().rows
    if (firstRow === undefined) {
      throw new Error("expected a first row in the table row model")
    }

    expect(firstRow.getVisibleCells().map((cell) => cell.column.id)).toStrictEqual(["id", "title"])
    expect(title?.getSize()).toBe(240)

    table.setColumnResizing((state) => ({ ...state, isResizingColumn: "title", startSize: 240 }))
    expect(title?.getIsResizing()).toBe(true)
    table.resetHeaderSizeInfo(true)
    expect(title?.getIsResizing()).toBe(false)
    expect(title?.getSize()).toBe(240)
  })

  it("selects individual rows and the complete page", () => {
    const table = constructTable({ columns, data, features })

    const [firstRow] = table.getRowModel().rows
    if (firstRow === undefined) {
      throw new Error("expected a first row in the table row model")
    }

    firstRow.toggleSelected(true)
    expect(table.getIsSomePageRowsSelected()).toBe(true)
    expect(table.getIsAllPageRowsSelected()).toBe(false)
    table.toggleAllPageRowsSelected(true)
    expect(table.getIsAllPageRowsSelected()).toBe(true)

    table.toggleAllPageRowsSelected(false)
    expect(table.getIsSomePageRowsSelected()).toBe(false)
  })

  it("preserves the server page and order when filtering, sorting, and pagination are manual", () => {
    const table = constructTable({
      columns,
      data,
      features,
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
      rowCount: 100,
    })

    table.setGlobalFilter("missing product")
    table.setSorting([{ desc: true, id: "price" }])
    table.setPageSize(10)
    table.setPageIndex(2)

    expect(table.getRowModel().rows.map((row) => row.original.id)).toStrictEqual(data.map((row) => row.id))
    expect(table.getPageCount()).toBe(10)
    expect(table.atoms.pagination.get()).toStrictEqual({ pageIndex: 2, pageSize: 10 })
  })
})
