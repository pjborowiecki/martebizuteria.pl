import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid", async () => {
  const { createColumnHelper, useTable } = await import("@tanstack/react-table")
  const { dataGridFeatures } = await import("~/src/presentation/components/custom/datagrid/lib/data-grid.features")
  const helper = createColumnHelper<typeof dataGridFeatures, { id: string; minPrice: number }>()
  const columns = helper.columns([helper.accessor("minPrice", { header: "Price", id: PRODUCT_TABLE_COLUMN_ID.minPrice })])

  return {
    productsDataGrid: {
      useDataGrid: () => ({
        table: useTable({
          columns,
          data: [{ id: "product-1", minPrice: 12_000 }],
          features: dataGridFeatures,
          getRowId: (row) => row.id,
        }),
      }),
    },
  }
})

import { ProductsPriceColumnFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-price-column-filter"

const Harness = (): JSX.Element => <ProductsPriceColumnFilter />

const trigger = () => screen.getByRole("button", { name: "Filter by price" })

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(cleanup)

describe("ProductsPriceColumnFilter", () => {
  it("labels the trigger with the price column name", () => {
    renderWithProviders(<Harness />)

    expect(trigger().textContent).toBe("Price")
  })

  it("keeps the filter form closed until the trigger is pressed", () => {
    renderWithProviders(<Harness />)

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
  })

  it("asks for an amount of money rather than a quantity", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())

    expect(screen.getByLabelText("Amount")).toBeInTheDocument()
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

  it("offers every comparison the numeric filter supports", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole("combobox"))

    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "At least",
      "More than",
      "Exactly",
      "Less than",
      "At most",
      "Between",
    ])
  })

  it("filters the price column by an amount in the store currency", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())
    await userEvent.type(screen.getByLabelText("Amount"), "120")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(trigger().textContent).toBe("≥ 120.00")
  })

  it("clears the price filter again", async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(trigger())
    await userEvent.type(screen.getByLabelText("Amount"), "120")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(trigger().textContent).toBe("Price")
  })
})
