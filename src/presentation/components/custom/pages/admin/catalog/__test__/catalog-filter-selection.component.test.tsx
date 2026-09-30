import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

const { applyProductsFilter, grid } = vi.hoisted(() => ({
  applyProductsFilter: vi.fn(),
  grid: { setFilterValue: vi.fn(), setPageIndex: vi.fn() },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid", () => ({
  attributesDataGrid: {
    useDataGrid: () => ({
      table: { getColumn: () => ({ getFilterValue: () => "text", setFilterValue: grid.setFilterValue }), setPageIndex: grid.setPageIndex },
    }),
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid", () => ({
  collectionsDataGrid: {
    useDataGrid: () => ({ table: { getColumn: () => ({ getFilterValue: () => "draft", setFilterValue: grid.setFilterValue }) } }),
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid", () => ({
  useProductsDataGridContext: () => ({
    activeCategoryFilter: "category-1",
    activeCollectionFilter: "collection-1",
    activeStatusFilter: "draft",
    activeVariantKindFilter: "single",
    applyProductsFilter,
  }),
}))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["categories"] }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["collections"] }),
}))
vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange, value }: Readonly<{ onValueChange: (value: string | null) => void; value: string }>): JSX.Element => (
    <>
      <output>{value}</output>
      <button
        type="button"
        onClick={() => {
          onValueChange(null)
        }}
      >
        Empty selection
      </button>
      <button
        type="button"
        onClick={() => {
          onValueChange("removed-option")
        }}
      >
        Unknown selection
      </button>
    </>
  ),
}))

import { AttributesTypeFilter } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-type-filter"
import { CollectionsStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-status-filter"
import { CatalogLocalePickerBar } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import { ProductsCategoryFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-category-filter"
import { ProductsCollectionFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-collection-filter"
import { ProductsStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-status-filter"
import { ProductsVariantKindFilter } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-variant-kind-filter"

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("catalog filter selection callbacks", () => {
  it.each([
    { component: AttributesTypeFilter, name: "attribute type", value: "text" },
    { component: CollectionsStatusFilter, name: "collection status", value: "draft" },
    { component: ProductsCategoryFilter, name: "product category", value: "category-1" },
    { component: ProductsCollectionFilter, name: "product collection", value: "collection-1" },
    { component: ProductsStatusFilter, name: "product status", value: "draft" },
    { component: ProductsVariantKindFilter, name: "product variant kind", value: "single" },
  ])("preserves the $name filter when the select reports null", async ({ component: Filter, value }) => {
    renderWithProviders(
      <Suspense fallback="loading filters">
        <Filter />
      </Suspense>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "Empty selection" }))

    expect(screen.getByRole("status")).toHaveTextContent(value)
    expect(applyProductsFilter).not.toHaveBeenCalled()
    expect(grid.setFilterValue).not.toHaveBeenCalled()
    expect(grid.setPageIndex).not.toHaveBeenCalled()
  })

  it.each([
    { component: ProductsStatusFilter, field: "status" },
    { component: ProductsVariantKindFilter, field: "variantKind" },
  ])("never sends an unsupported $field to product filtering", async ({ component: Filter, field }) => {
    renderWithProviders(<Filter />)

    await userEvent.click(screen.getByRole("button", { name: "Unknown selection" }))

    expect(applyProductsFilter).toHaveBeenCalledExactlyOnceWith({ [field]: undefined })
  })

  it.each(["Empty selection", "Unknown selection"])("falls back to the default locale for %s", async (name) => {
    const onLocaleChange = vi.fn<(locale: SupportedLocale) => void>()
    renderWithProviders(
      <CatalogLocalePickerBar
        filledCountHint="Titles"
        fills={{ "en-US": true, "pl-PL": true }}
        onLocaleChange={onLocaleChange}
        value="en-US"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name }))

    expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith("pl-PL")
  })
})
