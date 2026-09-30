import { type JSX, type ReactNode, Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { getAdminProduct } = vi.hoisted(() => ({ getAdminProduct: vi.fn<() => Promise<unknown>>() }))

vi.mock("~/src/modules/product/use-cases/get-admin-product", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminProductQuery: (handle: string) =>
      queryOptions({
        queryFn: () => getAdminProduct(),
        queryKey: ["product", "admin", "by-handle", handle],
        retry: false,
      }),
  }
})
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider", () => ({
  ProductForm: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <form>{children}</form>,
  ProductFormProvider: ({
    children,
    onDismiss,
    onSuccess,
  }: Readonly<{ children: ReactNode; onDismiss: () => void; onSuccess: () => void }>): JSX.Element => (
    <div>
      <button onClick={onSuccess} type="button">
        report success
      </button>
      <button onClick={onDismiss} type="button">
        report dismissal
      </button>
      {children}
    </div>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-footer", () => ({
  ProductSheetFooter: (): null => null,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-form-body", () => ({
  ProductSheetFormBody: (): JSX.Element => <div data-testid="product-form-body" />,
}))

import { type Product } from "~/src/modules/product/product.types"

import { ProductSheet } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet"

const AT = new Date("2026-01-01T00:00:00.000Z")

const listItem = (): Product["adminListItem"] => ({
  createdAt: AT,
  descriptions: null,
  handle: "srebrny-pierscionek",
  id: "prod-1",
  inventoryLevel: "ok",
  metadata: null,
  primaryCategoryId: null,
  rank: 0,
  status: "draft",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  totalStock: 4,
  updatedAt: AT,
  variantCount: 1,
})

const productDetail = () => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: AT,
  descriptions: null,
  handle: "srebrny-pierscionek",
  id: "prod-1",
  images: [],
  metadata: null,
  options: [],
  primaryCategoryId: null,
  rank: 0,
  status: "draft",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  updatedAt: AT,
  variants: [],
})

const renderSheet = (ui: Parameters<typeof renderWithProviders>[0]) =>
  renderWithProviders(<Suspense fallback={<div data-testid="suspended" />}>{ui}</Suspense>, {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  })

beforeEach(() => {
  getAdminProduct.mockReset()
  getAdminProduct.mockResolvedValue(productDetail())
})

afterEach(cleanup)

describe("ProductSheet once the editor reports success", () => {
  it("closes the create sheet", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    renderSheet(<ProductSheet mode="create" onOpenChange={onOpenChange} open product={undefined} />)

    await userEvent.click(await screen.findByRole("button", { name: "report success" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes the edit sheet", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    renderSheet(<ProductSheet mode="edit" onOpenChange={onOpenChange} open product={listItem()} />)

    await userEvent.click(await screen.findByRole("button", { name: "report success" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe("ProductSheet once the editor reports a dismissal", () => {
  it("closes the create sheet", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    renderSheet(<ProductSheet mode="create" onOpenChange={onOpenChange} open product={undefined} />)

    await userEvent.click(await screen.findByRole("button", { name: "report dismissal" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
