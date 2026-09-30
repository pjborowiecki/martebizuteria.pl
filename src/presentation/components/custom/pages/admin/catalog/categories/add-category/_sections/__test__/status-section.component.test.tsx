import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const { categoryForm } = vi.hoisted(() => ({ categoryForm: { isPending: false } }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider", () => ({
  useCategoryForm: () => categoryForm,
}))

const { StatusSection } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/status-section")

const STATUS_TEST_ID = "status-value"

const StatusSectionHarness = ({
  status = CATEGORY_STATUS.DRAFT,
}: Readonly<{ status?: ProductCategory["formValues"]["status"] }>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({ defaultValues: { status } })
  Object.assign(categoryForm, { control: form.control, isPending: categoryForm.isPending })
  const currentStatus = form.watch("status")

  return (
    <>
      <StatusSection />
      <p data-testid={STATUS_TEST_ID}>{currentStatus}</p>
    </>
  )
}

const statusValue = (): string => screen.getByTestId(STATUS_TEST_ID).textContent

const optionNamed = async (label: string): Promise<HTMLElement> => {
  const options = await screen.findAllByRole("option")
  const option = options.find((candidate) => candidate.textContent === label)
  if (option === undefined) {
    throw new Error(`The select offered no ${label} option`)
  }

  return option
}

beforeEach(() => {
  categoryForm.isPending = false
})

afterEach(() => {
  cleanup()
  document.body.style.pointerEvents = ""
})

describe("StatusSection", () => {
  it("titles the section after the display options", () => {
    renderWithProviders(<StatusSectionHarness />)

    expect(screen.getByText("Display Options")).toBeInTheDocument()
  })

  it("labels the status control", () => {
    renderWithProviders(<StatusSectionHarness />)

    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
  })

  it("shows the draft status the form starts with", () => {
    renderWithProviders(<StatusSectionHarness />)

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Draft")
  })

  it("shows the active status when the category is already published", () => {
    renderWithProviders(<StatusSectionHarness status={CATEGORY_STATUS.ACTIVE} />)

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Active")
  })

  it("offers exactly the draft and active statuses", async () => {
    renderWithProviders(<StatusSectionHarness />)

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["Draft", "Active"])
  })

  it("writes the picked status back to the form", async () => {
    renderWithProviders(<StatusSectionHarness />)

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }))
    await userEvent.click(await optionNamed("Active"))

    expect(statusValue()).toBe(CATEGORY_STATUS.ACTIVE)
  })

  it("locks the status control while the form is saving", () => {
    categoryForm.isPending = true
    renderWithProviders(<StatusSectionHarness />)

    expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled()
  })
})
