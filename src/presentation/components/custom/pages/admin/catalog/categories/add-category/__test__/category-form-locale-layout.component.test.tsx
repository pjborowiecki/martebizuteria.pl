import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { CategoryFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-locale-layout"
import {
  CategoryForm,
  CategoryFormProvider,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider"
import { CategorySheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet-footer"
import { CatalogFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("~/src/modules/product-category/use-cases/create-category", () => ({ createCategory: vi.fn() }))
vi.mock("~/src/modules/product-category/use-cases/update-category", () => ({ updateCategory: vi.fn() }))

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

const renderLayout = ({ mode, row }: { mode: "create" | "edit"; row?: ProductCategory["adminListItem"] }) =>
  renderWithProviders(
    <CatalogFormLocaleControlsProvider>
      <CategoryFormProvider category={row} mode={mode} onDismiss={vi.fn<() => void>()} open>
        <CategoryForm>
          <CategoryFormLocaleLayout>
            <p>category fields</p>
          </CategoryFormLocaleLayout>
        </CategoryForm>
        <CategorySheetFooter />
      </CategoryFormProvider>
    </CatalogFormLocaleControlsProvider>,
  )

describe("CategoryFormLocaleLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("starts on the polish locale and renders the form body", () => {
    renderLayout({ mode: "create" })

    expect(screen.getByLabelText("Language")).toHaveTextContent("PL-PL")
    expect(screen.getByText("category fields")).toBeInTheDocument()
  })

  it("explains that the count covers the titles only", () => {
    renderLayout({ mode: "create" })

    expect(screen.getByText("· title in each language")).toBeInTheDocument()
  })

  it("counts no locale as complete for a blank new category", () => {
    renderLayout({ mode: "create" })

    expect(screen.getByText(/0 of 2 filled/u)).toBeInTheDocument()
  })

  it("counts both locales as complete for a fully translated category", () => {
    renderLayout({ mode: "edit", row: category() })

    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("counts only the translated locale when a title is missing", () => {
    renderLayout({ mode: "edit", row: category({ titles: { "en-US": "", "pl-PL": "Pierścionki" } }) })

    expect(screen.getByText(/1 of 2 filled/u)).toBeInTheDocument()
  })

  it("ignores the optional locale maps when counting", () => {
    renderLayout({ mode: "edit", row: category({ descriptions: null, subtitles: null }) })

    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("shows no incomplete alert before the form is submitted", () => {
    renderLayout({ mode: "create" })

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("names the untranslated locales in an alert after a blocked submit", async () => {
    renderLayout({ mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "Create category" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Complete required fields for: PL-PL, EN-US.")
    })
    expect(screen.getByLabelText("Language")).toHaveAttribute("aria-invalid", "true")
  })
})
