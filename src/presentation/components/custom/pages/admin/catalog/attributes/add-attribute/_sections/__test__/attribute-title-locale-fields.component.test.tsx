import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Control, useForm, useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

type AttributeFormValues = ProductAttribute["formValues"]

const { form, localeState } = vi.hoisted(
  (): {
    form: { control?: Control<AttributeFormValues> }
    localeState: { activeLocale: SupportedLocale }
  } => ({ form: {}, localeState: { activeLocale: "pl-PL" } }),
)

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider", () => ({
  useAttributeForm: () => ({ control: form.control }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker", () => ({
  useCatalogActiveLocale: () => localeState.activeLocale,
}))

import { AttributeTitleLocaleFields } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-title-locale-fields"

afterEach(cleanup)

const COPY = {
  hint: (locale: SupportedLocale) => `Shown to shoppers in ${locale}`,
  label: (locale: SupportedLocale) => `Name (${locale})`,
  placeholder: (locale: SupportedLocale) => `e.g. Material (${locale})`,
}

const defaults = (titles: AttributeFormValues["titles"]): AttributeFormValues => ({
  allowedValues: [],
  handle: "material",
  titles,
  type: "text",
  unit: "",
})

const onDefaultLocaleChange = vi.fn<(value: string) => void>()

const FieldsHarness = ({
  disabled = false,
  error,
  titles = { "en-US": "", "pl-PL": "" },
}: Readonly<{
  disabled?: boolean
  error?: string
  titles?: AttributeFormValues["titles"]
}>): JSX.Element => {
  const { control, setError } = useForm<AttributeFormValues>({ defaultValues: defaults(titles) })
  form.control = control
  const current = useWatch({ control, name: "titles" })
  if (error !== undefined) {
    setError(`titles.${localeState.activeLocale}`, { message: error })
  }

  return (
    <div>
      <AttributeTitleLocaleFields
        copy={COPY}
        disabled={disabled}
        onDefaultLocaleChange={onDefaultLocaleChange}
        required
        translateValidation={(key) => (key === "form.validation.titleRequired" ? "Enter an attribute name." : key)}
        validationKeySet={new Set(["form.validation.titleRequired"])}
      />
      <output data-testid="pl">{current["pl-PL"]}</output>
      <output data-testid="en">{current["en-US"]}</output>
    </div>
  )
}

const input = () => screen.getByRole("textbox")

beforeEach(() => {
  localeState.activeLocale = "pl-PL"
  onDefaultLocaleChange.mockReset()
})

describe("AttributeTitleLocaleFields", () => {
  it("labels and hints the field for the locale being edited", () => {
    renderWithProviders(<FieldsHarness />)

    expect(screen.getByText("Name (pl-PL)")).toBeInTheDocument()
    expect(input()).toHaveAttribute("placeholder", "e.g. Material (pl-PL)")
  })

  it("follows the locale picker to the other language", () => {
    localeState.activeLocale = "en-US"
    renderWithProviders(<FieldsHarness titles={{ "en-US": "Material", "pl-PL": "Materiał" }} />)

    expect(screen.getByText("Name (en-US)")).toBeInTheDocument()
    expect(input()).toHaveValue("Material")
  })

  it("counts the characters against the column limit", () => {
    renderWithProviders(<FieldsHarness titles={{ "en-US": "", "pl-PL": "Materiał" }} />)

    expect(screen.getByText("8/255")).toBeInTheDocument()
    expect(input()).toHaveAttribute("maxLength", "255")
  })

  it("writes what is typed into the locale being edited", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(input(), "Materiał")

    expect(screen.getByTestId("pl")).toHaveTextContent("Materiał")
    expect(screen.getByTestId("en")).toBeEmptyDOMElement()
  })

  it("reports every keystroke in the default locale so the handle can follow", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(input(), "Mat")

    expect(onDefaultLocaleChange).toHaveBeenLastCalledWith("Mat")
  })

  it("stays silent while a secondary locale is edited", async () => {
    localeState.activeLocale = "en-US"
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(input(), "Material")

    expect(onDefaultLocaleChange).not.toHaveBeenCalled()
    expect(screen.getByTestId("en")).toHaveTextContent("Material")
  })

  it("blocks editing while the form is busy", () => {
    renderWithProviders(<FieldsHarness disabled />)

    expect(input()).toBeDisabled()
  })

  it("translates a known validation key and marks the field invalid", async () => {
    renderWithProviders(<FieldsHarness error="form.validation.titleRequired" />)

    expect(await screen.findByText("Enter an attribute name.")).toBeInTheDocument()
    expect(input()).toHaveAttribute("aria-invalid", "true")
  })
})
