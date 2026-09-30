import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { createProductAttribute, updateProductAttribute } = vi.hoisted(() => ({
  createProductAttribute: vi.fn(),
  updateProductAttribute: vi.fn(),
}))

vi.mock("~/src/modules/product-attribute/use-cases/create-product-attribute", () => ({ createProductAttribute }))
vi.mock("~/src/modules/product-attribute/use-cases/update-product-attribute", () => ({ updateProductAttribute }))

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { AttributeAllowedValuesField } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-allowed-values-field"
import { AttributeFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import {
  AttributeFormProvider,
  useAttributeForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"
import { CatalogLocalePickerProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"

const CREATED_AT = new Date("2026-02-01T00:00:00.000Z")

const SMALL: ProductAttribute["allowedValue"] = { labels: { "en-US": "Small", "pl-PL": "Małe" }, value: "male" }

const LARGE: ProductAttribute["allowedValue"] = { labels: { "en-US": "Large", "pl-PL": "Duże" }, value: "duze" }

const attribute = (allowedValues: readonly ProductAttribute["allowedValue"][] | null): ProductAttribute["adminListItem"] => ({
  allowedValues: allowedValues === null ? null : allowedValues.map((entry) => ({ ...entry })),
  createdAt: CREATED_AT,
  handle: "size",
  id: "attribute-1",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
  type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
  unit: null,
  updatedAt: CREATED_AT,
})

const ValueKeysProbe = (): JSX.Element => {
  const { control } = useAttributeForm()
  const rows = useWatch({ control, name: "allowedValues" })

  return <p data-testid="value-keys">{rows.map((row) => row.value).join("|")}</p>
}

const SubmitProbe = (): JSX.Element => {
  const { onFormSubmit } = useAttributeForm()

  return (
    <button onClick={onFormSubmit} type="button">
      run-validation
    </button>
  )
}

const dismiss = vi.fn<() => void>()

const renderField = (allowedValues: readonly ProductAttribute["allowedValue"][] | null, locale: SupportedLocale = "pl-PL"): void => {
  renderWithProviders(
    <AttributeFormLocaleControlsProvider>
      <AttributeFormProvider attribute={attribute(allowedValues)} mode="edit" open onDismiss={dismiss}>
        <CatalogLocalePickerProvider activeLocale={locale}>
          <AttributeAllowedValuesField />
          <ValueKeysProbe />
          <SubmitProbe />
        </CatalogLocalePickerProvider>
      </AttributeFormProvider>
    </AttributeFormLocaleControlsProvider>,
  )
}

const valueKeys = (): string => screen.getByTestId("value-keys").textContent

const firstOf = (elements: readonly HTMLElement[]): HTMLElement => {
  const [first] = elements
  if (first === undefined) {
    throw new Error("expected at least one matching element")
  }

  return first
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe("AttributeAllowedValuesField", () => {
  it("labels the field and offers a way to add an option", () => {
    renderField(null)

    expect(screen.getByText("Allowed values")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add option" })).toBeInTheDocument()
  })

  it("renders one label input per stored option in the active language", () => {
    renderField([SMALL, LARGE])

    const inputs = screen.getAllByLabelText("Label (PL)")

    expect(inputs).toHaveLength(2)
    expect(firstOf(inputs)).toHaveValue("Małe")
    expect(inputs.at(-1)).toHaveValue("Duże")
  })

  it("renders the English labels when English is the active language", () => {
    renderField([SMALL, LARGE], "en-US")

    const inputs = screen.getAllByLabelText("Label (EN)")

    expect(inputs).toHaveLength(2)
    expect(firstOf(inputs)).toHaveValue("Small")
    expect(inputs.at(-1)).toHaveValue("Large")
  })

  it("counts the typed characters against the column limit", () => {
    renderField([SMALL])

    expect(screen.getByText("4/255")).toBeInTheDocument()
  })

  it("keeps the option label within the column limit", () => {
    renderField([SMALL])

    expect(screen.getByLabelText("Label (PL)")).toHaveAttribute("maxlength", "255")
  })
})

describe("adding an allowed value", () => {
  it("appends an empty row with a generated draft key", async () => {
    renderField([SMALL])

    await userEvent.click(screen.getByRole("button", { name: "Add option" }))

    expect(valueKeys()).toBe("male|opcja-2")
    expect(screen.getAllByLabelText("Label (PL)")).toHaveLength(2)
  })

  it("numbers the first draft key from one when there are no options yet", async () => {
    renderField(null)

    await userEvent.click(screen.getByRole("button", { name: "Add option" }))

    expect(valueKeys()).toBe("opcja-1")
  })

  it("skips a draft key an existing option already occupies", async () => {
    renderField([{ labels: { "en-US": "Option two", "pl-PL": "Opcja druga" }, value: "opcja-2" }])

    await userEvent.click(screen.getByRole("button", { name: "Add option" }))

    expect(valueKeys()).toBe("opcja-2|opcja-3")
  })
})

describe("removing an allowed value", () => {
  it("drops the row the admin removed", async () => {
    renderField([SMALL, LARGE])

    await userEvent.click(firstOf(screen.getAllByRole("button", { name: "Remove option" })))

    expect(valueKeys()).toBe("duze")
    expect(screen.getAllByLabelText("Label (PL)")).toHaveLength(1)
  })

  it("clears a pending allowed-values error when a row goes away", async () => {
    renderField(null)

    await userEvent.click(screen.getByRole("button", { name: "Add option" }))
    await userEvent.click(screen.getByRole("button", { name: "run-validation" }))

    expect(screen.getByText("Fill in this field for the selected language.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remove option" }))

    expect(screen.queryByText("Fill in this field for the selected language.")).not.toBeInTheDocument()
  })
})

describe("the stored option key", () => {
  it("follows the slug of the default-locale label", () => {
    renderField([SMALL])

    fireEvent.change(screen.getByLabelText("Label (PL)"), { target: { value: "Bardzo Duże" } })

    expect(valueKeys()).toBe("bardzo-duze")
  })

  it("keeps the previous key when the label has nothing to slug", () => {
    renderField([SMALL])

    fireEvent.change(screen.getByLabelText("Label (PL)"), { target: { value: "!!!" } })

    expect(valueKeys()).toBe("male")
  })

  it("keeps the previous key when the slug belongs to another option", () => {
    renderField([SMALL, LARGE])

    fireEvent.change(firstOf(screen.getAllByLabelText("Label (PL)")), { target: { value: "Duże" } })

    expect(valueKeys()).toBe("male|duze")
  })

  it("is left alone when a non-default locale label changes", () => {
    renderField([SMALL], "en-US")

    fireEvent.change(screen.getByLabelText("Label (EN)"), { target: { value: "Extra large" } })

    expect(valueKeys()).toBe("male")
    expect(screen.getByLabelText("Label (EN)")).toHaveValue("Extra large")
  })
})

describe("allowed value validation", () => {
  it("asks for at least one option when a choice attribute has none", async () => {
    renderField(null)

    await userEvent.click(screen.getByRole("button", { name: "run-validation" }))

    expect(screen.getByText("Add at least one allowed value for this type.")).toBeInTheDocument()
  })

  it("marks the empty label of a freshly added option", async () => {
    renderField(null)

    await userEvent.click(screen.getByRole("button", { name: "Add option" }))
    await userEvent.click(screen.getByRole("button", { name: "run-validation" }))

    expect(screen.getByText("Fill in this field for the selected language.")).toBeInTheDocument()
    expect(screen.getByLabelText("Label (PL)")).toHaveAttribute("aria-invalid", "true")
  })

  it("clears the label error as soon as the admin types", async () => {
    renderField(null)

    await userEvent.click(screen.getByRole("button", { name: "Add option" }))
    await userEvent.click(screen.getByRole("button", { name: "run-validation" }))
    fireEvent.change(screen.getByLabelText("Label (PL)"), { target: { value: "Średnie" } })

    expect(screen.queryByText("Fill in this field for the selected language.")).not.toBeInTheDocument()
    expect(valueKeys()).toBe("srednie")
  })

  it("reports the blur the controller registered", () => {
    renderField([SMALL])

    fireEvent.blur(screen.getByLabelText("Label (PL)"))

    expect(screen.getByLabelText("Label (PL)")).toHaveValue("Małe")
  })
})
