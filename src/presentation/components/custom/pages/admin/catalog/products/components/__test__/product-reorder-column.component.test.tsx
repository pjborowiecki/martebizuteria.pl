import { type JSX } from "react"

import { createColumnHelper, flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_TABLE_COLUMN_ID, PRODUCT_TABLE_COLUMN_SIZE } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-cell", () => ({
  ProductReorderCell: ({ id }: Readonly<{ id: string }>) => <span>handle for {id}</span>,
}))

import { createProductReorderColumn } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-column"

import { productRow } from "./products-grid-harness"

const column = createProductReorderColumn(createColumnHelper<DataGridFeatures, Product["adminListItem"]>())

const ReorderCellProbe = (): JSX.Element => {
  const table = useTable<DataGridFeatures, Product["adminListItem"]>({
    columns: [column],
    data: [productRow({ id: "product-7" })],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  const [row] = table.getRowModel().rows
  const [cell] = row?.getVisibleCells() ?? []

  return <div>{cell === undefined ? undefined : flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
}

afterEach(() => {
  cleanup()
})

describe("createProductReorderColumn", () => {
  it("claims the drag column slot", () => {
    expect(column.id).toBe(PRODUCT_TABLE_COLUMN_ID.drag)
  })

  it("cannot be hidden, sorted or resized", () => {
    expect(column.enableHiding).toBe(false)
    expect(column.enableSorting).toBe(false)
    expect(column.enableResizing).toBe(false)
  })

  it("pins the column to the configured drag width", () => {
    expect(column.size).toBe(PRODUCT_TABLE_COLUMN_SIZE.drag)
    expect(column.minSize).toBe(PRODUCT_TABLE_COLUMN_SIZE.drag)
    expect(column.maxSize).toBe(PRODUCT_TABLE_COLUMN_SIZE.drag)
  })

  it("keeps a click on the handle from opening the row", () => {
    expect(column.meta?.preventRowClick).toBe(true)
  })

  it("renders an icon placeholder while the table loads", () => {
    expect(column.meta?.skeletonVariant).toBe("icon")
  })

  it("centres the handle in its cell", () => {
    expect(column.meta?.cellClassName).toBe("px-1 text-center")
    expect(column.meta?.headClassName).toBe("px-1")
  })
})

describe("product reorder cell", () => {
  it("hands the row id to the drag handle it renders", () => {
    renderWithProviders(<ReorderCellProbe />)

    expect(screen.getByText("handle for product-7")).toBeInTheDocument()
  })
})
