import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const categoryForm = vi.hoisted(() => ({
  categoryId: undefined as string | undefined,
  isPending: false,
  mode: "create" as "create" | "edit",
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider", () => ({
  useCategoryForm: () => categoryForm,
}))

const { BasicDetailsSection } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/basic-details-section")

const { CatalogLocalePickerProvider } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker")

const emptyMap = () => ({ "en-US": "", "pl-PL": "" })

const SLUG_TEST_ID = "slug-value"

const BasicDetailsHarness = ({
  activeLocale = "en-US",
  handle = "",
  recordId,
  titles = emptyMap(),
}: Readonly<{
  activeLocale?: SupportedLocale
  handle?: string
  recordId?: string | undefined
  titles?: Record<string, string>
}>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({
    defaultValues: {
      descriptions: emptyMap(),
      handle,
      image: "",
      parentId: "",
      shortDescriptions: emptyMap(),
      status: "draft",
      subtitles: emptyMap(),
      titles,
    },
  })
  Object.assign(categoryForm, { control: form.control, setValue: form.setValue })
  const currentHandle = form.watch("handle")

  return (
    <CatalogLocalePickerProvider activeLocale={activeLocale}>
      <BasicDetailsSection recordId={recordId} />
      <p data-testid={SLUG_TEST_ID}>{currentHandle}</p>
    </CatalogLocalePickerProvider>
  )
}

const slugInput = (): HTMLElement => screen.getByPlaceholderText("category-name")

const titleInput = (): HTMLElement => screen.getByPlaceholderText("e.g. Necklaces")

const slugValue = (): string | null => screen.getByTestId(SLUG_TEST_ID).textContent

beforeEach(() => {
  categoryForm.categoryId = undefined
  categoryForm.isPending = false
  categoryForm.mode = "create"
})

afterEach(() => {
  cleanup()
})

describe("BasicDetailsSection layout", () => {
  it("titles the section", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("Basic Details")).toBeInTheDocument()
  })

  it("labels the title, slug, subtitle and both description fields for the active locale", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("Title (EN)")).toBeInTheDocument()
    expect(screen.getByText("URL Slug")).toBeInTheDocument()
    expect(screen.getByText("Subtitle (EN)")).toBeInTheDocument()
    expect(screen.getByText("Short description (EN)")).toBeInTheDocument()
    expect(screen.getByText("Description (EN)")).toBeInTheDocument()
  })

  it("switches every label to the other locale with the picker", () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" />)

    expect(screen.getByText("Title (PL)")).toBeInTheDocument()
    expect(screen.getByText("Description (PL)")).toBeInTheDocument()
    expect(screen.queryByText("Title (EN)")).toBeNull()
  })

  it("shows the storefront prefix next to the slug field", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("/categories/")).toBeInTheDocument()
  })

  it("counts the slug against its column length", () => {
    renderWithProviders(<BasicDetailsHarness handle="silver-rings" />)

    expect(screen.getByText("12/255")).toBeInTheDocument()
    expect(slugInput()).toHaveAttribute("maxlength", "255")
  })

  it("gives the short description three rows and the long one seven", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByPlaceholderText("Brief summary for cards and listings...")).toHaveAttribute("rows", "3")
    expect(screen.getByPlaceholderText("Enter the full category description...")).toHaveAttribute("rows", "7")
  })
})

describe("BasicDetailsSection record id", () => {
  it("hides the id field while creating a category", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.queryByText("ID")).toBeNull()
  })

  it("shows the id of the category being edited", () => {
    categoryForm.categoryId = "cat-rings"
    categoryForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByDisplayValue("cat-rings")).toHaveAttribute("readonly")
  })

  it("prefers an explicitly supplied record id over the form one", () => {
    categoryForm.categoryId = "cat-rings"
    categoryForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness recordId="row-42" />)

    expect(screen.getByDisplayValue("row-42")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("cat-rings")).toBeNull()
  })

  it("hides the id field when the edited category has none yet", () => {
    categoryForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.queryByText("ID")).toBeNull()
  })
})

describe("BasicDetailsSection slug behaviour", () => {
  it("fills the slug from the title while the slug is untouched", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(titleInput(), "Silver Rings")

    expect(slugValue()).toBe("silver-rings")
  })

  it("strips diacritics and the Polish l when deriving the slug", async () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" titles={emptyMap()} />)

    await userEvent.type(screen.getByPlaceholderText("e.g. Necklaces"), "Łańcuszki Złote")

    expect(slugValue()).toBe("lancuszki-zlote")
  })

  it("stops deriving the slug once it has been edited by hand", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "my-own-slug")
    await userEvent.type(titleInput(), "Silver Rings")

    expect(slugValue()).toBe("my-own-slug")
  })

  it("normalises characters typed into the slug", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "Silver Rings!!")

    expect(slugValue()).toBe("silver-rings-")
  })

  it("trims the trailing separator when the slug field loses focus", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "Silver Rings!!")
    await userEvent.tab()

    expect(slugValue()).toBe("silver-rings")
  })
})

describe("BasicDetailsSection while saving", () => {
  it("locks every editable field", () => {
    categoryForm.isPending = true
    renderWithProviders(<BasicDetailsHarness />)

    expect(titleInput()).toBeDisabled()
    expect(slugInput()).toBeDisabled()
    expect(screen.getByPlaceholderText("Supporting line under the category title...")).toBeDisabled()
    expect(screen.getByPlaceholderText("Brief summary for cards and listings...")).toBeDisabled()
    expect(screen.getByPlaceholderText("Enter the full category description...")).toBeDisabled()
  })
})
