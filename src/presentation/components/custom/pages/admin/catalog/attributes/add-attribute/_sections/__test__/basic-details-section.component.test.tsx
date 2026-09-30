import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

const attributeForm = vi.hoisted(() => ({
  attributeId: undefined as string | undefined,
  isPending: false,
  mode: "create" as "create" | "edit",
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider", () => ({
  useAttributeForm: () => attributeForm,
}))

const { BasicDetailsSection } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/basic-details-section")

const { CatalogLocalePickerProvider } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker")

const SLUG_TEST_ID = "attribute-slug-value"

const BasicDetailsHarness = ({
  activeLocale = "en-US",
  handle = "",
  recordId,
}: Readonly<{
  activeLocale?: SupportedLocale
  handle?: string
  recordId?: string | undefined
}>): JSX.Element => {
  const form = useForm<ProductAttribute["formValues"]>({
    defaultValues: { allowedValues: [], handle, titles: { "en-US": "", "pl-PL": "" }, type: "text", unit: "" },
  })
  Object.assign(attributeForm, { control: form.control, setValue: form.setValue })
  const currentHandle = form.watch("handle")

  return (
    <CatalogLocalePickerProvider activeLocale={activeLocale}>
      <BasicDetailsSection recordId={recordId} />
      <p data-testid={SLUG_TEST_ID}>{currentHandle}</p>
    </CatalogLocalePickerProvider>
  )
}

const slugInput = (): HTMLElement => screen.getByPlaceholderText("materials")

const nameInput = (): HTMLElement => screen.getByPlaceholderText("Materials")

const slugValue = (): string | null => screen.getByTestId(SLUG_TEST_ID).textContent

beforeEach(() => {
  attributeForm.attributeId = undefined
  attributeForm.isPending = false
  attributeForm.mode = "create"
})

afterEach(cleanup)

describe("attribute BasicDetailsSection layout", () => {
  it("titles the section", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("Basic details")).toBeInTheDocument()
  })

  it("labels the name for the active locale beside the slug", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("Name (EN)")).toBeInTheDocument()
    expect(screen.getByText("URL Slug")).toBeInTheDocument()
  })

  it("switches the name label to the other locale with the picker", () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" />)

    expect(screen.getByText("Name (PL)")).toBeInTheDocument()
    expect(screen.queryByText("Name (EN)")).toBeNull()
  })

  it("counts the slug against its column length", () => {
    renderWithProviders(<BasicDetailsHarness handle="materials-used" />)

    expect(screen.getByText("14/255")).toBeInTheDocument()
    expect(slugInput()).toHaveAttribute("maxlength", "255")
  })
})

describe("attribute BasicDetailsSection record id", () => {
  it("hides the id field while creating an attribute", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.queryByText("ID")).toBeNull()
  })

  it("shows the id of the attribute being edited", () => {
    attributeForm.attributeId = "attr-materials"
    attributeForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByDisplayValue("attr-materials")).toHaveAttribute("readonly")
  })

  it("keeps the id hidden for an attribute being created even once one is known", () => {
    attributeForm.attributeId = "attr-materials"
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.queryByText("ID")).toBeNull()
  })

  it("prefers an explicitly supplied record id over the form one", () => {
    attributeForm.attributeId = "attr-materials"
    attributeForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness recordId="row-42" />)

    expect(screen.getByDisplayValue("row-42")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("attr-materials")).toBeNull()
  })
})

describe("attribute BasicDetailsSection slug behaviour", () => {
  it("fills the slug from the Polish name while the slug is untouched", async () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" />)

    await userEvent.type(nameInput(), "Materialy Szlachetne")

    expect(slugValue()).toBe("materialy-szlachetne")
  })

  it("leaves the slug alone when the English name is the one typed", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(nameInput(), "Precious materials")

    expect(slugValue()).toBe("")
  })

  it("stops deriving the slug once it has been edited by hand", async () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" />)

    await userEvent.type(slugInput(), "my-own-slug")
    await userEvent.type(nameInput(), "Materialy")

    expect(slugValue()).toBe("my-own-slug")
  })

  it("normalises characters typed into the slug", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "Zloty Lancuszek!!")

    expect(slugValue()).toBe("zloty-lancuszek-")
  })

  it("trims the trailing separator when the slug field loses focus", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "Zloty Lancuszek!!")
    await userEvent.tab()

    expect(slugValue()).toBe("zloty-lancuszek")
  })
})

describe("attribute BasicDetailsSection while saving", () => {
  it("locks the name and the slug", () => {
    attributeForm.isPending = true
    renderWithProviders(<BasicDetailsHarness />)

    expect(nameInput()).toBeDisabled()
    expect(slugInput()).toBeDisabled()
  })
})
