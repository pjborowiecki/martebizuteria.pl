import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid", async () => {
  const { createColumnHelper, useTable } = await import("@tanstack/react-table")
  const { dataGridFeatures } = await import("~/src/presentation/components/custom/datagrid/lib/data-grid.features")
  const helper = createColumnHelper<typeof dataGridFeatures, { id: string; stock: number }>()
  const columns = helper.columns([helper.accessor("stock", { header: "Stock", id: PRODUCT_TABLE_COLUMN_ID.stock })])

  return {
    productsDataGrid: {
      useDataGrid: () => ({
        table: useTable({
          columns,
          data: [{ id: "product-1", stock: 4 }],
          features: dataGridFeatures,
          getRowId: (row) => row.id,
        }),
      }),
    },
  }
})

import { ProductsStockColumnFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-stock-column-filter"

const Harness = (): JSX.Element => <ProductsStockColumnFilter />

const trigger = () => screen.getByRole("button", { name: "Filter by stock" })

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(cleanup)

describe("ProductsStockColumnFilter", () => {
  it("labels the trigger with the stock column name", () => {
    renderWithProviders(<Harness />)

    expect(trigger().textContent).toBe("Stock")
  })

  it("keeps the filter form closed until the trigger is pressed", () => {
    renderWithProviders(<Harness />)

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
  })

  it("asks for a quantity rather than an amount of money", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())

    expect(screen.getByLabelText("Quantity")).toBeInTheDocument()
  })

  it("titles the comparison control with the shared numeric copy", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())

    expect(screen.getByText("Condition")).toBeInTheDocument()
  })

  it("names the default comparison in the shop language", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())

    expect(screen.getByRole("combobox").textContent).toContain("At least")
  })

  it("filters the stock column by whole units", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())
    await userEvent.type(screen.getByLabelText("Quantity"), "3")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(trigger().textContent).toBe("≥ 3")
  })
})
