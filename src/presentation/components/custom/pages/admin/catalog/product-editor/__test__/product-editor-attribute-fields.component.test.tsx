import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorAttributeFields } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-fields"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const AT = new Date("2026-01-01T00:00:00.000Z")

const definition = (
  id: string,
  type: ProductAttribute["select"]["type"],
  extras: Partial<ProductAttribute["select"]> = {},
): ProductAttribute["select"] => ({
  allowedValues: null,
  createdAt: AT,
  handle: id,
  id,
  rank: 0,
  titles: { "en-US": id, "pl-PL": id },
  type,
  unit: null,
  updatedAt: AT,
  ...extras,
})

const ATTRIBUTES = new Map<string, ProductAttribute["select"]>([
  ["attr-text", definition("attr-text", "text")],
  ["attr-weight", definition("attr-weight", "number", { unit: " g " })],
  ["attr-flag", definition("attr-flag", "boolean")],
  [
    "attr-metal",
    definition("attr-metal", "select", {
      allowedValues: [
        { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
        { labels: { "en-US": "Gold", "pl-PL": "Zloto" }, value: "gold" },
      ],
    }),
  ],
])

const OPTIONS = [
  { label: "Material", value: "attr-text" },
  { label: "Weight", value: "attr-weight" },
  { label: "Gift ready", value: "attr-flag" },
  { label: "Metal", value: "attr-metal" },
]

const forms: { current?: UseFormReturn<ProductFormValues> } = {}

const removed: (number | number[] | undefined)[] = []

const FieldsHarness = ({
  attributeId,
  value,
}: Readonly<{
  attributeId: string
  value: string
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: { ...createEmptyProductFormValues(), attributeValues: [{ attributeId, value }] },
  })
  forms.current = form

  return (
    <FormProvider {...form}>
      <ProductEditorAttributeFields
        attributeOptions={OPTIONS}
        attributesById={ATTRIBUTES}
        baseName="attributeValues"
        index={0}
        onRemove={(index) => {
          removed.push(index)
        }}
      />
    </FormProvider>
  )
}

const comboboxAt = (position: number): HTMLElement => {
  const trigger = screen.getAllByRole("combobox")[position]
  if (trigger === undefined) {
    throw new Error(`No combobox rendered at position ${position}`)
  }

  return trigger
}

const attributeTrigger = () => comboboxAt(0)

const valueTrigger = () => comboboxAt(1)

const pickAttribute = async (label: string) => {
  await userEvent.click(attributeTrigger())
  const options = await screen.findAllByRole("option")
  const target = options.find((option) => option.textContent === label)
  if (target === undefined) {
    throw new Error(`No attribute option labelled ${label}`)
  }
  await userEvent.click(target)
}

beforeEach(() => {
  removed.length = 0
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(() => {
  cleanup()
})

describe("ProductEditorAttributeFields layout", () => {
  it("labels the attribute and value columns and the remove action", () => {
    renderWithProviders(<FieldsHarness attributeId="" value="" />)

    expect(screen.getByText("Attribute")).toBeInTheDocument()
    expect(screen.getByText("Value")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove attribute" })).toBeInTheDocument()
  })

  it("explains both columns through the catalog form hints", () => {
    renderWithProviders(<FieldsHarness attributeId="" value="" />)

    expect(
      screen.getByLabelText("Attribute from your catalog (e.g. weight, colour). Create it under Attributes if it is missing."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Value of that property for this product only (e.g. 14 g or silver).")).toBeInTheDocument()
  })

  it("prompts for an attribute and locks the value until one is chosen", () => {
    renderWithProviders(<FieldsHarness attributeId="" value="" />)

    expect(attributeTrigger()).toHaveTextContent("Choose an attribute…")
    expect(screen.getByPlaceholderText("Value for this product")).toBeDisabled()
  })

  it("unlocks the value input once the row names an attribute", () => {
    renderWithProviders(<FieldsHarness attributeId="attr-text" value="18k gold" />)

    const input = screen.getByPlaceholderText("Value for this product")

    expect(input).toBeEnabled()
    expect(input).toHaveValue("18k gold")
  })
})

describe("ProductEditorAttributeFields value editor per attribute type", () => {
  it("renders a plain text box for a text attribute", () => {
    renderWithProviders(<FieldsHarness attributeId="attr-text" value="silver" />)

    expect(screen.getByPlaceholderText("Value for this product")).toHaveAttribute("inputmode", "text")
  })

  it("renders a decimal box with the unit for a number attribute", () => {
    renderWithProviders(<FieldsHarness attributeId="attr-weight" value="14" />)

    expect(screen.getByPlaceholderText("Value for this product")).toHaveAttribute("inputmode", "decimal")
    expect(screen.getByText("g")).toBeInTheDocument()
  })

  it("renders a yes or no chooser for a boolean attribute", () => {
    renderWithProviders(<FieldsHarness attributeId="attr-flag" value="true" />)

    expect(valueTrigger()).toHaveTextContent("Yes")
  })

  it("renders the allowed values of a select attribute in the admin locale", () => {
    renderWithProviders(<FieldsHarness attributeId="attr-metal" value="gold" />)

    expect(valueTrigger()).toHaveTextContent("Gold")
  })
})

describe("ProductEditorAttributeFields editing", () => {
  it("writes typed text back to the form row", async () => {
    renderWithProviders(<FieldsHarness attributeId="attr-text" value="" />)

    await userEvent.type(screen.getByPlaceholderText("Value for this product"), "brass")

    expect(forms.current?.getValues("attributeValues.0.value")).toBe("brass")
  })

  it("clears the stale value when the chosen attribute changes", async () => {
    renderWithProviders(<FieldsHarness attributeId="attr-text" value="18k gold" />)

    await pickAttribute("Weight")

    expect(forms.current?.getValues("attributeValues.0.attributeId")).toBe("attr-weight")
    expect(forms.current?.getValues("attributeValues.0.value")).toBe("")
  })

  it("asks its owner to drop this row by index", async () => {
    renderWithProviders(<FieldsHarness attributeId="attr-text" value="18k gold" />)

    await userEvent.click(screen.getByRole("button", { name: "Remove attribute" }))

    expect(removed).toStrictEqual([0])
  })
})
