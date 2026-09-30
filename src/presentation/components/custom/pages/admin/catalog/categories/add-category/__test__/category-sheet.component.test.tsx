import { Suspense } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { onOpenChange } = vi.hoisted(() => ({ onOpenChange: vi.fn<(open: boolean) => void>() }))

const catalog = vi.hoisted(() => {
  const state: { categories: unknown[] } = { categories: [] }

  return { state }
})

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://assets.test",
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => true,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/integrations/cloudflare-r2/media.mutations", () => ({ uploadImageFn: vi.fn() }))
vi.mock("~/src/modules/product-category/use-cases/create-category", () => ({ createCategory: vi.fn() }))
vi.mock("~/src/modules/product-category/use-cases/update-category", () => ({ updateCategory: vi.fn() }))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminCategoriesQuery: () =>
      queryOptions({ queryFn: () => Promise.resolve(catalog.state.categories), queryKey: ["admin", "categories"] }),
  }
})

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { updateCategory } from "~/src/modules/product-category/use-cases/update-category"

import { CategorySheet } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet"

const category = (overrides: Partial<ProductCategory["adminListItem"]> = {}): ProductCategory["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: "rings",
  id: "category-rings",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 0,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

const renderSheet = ({ mode, open = true, row }: { mode: "create" | "edit"; open?: boolean; row?: ProductCategory["adminListItem"] }) =>
  renderWithProviders(
    <Suspense fallback={<p>loading sheet</p>}>
      <CategorySheet category={row} mode={mode} onOpenChange={onOpenChange} open={open} />
    </Suspense>,
  )

describe("CategorySheet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalog.state.categories = [category()]
  })

  afterEach(() => {
    cleanup()
  })

  it("waits for a saved edit before closing and prevents duplicate submissions", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof updateCategory>>>()
    vi.mocked(updateCategory).mockReturnValueOnce(pending.promise)
    renderSheet({ mode: "edit", row: category() })

    await userEvent.click(await screen.findByRole("button", { name: "Save changes" }))
    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(updateCategory).mock.calls[0]?.[0]?.data).toMatchObject({ handle: "rings", id: "category-rings" })
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(updateCategory).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ handle: "rings", id: "category-rings" })
      await pending.promise
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("renders nothing while it is closed", () => {
    renderSheet({ mode: "create", open: false })

    expect(screen.queryByText("Add New Category")).toBeNull()
  })

  it("titles and explains the create sheet", async () => {
    renderSheet({ mode: "create" })

    expect(await screen.findByText("Add New Category")).toBeInTheDocument()
    expect(screen.getByText("Create a new category. It will be added to the end of the list.")).toBeInTheDocument()
  })

  it("titles and explains the edit sheet", async () => {
    renderSheet({ mode: "edit", row: category() })

    expect(await screen.findByText("Edit category")).toBeInTheDocument()
    expect(screen.getByText("Update this category’s details, status, and media.")).toBeInTheDocument()
  })

  it("opens a blank create form on the polish locale with no titles yet", async () => {
    renderSheet({ mode: "create" })

    expect(await screen.findByLabelText("Language")).toHaveTextContent("PL-PL")
    expect(screen.getByText(/0 of 2 filled/u)).toBeInTheDocument()
  })

  it("loads the saved slug into the edit form and counts both titles", async () => {
    renderSheet({ mode: "edit", row: category() })

    expect(await screen.findByDisplayValue("rings")).toBeInTheDocument()
    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("closes the sheet when the admin cancels", async () => {
    renderSheet({ mode: "create" })

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("offers the create action rather than the save action in create mode", async () => {
    renderSheet({ mode: "create" })

    expect(await screen.findByRole("button", { name: "Create category" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull()
  })
})
