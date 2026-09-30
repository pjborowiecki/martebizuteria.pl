import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorAttributeListPanel } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

const AT = new Date("2026-01-01T00:00:00.000Z")

const definition = ({
  allowedValues = null,
  id,
  title,
  type,
}: Readonly<{
  allowedValues?: ProductAttribute["select"]["allowedValues"]
  id: string
  title: string
  type: ProductAttribute["select"]["type"]
}>): ProductAttribute["select"] => ({
  allowedValues,
  createdAt: AT,
  handle: id,
  id,
  rank: 0,
  titles: { "en-US": title, "pl-PL": `${title} PL` },
  type,
  unit: null,
  updatedAt: AT,
})

const weight = definition({ id: "attr-weight", title: "Weight", type: PRODUCT_ATTRIBUTE_TYPE.TEXT })

const metal = definition({
  allowedValues: [
    { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
    { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
  ],
  id: "attr-metal",
  title: "Metal",
  type: PRODUCT_ATTRIBUTE_TYPE.SELECT,
})

const polished = definition({ id: "attr-polished", title: "Polished", type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN })

const Harness = ({
  attributes,
  compact = false,
  emptyHintKey,
  hint,
  rows = [],
  title,
}: Readonly<{
  attributes: readonly ProductAttribute["select"][]
  compact?: boolean
  emptyHintKey?: "empty" | "emptyVariant"
  hint?: string
  rows?: readonly { attributeId: string; value: string }[]
  title?: string
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: { ...createEmptyProductFormValues(), attributeValues: [...rows] },
  })
  const current = useWatch({ control: form.control, name: "attributeValues" })

  return (
    <FormProvider {...form}>
      <ProductEditorAttributeListPanel
        attributes={attributes}
        baseName="attributeValues"
        compact={compact}
        {...(emptyHintKey === undefined ? {} : { emptyHintKey })}
        {...(hint === undefined ? {} : { hint })}
        {...(title === undefined ? {} : { title })}
      />
      <output data-testid="rows">{JSON.stringify(current)}</output>
    </FormProvider>
  )
}

const attributeSelect = (): HTMLElement => screen.getAllByRole("combobox")[0] ?? screen.getByRole("button", { name: "Add attribute" })

const addButton = (): HTMLElement => screen.getByRole("button", { name: "Add attribute" })

const rowsJson = (): string => screen.getByTestId("rows").textContent

const pickDraftAttribute = async (label: string): Promise<void> => {
  await userEvent.click(attributeSelect())
  const options = await screen.findAllByRole("option")
  const wanted = options.find((option) => option.textContent === label)

  await userEvent.click(wanted ?? attributeSelect())
}

describe("ProductEditorAttributeListPanel headings", () => {
  it("renders the title and hint it is given", () => {
    renderWithProviders(<Harness attributes={[weight]} hint="Pick a property" title="Attributes" />)

    expect(screen.getByText("Attributes")).toBeInTheDocument()
    expect(screen.getByText("Pick a property")).toBeInTheDocument()
  })

  it("omits an empty title and hint instead of rendering blank paragraphs", () => {
    renderWithProviders(<Harness attributes={[weight]} hint="" title="" />)

    expect(screen.getByRole("button", { name: "Add attribute" })).toBeInTheDocument()
    expect(screen.queryByText("Pick a property")).not.toBeInTheDocument()
  })

  it("labels the composer columns from the products namespace", () => {
    renderWithProviders(<Harness attributes={[weight]} />)

    expect(screen.getByText("Attribute")).toBeInTheDocument()
    expect(screen.getByText("Value")).toBeInTheDocument()
  })
})

describe("ProductEditorAttributeListPanel empty states", () => {
  it("prompts for the first value when the catalog has attributes", () => {
    renderWithProviders(<Harness attributes={[weight]} />)

    expect(screen.getByText("No values assigned yet. Pick an attribute and value above, then click Add attribute.")).toBeInTheDocument()
  })

  it("uses the variant wording when asked for it", () => {
    renderWithProviders(<Harness attributes={[weight]} emptyHintKey="emptyVariant" />)

    expect(
      screen.getByText("No attributes for this variant yet. Pick an attribute and value above, then click Add attribute."),
    ).toBeInTheDocument()
  })

  it("sends the admin to the attribute catalog when there is nothing to pick", () => {
    renderWithProviders(<Harness attributes={[]} />)

    expect(
      screen.getByText(
        "There are no attributes in your catalog yet. Create them under Attributes, then return here to assign them to this product.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create attribute in catalog" })).toHaveAttribute(
      "href",
      `/admin/catalog/attributes?create=${encodeURIComponent('"1"')}`,
    )
  })

  it("hides the catalog shortcut once attributes exist", () => {
    renderWithProviders(<Harness attributes={[weight]} />)

    expect(screen.queryByRole("link", { name: "Create attribute in catalog" })).not.toBeInTheDocument()
  })

  it("disables the attribute picker and the add button with an empty catalog", () => {
    renderWithProviders(<Harness attributes={[]} />)

    expect(attributeSelect()).toBeDisabled()
    expect(addButton()).toBeDisabled()
  })
})

