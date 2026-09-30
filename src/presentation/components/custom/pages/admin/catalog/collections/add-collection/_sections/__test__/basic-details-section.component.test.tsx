import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

const collectionForm = vi.hoisted(() => ({
  collectionId: undefined as string | undefined,
  isPending: false,
  mode: "create" as "create" | "edit",
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider", () => ({
  useCollectionForm: () => collectionForm,
}))

const { BasicDetailsSection } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/_sections/basic-details-section")

const { CatalogLocalePickerProvider } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker")

const emptyMap = () => ({ "en-US": "", "pl-PL": "" })

const SLUG_TEST_ID = "slug-value"

const BasicDetailsHarness = ({
  activeLocale = "en-US",
  handle = "",
  recordId,
}: Readonly<{
  activeLocale?: SupportedLocale
  handle?: string
  recordId?: string | undefined
}>): JSX.Element => {
  const form = useForm<ProductCollection["formValues"]>({
    defaultValues: { descriptions: emptyMap(), handle, image: "", status: "draft", titles: emptyMap() },
  })
  Object.assign(collectionForm, { control: form.control, setValue: form.setValue })
  const currentHandle = form.watch("handle")

  return (
    <CatalogLocalePickerProvider activeLocale={activeLocale}>
      <BasicDetailsSection recordId={recordId} />
      <p data-testid={SLUG_TEST_ID}>{currentHandle}</p>
    </CatalogLocalePickerProvider>
  )
}

const slugInput = (): HTMLElement => screen.getByPlaceholderText("collection-name")

const nameInput = (): HTMLElement => screen.getByPlaceholderText("e.g. Summer Collection")

const slugValue = (): string | null => screen.getByTestId(SLUG_TEST_ID).textContent

beforeEach(() => {
  collectionForm.collectionId = undefined
  collectionForm.isPending = false
  collectionForm.mode = "create"
})

afterEach(cleanup)

describe("BasicDetailsSection layout", () => {
  it("titles the section", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("Basic Details")).toBeInTheDocument()
  })

  it("labels the name, slug and description fields for the active locale", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("Name (EN)")).toBeInTheDocument()
    expect(screen.getByText("URL Slug")).toBeInTheDocument()
    expect(screen.getByText("Description (EN)")).toBeInTheDocument()
  })

  it("switches the labels to the other locale with the picker", () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" />)

    expect(screen.getByText("Name (PL)")).toBeInTheDocument()
    expect(screen.queryByText("Name (EN)")).toBeNull()
  })

  it("shows the storefront prefix next to the slug field", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByText("/collections/")).toBeInTheDocument()
  })

  it("counts the slug against its column length", () => {
    renderWithProviders(<BasicDetailsHarness handle="summer-2026" />)

    expect(screen.getByText("11/255")).toBeInTheDocument()
    expect(slugInput()).toHaveAttribute("maxlength", "255")
  })
})

describe("BasicDetailsSection record id", () => {
  it("hides the id field while creating a collection", () => {
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.queryByText("ID")).toBeNull()
  })

  it("shows the id of the collection being edited", () => {
    collectionForm.collectionId = "col-summer"
    collectionForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness />)

    expect(screen.getByDisplayValue("col-summer")).toHaveAttribute("readonly")
  })

  it("prefers an explicitly supplied record id over the form one", () => {
    collectionForm.collectionId = "col-summer"
    collectionForm.mode = "edit"
    renderWithProviders(<BasicDetailsHarness recordId="row-42" />)

    expect(screen.getByDisplayValue("row-42")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("col-summer")).toBeNull()
  })
})

describe("BasicDetailsSection slug behaviour", () => {
  it("fills the slug from the name while the slug is untouched", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(nameInput(), "Summer Collection")

    expect(slugValue()).toBe("summer-collection")
  })

  it("strips diacritics and the Polish l when deriving the slug", async () => {
    renderWithProviders(<BasicDetailsHarness activeLocale="pl-PL" />)

    await userEvent.type(nameInput(), "Lancuszki Zlote")

    expect(slugValue()).toBe("lancuszki-zlote")
  })

  it("stops deriving the slug once it has been edited by hand", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "my-own-slug")
    await userEvent.type(nameInput(), "Summer Collection")

    expect(slugValue()).toBe("my-own-slug")
  })

  it("normalises characters typed into the slug", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "Summer Collection!!")

    expect(slugValue()).toBe("summer-collection-")
  })

  it("trims the trailing separator when the slug field loses focus", async () => {
    renderWithProviders(<BasicDetailsHarness />)

    await userEvent.type(slugInput(), "Summer Collection!!")
    await userEvent.tab()

    expect(slugValue()).toBe("summer-collection")
  })
})

describe("BasicDetailsSection while saving", () => {
  it("locks every editable field", () => {
    collectionForm.isPending = true
    renderWithProviders(<BasicDetailsHarness />)

    expect(nameInput()).toBeDisabled()
    expect(slugInput()).toBeDisabled()
    expect(screen.getByPlaceholderText("Enter collection description...")).toBeDisabled()
  })
})
