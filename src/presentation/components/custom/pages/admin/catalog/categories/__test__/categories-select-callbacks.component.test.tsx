import { type JSX, type ReactNode, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

const { formBridge, setFilterValue } = vi.hoisted(() => ({
  formBridge: { current: {} },
  setFilterValue: vi.fn<(value: unknown) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider", () => ({
  useCategoryForm: () => formBridge.current,
}))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["admin", "categories", "all"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid", () => ({
  categoriesDataGrid: {
    useDataGrid: () => ({ table: { getColumn: () => ({ getFilterValue: () => "draft", setFilterValue }) } }),
  },
}))
vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange }: Readonly<{ onValueChange: (value: string | null) => void }>): JSX.Element => (
    <button
      type="button"
      onClick={() => {
        onValueChange(null)
      }}
    >
      Emit empty selection
    </button>
  ),
}))

import { ParentCategorySection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/parent-category-section"
import { StatusSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/status-section"
import { CategoriesStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-status-filter"

const FormHarness = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({ defaultValues: { parentId: "category-parent", status: "draft" } })
  formBridge.current = { control: form.control, isPending: false }

  return (
    <Suspense fallback="loading categories">
      {children}
      <output data-testid="parent-value">{form.watch("parentId")}</output>
      <output data-testid="status-value">{form.watch("status")}</output>
    </Suspense>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("category select nullable callback contract", () => {
  it("keeps the parent category when the select reports no selection", async () => {
    renderWithProviders(
      <FormHarness>
        <ParentCategorySection />
      </FormHarness>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("parent-value")).toHaveTextContent("category-parent")
  })

  it("keeps the category status when the select reports no selection", async () => {
    renderWithProviders(
      <FormHarness>
        <StatusSection />
      </FormHarness>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("status-value")).toHaveTextContent("draft")
  })

  it("leaves the table filter unchanged when the select reports no selection", async () => {
    renderWithProviders(<CategoriesStatusFilter />)

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(setFilterValue).not.toHaveBeenCalled()
  })
})
