import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Product } from "~/src/modules/product/product.types"

const sheet = vi.hoisted(() => ({ openEdit: vi.fn<(product: unknown) => void>() }))

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: { onSuccess: () => void }) => void>(),
}))

const browser = vi.hoisted(() => ({
  open: vi.fn<(url: string, target: string, features: string) => void>(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}))

const toasts = vi.hoisted(() => ({ success: vi.fn<(message: string) => void>() }))

vi.mock("sonner", () => ({ toast: { success: toasts.success } }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-sheet", () => ({
  useProductsSheet: () => ({ openEdit: sheet.openEdit }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-delete-products", () => ({
  useDeleteProducts: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { ProductsRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-row-actions"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const productRow = (overrides: Partial<Product["adminListItem"]> = {}): Product["adminListItem"] => ({
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
  variantCount: 2,
  ...overrides,
})

const PUBLISHED = productRow()

const DRAFT = productRow({ id: "product-2", status: "draft" })

const openMenu = async (product: Product["adminListItem"]) => {
  renderWithProviders(<ProductsRowActions product={product} />)
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The row action trigger was not rendered")
  }
  await userEvent.click(trigger)
}

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  vi.stubGlobal("open", browser.open)
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: browser.writeText } })
  browser.writeText.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe("ProductsRowActions on a published product", () => {
  it("offers every row action with its translated label", async () => {
    await openMenu(PUBLISHED)

    expect(await screen.findByRole("menuitem", { name: "Edit product" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "View on storefront" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy link" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Delete product" })).toBeInTheDocument()
  })

  it("opens the edit sheet for the row it belongs to", async () => {
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit product" }))

    expect(sheet.openEdit).toHaveBeenCalledWith(PUBLISHED)
  })

  it("opens the storefront page in a new tab", async () => {
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "View on storefront" }))

    expect(browser.open).toHaveBeenCalledWith("/products/silver-ring", "_blank", "noopener,noreferrer")
  })

  it("copies the record id and confirms it", async () => {
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("product-1")
    expect(toasts.success).toHaveBeenCalledWith("Product ID copied to clipboard")
  })

  it("copies an absolute storefront link and confirms it", async () => {
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy link" }))

    expect(browser.writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/products/silver-ring`)
    expect(toasts.success).toHaveBeenCalledWith("Product link copied to clipboard")
  })
})

describe("ProductsRowActions on an unpublished product", () => {
  it("hides the storefront actions because the page is not reachable", async () => {
    await openMenu(DRAFT)

    expect(await screen.findByRole("menuitem", { name: "Edit product" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "View on storefront" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Copy link" })).toBeNull()
  })

  it("still copies the record id", async () => {
    await openMenu(DRAFT)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("product-2")
  })
})

describe("ProductsRowActions deletion", () => {
  it("asks for confirmation naming the product in the admin locale", async () => {
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete product" }))

    expect(await screen.findByText("Delete product?")).toBeInTheDocument()
    expect(
      await screen.findByText("This will permanently delete “Silver ring” and its variants. This action cannot be undone."),
    ).toBeInTheDocument()
    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("deletes only this product on confirmation", async () => {
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete product" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["product-1"])
  })

  it("closes the confirmation once the deletion succeeds", async () => {
    deletion.mutate.mockImplementation((_ids, options) => {
      options.onSuccess()
    })
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete product" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(screen.queryByText("Delete product?")).toBeNull()
  })

  it("keeps the confirmation buttons inert while the deletion runs", async () => {
    deletion.isPending = true
    await openMenu(PUBLISHED)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete product" }))

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
  })
})
