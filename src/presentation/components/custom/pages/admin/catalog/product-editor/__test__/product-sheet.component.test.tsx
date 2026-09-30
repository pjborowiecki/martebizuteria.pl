import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { getAdminProduct } = vi.hoisted(() => ({ getAdminProduct: vi.fn<() => Promise<unknown>>() }))

vi.mock("~/src/modules/product/use-cases/get-admin-product", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminProductQuery: (handle: string) =>
      queryOptions({ queryFn: () => getAdminProduct(), queryKey: ["product", "admin", "by-handle", handle], retry: false }),
  }
})
vi.mock("~/src/modules/product/use-cases/create-complete-product", () => ({ createCompleteProduct: vi.fn() }))
vi.mock("~/src/modules/product/use-cases/update-complete-product", () => ({ updateCompleteProduct: vi.fn() }))
vi.mock("~/src/modules/product/use-cases/validate-product-skus", () => ({ validateProductSkus: vi.fn() }))
vi.mock("~/src/modules/attribute-on-product/use-cases/set-all-product-attributes", () => ({ setAllProductAttributes: vi.fn() }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-form-body", () => ({
  ProductSheetFormBody: () => <div data-testid="product-form-body" />,
}))

import { type Product } from "~/src/modules/product/product.types"

import { ProductSheet } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet"

afterEach(cleanup)

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

describe("ProductSheet in create mode", () => {
  it("stays closed until asked to open", () => {
    renderSheet(<ProductSheet mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open={false} product={undefined} />)

    expect(screen.queryByTestId("product-form-body")).not.toBeInTheDocument()
  })

  it("titles the sheet for a brand new product", async () => {
    renderSheet(<ProductSheet mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open product={undefined} />)

    expect(await screen.findByText("Add New Product")).toBeInTheDocument()
    expect(screen.getByText("Create a new product with details, pricing, media, and variants.")).toBeInTheDocument()
  })

  it("wires the form body and the create footer into the sheet", async () => {
    renderSheet(<ProductSheet mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open product={undefined} />)

    expect(await screen.findByTestId("product-form-body")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create product" })).toBeInTheDocument()
  })

  it("never asks the server for a product it is about to create", async () => {
    renderSheet(<ProductSheet mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open product={undefined} />)

    await screen.findByTestId("product-form-body")

    expect(getAdminProduct).not.toHaveBeenCalled()
  })

  it("closes the sheet when the footer cancels out", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    renderSheet(<ProductSheet mode="create" onOpenChange={onOpenChange} open product={undefined} />)
    await screen.findByTestId("product-form-body")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe("ProductSheet in edit mode", () => {
  it("renders an empty panel while no product row is selected", async () => {
    renderSheet(<ProductSheet mode="edit" onOpenChange={vi.fn<(open: boolean) => void>()} open product={undefined} />)

    await waitFor(() => {
      expect(screen.queryByTestId("suspended")).not.toBeInTheDocument()
    })
    expect(screen.queryByTestId("product-form-body")).not.toBeInTheDocument()
    expect(screen.queryByText("Edit product")).not.toBeInTheDocument()
    expect(getAdminProduct).not.toHaveBeenCalled()
  })

  it("loads the selected product and titles the sheet for editing", async () => {
    renderSheet(<ProductSheet mode="edit" onOpenChange={vi.fn<(open: boolean) => void>()} open product={listItem()} />)

    expect(await screen.findByTestId("product-form-body")).toBeInTheDocument()
    expect(screen.getByText("Edit product")).toBeInTheDocument()
    expect(screen.getByText("Update this product’s details, organization, pricing, and variants.")).toBeInTheDocument()
    expect(getAdminProduct).toHaveBeenCalledTimes(1)
  })

  it("offers to save changes rather than create a product", async () => {
    renderSheet(<ProductSheet mode="edit" onOpenChange={vi.fn<(open: boolean) => void>()} open product={listItem()} />)

    expect(await screen.findByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })
})
