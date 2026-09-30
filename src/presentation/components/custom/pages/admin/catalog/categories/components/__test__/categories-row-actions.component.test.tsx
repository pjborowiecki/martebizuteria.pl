import { act, cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

interface MutateOptions {
  readonly onSuccess: () => void
}

const sheet = vi.hoisted(() => ({ openEdit: vi.fn<(category: unknown) => void>() }))

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: MutateOptions) => void>(),
}))

const browser = vi.hoisted(() => ({
  open: vi.fn<(url: string, target: string, features: string) => void>(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}))

const toasts = vi.hoisted(() => ({ success: vi.fn<(message: string) => void>() }))

vi.mock("sonner", () => ({ toast: { success: toasts.success } }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet", () => ({
  useCategoriesSheet: () => ({ openEdit: sheet.openEdit }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-delete-categories", () => ({
  useDeleteCategories: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { CategoriesRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-row-actions"

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z")

const localized = (english: string, polish: string) => ({ "en-US": english, "pl-PL": polish })

const category: ProductCategory["adminListItem"] = {
  createdAt: CREATED_AT,
  descriptions: localized("Rings cast in gold.", "Pierścienie ze złota."),
  handle: "rings",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 7,
  rank: 1,
  shortDescriptions: localized("Gold rings", "Złote pierścienie"),
  status: "active",
  subtitles: localized("Every ring", "Każdy pierścień"),
  titles: localized("Rings", "Pierścienie"),
  updatedAt: CREATED_AT,
}

const openMenu = async (): Promise<void> => {
  renderWithProviders(<CategoriesRowActions category={category} />)
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The row action trigger was not rendered")
  }
  await userEvent.click(trigger)
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  vi.stubGlobal("open", browser.open)
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: browser.writeText } })
  browser.writeText.mockResolvedValue(undefined)
})

describe("CategoriesRowActions menu", () => {
  it("offers every row action with its translated label", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Edit category" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "View products" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy link" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Delete category" })).toBeInTheDocument()
  })

  it("opens the edit sheet for the category it belongs to", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit category" }))

    expect(sheet.openEdit).toHaveBeenCalledWith(category)
  })

  it("opens the storefront listing in a new tab", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "View products" }))

    expect(browser.open).toHaveBeenCalledWith("/categories/rings", "_blank", "noopener,noreferrer")
  })

  it("copies the record id and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("category-1")
    expect(toasts.success).toHaveBeenCalledWith("Category ID copied to clipboard")
  })

  it("copies an absolute storefront link and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy link" }))

    expect(browser.writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/categories/rings`)
    expect(toasts.success).toHaveBeenCalledWith("Category link copied to clipboard")
  })
})

describe("CategoriesRowActions deletion", () => {
  it("asks for confirmation naming the category", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete category" }))

    expect(await screen.findByText("Delete category?")).toBeInTheDocument()
    expect(await screen.findByText("This will permanently delete “Rings”. This action cannot be undone.")).toBeInTheDocument()
  })

  it("does not delete anything until the deletion is confirmed", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete category" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("deletes only this category on confirmation", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete category" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["category-1"])
  })

  it("closes the confirmation once the deletion succeeded", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete category" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))
    act(() => {
      deletion.mutate.mock.calls[0]?.[1]?.onSuccess()
    })

    expect(screen.queryByText("Delete category?")).toBeNull()
  })
})
