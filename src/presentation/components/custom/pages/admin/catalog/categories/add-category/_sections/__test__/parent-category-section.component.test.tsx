import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const { categoryForm, catalog } = vi.hoisted(() => ({
  catalog: {
    categories: [] as { id: string; titles: { "en-US": string; "pl-PL": string } }[],
  },
  categoryForm: { categoryId: undefined as string | undefined, isPending: false },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider", () => ({
  useCategoryForm: () => categoryForm,
}))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminCategoriesQuery: () =>
      queryOptions({ queryFn: () => Promise.resolve(catalog.categories), queryKey: ["admin", "categories", "all"] }),
  }
})

const { ParentCategorySection } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/parent-category-section")

const PARENT_TEST_ID = "parent-value"

const ParentCategorySectionHarness = ({ parentId = "" }: Readonly<{ parentId?: string }>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({ defaultValues: { parentId } })
  Object.assign(categoryForm, { control: form.control })
  const currentParentId = form.watch("parentId")

  return (
    <Suspense fallback={<p>loading</p>}>
      <ParentCategorySection />
      <p data-testid={PARENT_TEST_ID}>{currentParentId}</p>
    </Suspense>
  )
}

const parentTrigger = (): Promise<HTMLElement> => screen.findByRole("combobox", { name: "Parent Category" })

const optionLabels = async (): Promise<(string | null)[]> => {
  const options = await screen.findAllByRole("option")

  return options.map((option) => option.textContent)
}

const optionNamed = async (label: string): Promise<HTMLElement> => {
  const options = await screen.findAllByRole("option")
  const option = options.find((candidate) => candidate.textContent === label)
  if (option === undefined) {
    throw new Error(`The select offered no ${label} option`)
  }

  return option
}

beforeEach(() => {
  categoryForm.categoryId = undefined
  categoryForm.isPending = false
  catalog.categories = [
    { id: "cat_rings", titles: { "en-US": "Rings", "pl-PL": "Pierscionki" } },
    { id: "cat_chains", titles: { "en-US": "Chains", "pl-PL": "Lancuszki" } },
  ]
})

afterEach(() => {
  cleanup()
  document.body.style.pointerEvents = ""
})

describe("ParentCategorySection", () => {
  it("titles the section after the hierarchy it edits", async () => {
    renderWithProviders(<ParentCategorySectionHarness />)

    expect(await screen.findByText("Hierarchy")).toBeInTheDocument()
  })

  it("labels the parent control", async () => {
    renderWithProviders(<ParentCategorySectionHarness />)

    expect(await parentTrigger()).toBeInTheDocument()
  })

  it("offers no parent first, then every existing category", async () => {
    renderWithProviders(<ParentCategorySectionHarness />)

    await userEvent.click(await parentTrigger())

    expect(await optionLabels()).toStrictEqual(["None", "Rings", "Chains"])
  })

  it("names each category in the active locale", async () => {
    renderWithProviders(<ParentCategorySectionHarness />)

    await userEvent.click(await parentTrigger())

    expect(await optionLabels()).not.toContain("Pierscionki")
  })

  it("never offers the category being edited as its own parent", async () => {
    categoryForm.categoryId = "cat_rings"
    renderWithProviders(<ParentCategorySectionHarness />)

    await userEvent.click(await parentTrigger())

    expect(await optionLabels()).toStrictEqual(["None", "Chains"])
  })

  it("writes the picked parent id back to the form", async () => {
    renderWithProviders(<ParentCategorySectionHarness />)

    await userEvent.click(await parentTrigger())
    await userEvent.click(await optionNamed("Chains"))

    expect(screen.getByTestId(PARENT_TEST_ID).textContent).toBe("cat_chains")
  })

  it("shows the parent the form already holds", async () => {
    renderWithProviders(<ParentCategorySectionHarness parentId="cat_rings" />)

    expect(await parentTrigger()).toHaveTextContent("Rings")
  })

  it("locks the control while the form is saving", async () => {
    categoryForm.isPending = true
    renderWithProviders(<ParentCategorySectionHarness />)

    expect(await parentTrigger()).toBeDisabled()
  })
})
