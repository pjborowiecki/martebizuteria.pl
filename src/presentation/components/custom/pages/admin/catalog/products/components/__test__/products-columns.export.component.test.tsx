import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { formatPrice } from "~/src/modules/_core/utils/currency"

vi.mock("~/src/presentation/components/custom/image", () => ({ Image: (): JSX.Element => <span /> }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/products-row-actions", () => ({
  ProductsRowActions: (): JSX.Element => <span />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-cell", () => ({
  ProductReorderCell: (): JSX.Element => <span />,
}))

import { useProductColumns } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-columns"

import { type ProductRow, productRow } from "./products-grid-harness"

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValues = (overrides: Partial<ProductRow>): Record<string, string | undefined> => {
  const { result } = renderHook(() => useProductColumns(), { wrapper: Wrapper })
  const row = productRow(overrides)

  return Object.fromEntries(
    result.current.flatMap((column): [string, string | undefined][] =>
      column.id === undefined ? [] : [[column.id, column.meta?.exportValue?.(row)]],
    ),
  )
}

describe("useProductColumns export values", () => {
  it("exports every data column as the text its cell shows", () => {
    const values = exportValues({
      attributeTitles: "Material",
      categoryTitle: "Rings",
      categoryTitles: "Rings, Gifts",
      collectionTitles: "New arrivals",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      minPrice: 24_900,
      skuSummary: " RING-SILVER ",
      updatedAt: new Date("2026-02-20T10:00:00.000Z"),
    })

    expect(values).toMatchObject({
      attributes: "Material",
      category: "Rings, Gifts",
      collection: "New arrivals",
      createdAt: "Jan 15, 2026",
      editedAt: "Feb 20, 2026",
      minPrice: formatPrice(24_900, "PLN", "en-US"),
      recordId: "product-1",
      sku: "RING-SILVER",
      status: "Active",
      stock: "4",
      title: "Silver ring (/silver-ring)",
      variantKind: "2 variants",
    })
  })

  it("names a single-variant product and leaves out what a product lacks", () => {
    const values = exportValues({ variantCount: 1 })

    expect(values).toMatchObject({
      attributes: undefined,
      category: undefined,
      collection: undefined,
      minPrice: undefined,
      sku: undefined,
      variantKind: "Single variant",
    })
  })

  it("never exports the selection, the drag handle, the image or the row actions", () => {
    const values = exportValues({})

    expect([values["select"], values["drag"], values["image"], values["actions"]]).toStrictEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })
})
