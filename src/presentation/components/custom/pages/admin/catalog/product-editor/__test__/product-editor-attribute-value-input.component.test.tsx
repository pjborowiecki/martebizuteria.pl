import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import {
  type ProductEditorAttributeDefinition,
  ProductEditorAttributeValueInput,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value-input"

afterEach(cleanup)

beforeAll(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

const ALLOWED: ProductAttribute["allowedValue"][] = [
  { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
  { labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" },
]

const renderInput = (definition: ProductEditorAttributeDefinition | undefined, value: string, disabled = false) => {
  const onChange = vi.fn<(next: string) => void>()

  renderWithProviders(<ProductEditorAttributeValueInput definition={definition} disabled={disabled} onChange={onChange} value={value} />)

  return onChange
}

describe("free text attribute values", () => {
  it("falls back to a text box when no definition is known", () => {
    renderInput(undefined, "18k gold")

    const input = screen.getByRole("textbox")

    expect(input).toHaveValue("18k gold")
    expect(input).toHaveAttribute("placeholder", "Value for this product")
    expect(input).toHaveAttribute("inputmode", "text")
  })

  it("reports every keystroke to the form", async () => {
    const onChange = renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.TEXT }, "")

    await userEvent.type(screen.getByRole("textbox"), "ab")

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith("b")
  })

  it("caps the text at the stored column length", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.TEXT }, "")

    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", String(ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value))
  })

  it("disables the box when the row is read only", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.TEXT }, "gold", true)

    expect(screen.getByRole("textbox")).toBeDisabled()
  })
})

describe("number attribute values", () => {
  it("asks for the decimal keypad when the attribute has no unit", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.NUMBER, unit: null }, "12.5")

    const input = screen.getByRole("textbox")

    expect(input).toHaveAttribute("inputmode", "decimal")
    expect(input).toHaveValue("12.5")
  })

  it("treats a blank unit as no unit", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.NUMBER, unit: "   " }, "12")

    expect(screen.queryByText("g")).not.toBeInTheDocument()
  })

  it("shows the trimmed unit beside the value", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.NUMBER, unit: "  g  " }, "12")

    expect(screen.getByText("g")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "decimal")
  })

  it("reports the typed number", async () => {
    const onChange = renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.NUMBER, unit: "g" }, "")

    await userEvent.type(screen.getByRole("textbox"), "9")

    expect(onChange).toHaveBeenCalledExactlyOnceWith("9")
  })
})

describe("boolean attribute values", () => {
  it("shows the localized yes label for a stored true", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }, "true")

    expect(screen.getByRole("combobox")).toHaveTextContent("Yes")
  })

  it("shows the localized no label for a stored false", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }, "false")

    expect(screen.getByRole("combobox")).toHaveTextContent("No")
  })

  it("falls back to the placeholder for a value that is neither", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }, "maybe")

    expect(screen.getByRole("combobox")).toHaveTextContent("Choose…")
  })

  it("stores the literal the picked option carries", async () => {
    const onChange = renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }, "")

    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")
    const no = options.find((item) => item.textContent === "No")
    await userEvent.click(no ?? screen.getByRole("combobox"))

    expect(onChange).toHaveBeenCalledExactlyOnceWith("false")
  })
})

describe("select attribute values", () => {
  it("labels the stored key with the locale label", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "silver")

    expect(screen.getByRole("combobox")).toHaveTextContent("Silver")
  })

  it("prompts for a choice when nothing is stored", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "")

    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a value…")
  })

  it("offers every allowed value", async () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "")

    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["Gold", "Silver"])
  })

  it("stores the key rather than the label", async () => {
    const onChange = renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "")

    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")
    const gold = options.find((item) => item.textContent === "Gold")
    await userEvent.click(gold ?? screen.getByRole("combobox"))

    expect(onChange).toHaveBeenCalledExactlyOnceWith("gold")
  })

  it("degrades to a text box when the attribute declares no allowed values", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "gold")

    expect(screen.getByRole("textbox")).toHaveValue("gold")
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })
})

describe("multiselect attribute values", () => {
  it("degrades to a text box when the attribute declares no allowed values", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, '["gold"]')

    expect(screen.getByRole("textbox")).toHaveValue('["gold"]')
  })

  it("prompts for a choice when nothing is selected", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, "")

    expect(screen.getByLabelText("Value")).toHaveTextContent("Choose a value…")
  })

  it("names the selected keys with their locale labels", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, '["gold","silver"]')

    const trigger = screen.getByLabelText("Value")

    expect(trigger).toHaveTextContent("Gold")
    expect(trigger).toHaveTextContent("Silver")
  })

  it("reads a legacy comma separated value as a selection", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, "gold, silver")

    expect(screen.getByLabelText("Value")).toHaveTextContent("Gold")
  })

  it("stores the picked keys as a json array", async () => {
    const onChange = renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, "")

    await userEvent.click(screen.getByLabelText("Value"))
    await userEvent.click(await screen.findByText("Gold"))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('["gold"]')
  })

  it("drops a key the admin unticks", async () => {
    const onChange = renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, '["gold","silver"]')

    await userEvent.click(screen.getByLabelText("Value"))
    const options = await screen.findAllByRole("option")
    const gold = options.find((item) => item.textContent === "Gold")
    await userEvent.click(gold ?? screen.getByLabelText("Value"))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('["silver"]')
  })

  it("locks the picker when the row is read only", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }, "", true)

    expect(screen.getByLabelText("Value")).toBeDisabled()
  })
})

describe("read only attribute values", () => {
  it("locks the boolean picker", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }, "true", true)

    expect(screen.getByRole("combobox")).toBeDisabled()
  })

  it("locks the allowed value picker", () => {
    renderInput({ allowedValues: ALLOWED, type: PRODUCT_ATTRIBUTE_TYPE.SELECT }, "gold", true)

    expect(screen.getByRole("combobox")).toBeDisabled()
  })

  it("locks the number box that carries a unit", () => {
    renderInput({ allowedValues: null, type: PRODUCT_ATTRIBUTE_TYPE.NUMBER, unit: "g" }, "12", true)

    expect(screen.getByRole("textbox")).toBeDisabled()
  })
})
