import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import {
  CategoryForm,
  CategoryFormProvider,
  useCategoryForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider"
import { CategorySheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet-footer"
import { CatalogFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"

const mutations = vi.hoisted(() => ({
  create: vi.fn(() => Promise.resolve({ id: "category-created" })),
  update: vi.fn(() => Promise.resolve({ id: "category-rings" })),
}))

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/modules/product-category/use-cases/create-category", () => ({ createCategory: mutations.create }))
vi.mock("~/src/modules/product-category/use-cases/update-category", () => ({ updateCategory: mutations.update }))

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

const UploadToggle = (): JSX.Element => {
  const { setUploading } = useCategoryForm()

  return (
    <button
      type="button"
      onClick={() => {
        setUploading(true)
      }}
    >
      Start upload
    </button>
  )
}

const renderForm = ({
  mode,
  onDismiss = vi.fn<() => void>(),
  row,
}: {
  mode: "create" | "edit"
  onDismiss?: () => void
  row?: ProductCategory["adminListItem"]
}) =>
  renderWithProviders(
    <CatalogFormLocaleControlsProvider>
      <CategoryFormProvider category={row} mode={mode} onDismiss={onDismiss} open>
        <CategoryForm>
          <UploadToggle />
        </CategoryForm>
        <CategorySheetFooter />
      </CategoryFormProvider>
    </CatalogFormLocaleControlsProvider>,
  )

const EXPECTED_UPDATE_DATA = {
  descriptions: { "en-US": "", "pl-PL": "" },
  handle: "rings",
  id: "category-rings",
  image: "",
  parentId: "",
  shortDescriptions: { "en-US": "", "pl-PL": "" },
  status: "active",
  subtitles: { "en-US": "", "pl-PL": "" },
  titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
}

describe("CategorySheetFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("offers to create a new category", () => {
    renderForm({ mode: "create" })

    expect(screen.getByRole("button", { name: "Create category" })).toBeEnabled()
  })

  it("offers to save an existing category", () => {
    renderForm({ mode: "edit", row: category() })

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create category" })).toBeNull()
  })

  it("dismisses the sheet from the cancel button", async () => {
    const onDismiss = vi.fn<() => void>()
    renderForm({ mode: "create", onDismiss })

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("blocks submitting while an image upload is in flight but still allows cancelling", async () => {
    renderForm({ mode: "edit", row: category() })

    await userEvent.click(screen.getByRole("button", { name: "Start upload" }))

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
  })
})

describe("CategoryFormProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("sends the edited category with its id to the update use case", async () => {
    renderForm({ mode: "edit", row: category() })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(mutations.update).toHaveBeenCalledExactlyOnceWith({ data: EXPECTED_UPDATE_DATA })
    })
    expect(toasts.success).toHaveBeenCalledWith("Category saved", { description: "Your changes have been saved." })
  })

  it("refuses to create a category with no title and reports the missing translations", async () => {
    renderForm({ mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "Create category" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalled()
    })
    expect(toasts.error.mock.calls[0]?.[0]).toBe("Missing translations")
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("explains a duplicate slug rejected by the server", async () => {
    mutations.update.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: ERROR_CODES.CONFLICT }))
    renderForm({ mode: "edit", row: category() })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "A category with this URL slug already exists.",
      })
    })
  })

  it("explains an invalid parent rejected by the server", async () => {
    mutations.update.mockRejectedValueOnce(Object.assign(new Error("invalid"), { code: ERROR_CODES.VALIDATION }))
    renderForm({ mode: "edit", row: category() })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "Choose a valid parent category that is not this category or one of its descendants.",
      })
    })
  })

  it("falls back to the generic failure for an unexpected server error", async () => {
    mutations.update.mockRejectedValueOnce(new Error("boom"))
    renderForm({ mode: "edit", row: category() })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "The category could not be saved. Please try again.",
      })
    })
  })
})