describe("ProductEditorAttributeListPanel composer", () => {
  it("shows the placeholder until an attribute is chosen", () => {
    renderWithProviders(<Harness attributes={[weight, metal]} />)

    expect(attributeSelect()).toHaveTextContent("Choose an attribute…")
  })

  it("lists every catalog attribute by its English title", async () => {
    renderWithProviders(<Harness attributes={[weight, metal]} />)

    await userEvent.click(attributeSelect())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["Weight", "Metal"])
  })

  it("keeps the value box disabled until an attribute is chosen", () => {
    renderWithProviders(<Harness attributes={[weight]} />)

    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("enables the value box once an attribute is chosen", async () => {
    renderWithProviders(<Harness attributes={[weight]} />)
    await pickDraftAttribute("Weight")

    expect(screen.getByRole("textbox")).toBeEnabled()
  })

  it("keeps the add button disabled while the value is blank", async () => {
    renderWithProviders(<Harness attributes={[weight]} />)
    await pickDraftAttribute("Weight")

    expect(addButton()).toBeDisabled()
  })

  it("enables the add button once both halves of the draft are filled", async () => {
    renderWithProviders(<Harness attributes={[weight]} />)
    await pickDraftAttribute("Weight")
    await userEvent.type(screen.getByRole("textbox"), "14 g")

    expect(addButton()).toBeEnabled()
  })

  it("treats whitespace as no value at all", async () => {
    renderWithProviders(<Harness attributes={[weight]} />)
    await pickDraftAttribute("Weight")
    await userEvent.type(screen.getByRole("textbox"), "   ")

    expect(addButton()).toBeDisabled()
  })

  it("appends the trimmed draft to the field array", async () => {
    renderWithProviders(<Harness attributes={[weight]} />)
    await pickDraftAttribute("Weight")
    await userEvent.type(screen.getByRole("textbox"), "  14 g  ")
    await userEvent.click(addButton())

    expect(JSON.parse(rowsJson())).toStrictEqual([{ attributeId: "attr-weight", value: "14 g" }])
  })

  it("clears the draft after adding a row", async () => {
    renderWithProviders(<Harness attributes={[weight]} />)
    await pickDraftAttribute("Weight")
    await userEvent.type(screen.getByRole("textbox"), "14 g")
    await userEvent.click(addButton())

    expect(attributeSelect()).toHaveTextContent("Choose an attribute…")
    expect(addButton()).toBeDisabled()
  })

  it("drops a half-typed value when the draft attribute changes", async () => {
    renderWithProviders(<Harness attributes={[weight, polished]} />)
    await pickDraftAttribute("Weight")
    await userEvent.type(screen.getByRole("textbox"), "14 g")
    await pickDraftAttribute("Polished")

    expect(addButton()).toBeDisabled()
  })

  it("accepts a boolean choice as a complete draft value", async () => {
    renderWithProviders(<Harness attributes={[polished]} />)
    await pickDraftAttribute("Polished")
    const [, valueTrigger] = screen.getAllByRole("combobox")
    await userEvent.click(valueTrigger ?? addButton())
    const options = await screen.findAllByRole("option")
    const yes = options.find((option) => option.textContent === "Yes")
    await userEvent.click(yes ?? addButton())
    await userEvent.click(addButton())

    expect(JSON.parse(rowsJson())).toStrictEqual([{ attributeId: "attr-polished", value: "true" }])
  })
})

describe("ProductEditorAttributeListPanel existing rows", () => {
  it("renders one editable row per stored value", () => {
    renderWithProviders(
      <Harness
        attributes={[weight, metal]}
        rows={[
          { attributeId: "attr-weight", value: "14 g" },
          { attributeId: "attr-metal", value: "gold" },
        ]}
      />,
    )

    expect(screen.getAllByRole("button", { name: "Remove attribute" })).toHaveLength(2)
    expect(
      screen.queryByText("No values assigned yet. Pick an attribute and value above, then click Add attribute."),
    ).not.toBeInTheDocument()
  })

  it("resolves the stored select value to its localized label", () => {
    renderWithProviders(<Harness attributes={[metal]} rows={[{ attributeId: "attr-metal", value: "gold" }]} />)
    const triggers = screen.getAllByRole("combobox")

    expect(triggers.at(-1)).toHaveTextContent("Gold")
  })

  it("drops the row the admin removes", async () => {
    renderWithProviders(
      <Harness
        attributes={[weight, metal]}
        rows={[
          { attributeId: "attr-weight", value: "14 g" },
          { attributeId: "attr-metal", value: "gold" },
        ]}
      />,
    )
    const [firstRemove] = screen.getAllByRole("button", { name: "Remove attribute" })
    await userEvent.click(firstRemove ?? addButton())

    expect(JSON.parse(rowsJson())).toStrictEqual([{ attributeId: "attr-metal", value: "gold" }])
  })

  it("returns to the empty state after the last row is removed", async () => {
    renderWithProviders(<Harness attributes={[weight]} rows={[{ attributeId: "attr-weight", value: "14 g" }]} />)
    const [firstRemove] = screen.getAllByRole("button", { name: "Remove attribute" })
    await userEvent.click(firstRemove ?? addButton())

    expect(screen.getByText("No values assigned yet. Pick an attribute and value above, then click Add attribute.")).toBeInTheDocument()
  })

  it("keeps the rows readable in the compact layout", () => {
    renderWithProviders(<Harness attributes={[weight]} compact rows={[{ attributeId: "attr-weight", value: "14 g" }]} />)

    expect(screen.getByRole("button", { name: "Remove attribute" })).toBeInTheDocument()
  })
})
