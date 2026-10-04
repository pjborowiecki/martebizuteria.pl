import { type JSX, type ReactNode } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

interface SheetProps {
  readonly mode: string
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly product: Product["adminListItem"] | undefined
}

const captured = vi.hoisted(() => ({
  gridOptions: [] as { onRowClick: (row: unknown) => void; onRowPointerDown: (row: unknown) => void }[],
  sheetProps: [] as SheetProps[],
}))

const { stub } = vi.hoisted(() => ({
  stub: (label: string) => (): string => label,
}))

vi.mock("~/src/modules/product/use-cases/get-admin-product", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminProductQuery: (handle: string) =>
      queryOptions({ queryFn: () => Promise.resolve({ handle }), queryKey: ["admin", "products", "by-handle", handle] as const }),
  }
})
vi.mock("~/src/presentation/components/custom/datagrid/components/data-grid-shell", () => ({
  DataGridShell: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <section aria-label="grid shell">{children}</section>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet", () => ({
  ProductSheet: (props: SheetProps): JSX.Element => {
    captured.sheetProps.push(props)

    return (
      <output data-testid="product-sheet">
        {props.mode}
        <button
          type="button"
          onClick={() => {
            props.onOpenChange(false)
          }}
        >
          dismiss sheet
        </button>
      </output>
    )
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-bulk-actions", () => ({
  ProductsBulkActions: stub("bulk actions"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-category-filter", () => ({
  ProductsCategoryFilter: stub("category filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-collection-filter", () => ({
  ProductsCollectionFilter: stub("collection filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-created-at-column-filter", () => ({
  ProductsCreatedAtColumnFilter: stub("created filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-export-action", () => ({
  ProductsExportAction: stub("export action"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-price-column-filter", () => ({
  ProductsPriceColumnFilter: stub("price filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-refresh-action", () => ({
  ProductsRefreshAction: stub("refresh action"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-stats", () => ({
  ProductsStats: stub("stats"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-status-filter", () => ({
  ProductsStatusFilter: stub("status filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-stock-column-filter", () => ({
  ProductsStockColumnFilter: stub("stock filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-variant-kind-filter", () => ({
  ProductsVariantKindFilter: stub("variant filter"),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGrid: (options: { onRowClick: (row: unknown) => void; onRowPointerDown: (row: unknown) => void }) => {
    captured.gridOptions.push(options)

    return { persistenceKey: "test.products" }
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid", () => ({
  productsDataGrid: {
    Body: stub("grid body"),
    Pagination: stub("grid pagination"),
    Provider: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <>{children}</>,
    Toolbar: ({ actions, children, filters }: Readonly<{ actions: ReactNode; children: ReactNode; filters: ReactNode }>): JSX.Element => (
      <div aria-label="toolbar">
        {filters}
        {actions}
        {children}
      </div>
    ),
  },
}))

import { ProductsTable } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-table"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const PRODUCT: Product["adminListItem"] = {
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
  variantCount: 1,
}

const lastGridOptions = () => {
  const options = captured.gridOptions.at(-1)
  if (options === undefined) {
    throw new Error("The products data grid was never built")
  }

  return options
}

const lastSheetProps = (): SheetProps => {
  const props = captured.sheetProps.at(-1)
  if (props === undefined) {
    throw new Error("The product sheet was never rendered")
  }

  return props
}

beforeEach(() => {
  captured.gridOptions.length = 0
  captured.sheetProps.length = 0
})

afterEach(() => {
  cleanup()
})

describe("ProductsTable layout", () => {
  it("stacks the stats above the grid shell", () => {
    renderWithProviders(<ProductsTable />)

    const shell = screen.getByLabelText("grid shell")

    expect(screen.getByText("stats")).toBeInTheDocument()
    expect(shell).toHaveTextContent("grid body")
    expect(shell).toHaveTextContent("grid pagination")
  })

  it("offers every catalog filter in the toolbar", () => {
    renderWithProviders(<ProductsTable />)

    const toolbar = screen.getByLabelText("toolbar")

    for (const label of [
      "category filter",
      "collection filter",
      "status filter",
      "variant filter",
      "price filter",
      "stock filter",
      "created filter",
    ]) {
      expect(toolbar).toHaveTextContent(label)
    }
  })

  it("puts the bulk actions, the add button, refresh and export in the toolbar", () => {
    renderWithProviders(<ProductsTable />)

    const toolbar = screen.getByLabelText("toolbar")

    expect(toolbar).toHaveTextContent("bulk actions")
    expect(toolbar).toHaveTextContent("refresh action")
    expect(toolbar).toHaveTextContent("export action")
    expect(screen.getByRole("button", { name: "Add product" })).toBeInTheDocument()
  })
})

describe("ProductsTable sheet", () => {
  it("keeps the sheet closed until something opens it", () => {
    renderWithProviders(<ProductsTable />)

    expect(screen.queryByTestId("product-sheet")).toBeNull()
  })

  it("opens the sheet in create mode from the add button", async () => {
    renderWithProviders(<ProductsTable />)

    await userEvent.click(screen.getByRole("button", { name: "Add product" }))

    expect(screen.getByTestId("product-sheet")).toHaveTextContent("create")
    expect(lastSheetProps().product).toBeUndefined()
  })

  it("opens the sheet in edit mode when a row is clicked", async () => {
    renderWithProviders(<ProductsTable />)

    await act(async () => {
      lastGridOptions().onRowClick(PRODUCT)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByTestId("product-sheet")).toHaveTextContent("edit")
    })
    expect(lastSheetProps().product).toStrictEqual(PRODUCT)
  })

  it("closes the sheet again when it reports being dismissed", async () => {
    renderWithProviders(<ProductsTable />)

    await userEvent.click(screen.getByRole("button", { name: "Add product" }))
    await userEvent.click(screen.getByRole("button", { name: "dismiss sheet" }))

    expect(screen.queryByTestId("product-sheet")).toBeNull()
  })

  it("prefetches the edit sheet when a row is pressed without opening it", async () => {
    const { queryClient } = renderWithProviders(<ProductsTable />)

    await act(async () => {
      lastGridOptions().onRowPointerDown(PRODUCT)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(queryClient.getQueryData([...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, PRODUCT.handle])).toStrictEqual({ handle: PRODUCT.handle })
    })
    expect(screen.queryByTestId("product-sheet")).toBeNull()
  })
})
