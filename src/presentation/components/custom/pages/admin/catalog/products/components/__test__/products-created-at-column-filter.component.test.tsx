import { type JSX } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { matchesDateColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { ProductsCreatedAtColumnFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-created-at-column-filter"
import {
  PRODUCTS_DATA_GRID_KEY,
  productsDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"

type ProductRow = Product["adminListItem"]

const TODAY = new Date(2026, 2, 15, 9, 30)

const productRow = (id: string, createdAt: Date): ProductRow => ({
  createdAt,
  descriptions: null,
  handle: id,
  id,
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
  updatedAt: createdAt,
  variantCount: 1,
})

const ROWS: ProductRow[] = [productRow("older", new Date(2026, 2, 10, 12, 0)), productRow("today", new Date(2026, 2, 15, 8, 0))]

const helper = createColumnHelper<DataGridFeatures, ProductRow>()

const COLUMNS = helper.columns([
  helper.accessor("createdAt", {
    filterFn: matchesDateColumnFilter,
    header: "Created at",
    id: PRODUCT_TABLE_COLUMN_ID.createdAt,
  }),
])

const GridHarness = (): JSX.Element => {
  const table = useTable<DataGridFeatures, ProductRow>({
    columns: COLUMNS,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  const value: DataGridContextValue<ProductRow> = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: PRODUCTS_DATA_GRID_KEY,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search products",
    table,
  }

  return (
    <productsDataGrid.Provider value={value}>
      <ProductsCreatedAtColumnFilter />
      <output data-testid="matching-rows">
        {table
          .getFilteredRowModel()
          .rows.map((row) => row.id)
          .join(",")}
      </output>
    </productsDataGrid.Provider>
  )
}

const trigger = (): HTMLElement => screen.getByRole("button", { name: "Filter by created date" })

const openPopover = (): void => {
  fireEvent.click(trigger())
}

const applyToday = (): void => {
  openPopover()
  fireEvent.click(screen.getByLabelText("Date"))
  fireEvent.click(screen.getByText("Today"))
  fireEvent.click(screen.getByRole("button", { name: "Apply" }))
}

afterEach(cleanup)

describe("ProductsCreatedAtColumnFilter", () => {
  it("labels the idle trigger with the created at column copy", () => {
    renderWithProviders(<GridHarness />)

    expect(trigger()).toHaveTextContent("Created at")
  })

  it("titles the popover after the column and starts on the on operator", () => {
    renderWithProviders(<GridHarness />)
    openPopover()

    expect(screen.getByText("Condition")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("On")
  })

  it("offers every date operator in the catalog copy", async () => {
    renderWithProviders(<GridHarness />)
    openPopover()
    await userEvent.click(screen.getByRole("combobox"))

    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["On", "Before", "After", "Date range"])
  })

  it("names both ends of a range and the shortcut to today", async () => {
    renderWithProviders(<GridHarness />)
    openPopover()
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Date range" }))

    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
  })
})

describe("ProductsCreatedAtColumnFilter applied to the table", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: TODAY, shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("narrows the table to the products created on the chosen day", () => {
    renderWithProviders(<GridHarness />)
    applyToday()

    expect(screen.getByTestId("matching-rows")).toHaveTextContent("today")
    expect(trigger()).toHaveTextContent("= Mar 15, 2026")
  })

  it("brings every product back once the filter is cleared", () => {
    renderWithProviders(<GridHarness />)
    applyToday()
    openPopover()
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.getByTestId("matching-rows")).toHaveTextContent("older,today")
    expect(trigger()).toHaveTextContent("Created at")
  })
})
