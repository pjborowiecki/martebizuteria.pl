import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { createProductAttribute, updateProductAttribute } = vi.hoisted(() => ({
  createProductAttribute: vi.fn(),
  updateProductAttribute: vi.fn(),
}))

vi.mock("~/src/modules/product-attribute/use-cases/create-product-attribute", () => ({ createProductAttribute }))
vi.mock("~/src/modules/product-attribute/use-cases/update-product-attribute", () => ({ updateProductAttribute }))

import { PRODUCT_ATTRIBUTE_COLUMN_LENGTH, PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { AttributeUnitField } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-unit-field"
import { AttributeFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import { AttributeFormProvider } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"

const CREATED_AT = new Date("2026-02-01T00:00:00.000Z")

const numberAttribute = (unit: string | null): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: CREATED_AT,
  handle: "length",
  id: "attribute-1",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Length", "pl-PL": "Długość" },
  type: PRODUCT_ATTRIBUTE_TYPE.NUMBER,
  unit,
  updatedAt: CREATED_AT,
})

const dismiss = vi.fn<() => void>()

const renderUnitField = (unit: string | null, disabled = false): void => {
  renderWithProviders(
    <AttributeFormLocaleControlsProvider>
      <AttributeFormProvider attribute={numberAttribute(unit)} mode="edit" open onDismiss={dismiss}>
        <AttributeUnitField disabled={disabled} />
      </AttributeFormProvider>
    </AttributeFormLocaleControlsProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

afterEach(() => {
  cleanup()
})

describe("AttributeUnitField", () => {
  it("labels the unit select", () => {
    renderUnitField(null)

    expect(screen.getByLabelText("Unit")).toBeInTheDocument()
  })

  it("prompts for a unit and hides the custom input when the attribute has none", () => {
    renderUnitField(null)

    expect(screen.getByLabelText("Unit").textContent).toContain("Select unit")
    expect(screen.queryByPlaceholderText("e.g. ct, in")).not.toBeInTheDocument()
  })

  it("selects a preset unit without opening the custom input", () => {
    renderUnitField("mm")

    expect(screen.getByLabelText("Unit").textContent).toContain("mm")
    expect(screen.queryByPlaceholderText("e.g. ct, in")).not.toBeInTheDocument()
  })

  it("opens the custom input for a unit that is not a preset", () => {
    renderUnitField("ct")

    expect(screen.getByLabelText("Unit").textContent).toContain("Custom unit")
    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveValue("ct")
  })

  it("limits a custom unit to the length the column allows", () => {
    renderUnitField("ct")

    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveAttribute("maxlength", String(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.unit))
  })

  it("keeps the custom unit the admin types", async () => {
    renderUnitField("ct")

    await userEvent.type(screen.getByPlaceholderText("e.g. ct, in"), "w")

    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveValue("ctw")
  })

  it("disables both controls while the attribute is being saved", () => {
    renderUnitField("ct", true)

    expect(screen.getByLabelText("Unit")).toBeDisabled()
    expect(screen.getByPlaceholderText("e.g. ct, in")).toBeDisabled()
  })
})

describe("AttributeUnitField picking a unit", () => {
  it("switches the stored unit to the chosen preset", async () => {
    renderUnitField("ct")

    await userEvent.click(screen.getByLabelText("Unit"))
    await userEvent.click(await screen.findByRole("option", { name: "kg" }))

    expect(screen.getByLabelText("Unit").textContent).toContain("kg")
    expect(screen.queryByPlaceholderText("e.g. ct, in")).not.toBeInTheDocument()
  })

  it("opens an empty custom input when the admin asks for a custom unit", async () => {
    renderUnitField("mm")

    await userEvent.click(screen.getByLabelText("Unit"))
    await userEvent.click(await screen.findByRole("option", { name: "Custom unit…" }))

    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveValue("mm")
    expect(screen.getByLabelText("Unit").textContent).toContain("Custom unit")
  })

  it("clears the unit back to the placeholder", async () => {
    renderUnitField("mm")

    await userEvent.click(screen.getByLabelText("Unit"))
    await userEvent.click(await screen.findByRole("option", { name: "No unit" }))

    expect(screen.getByLabelText("Unit").textContent).toContain("Select unit")
    expect(screen.queryByPlaceholderText("e.g. ct, in")).not.toBeInTheDocument()
  })

  it("keeps the custom input open while the admin clears it to retype", async () => {
    renderUnitField("ct")

    await userEvent.clear(screen.getByPlaceholderText("e.g. ct, in"))

    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveValue("")

    await userEvent.type(screen.getByPlaceholderText("e.g. ct, in"), "ct")

    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveValue("ct")
  })

  it("keeps the custom input open once the admin types into it", async () => {
    renderUnitField("mm")

    await userEvent.click(screen.getByLabelText("Unit"))
    await userEvent.click(await screen.findByRole("option", { name: "Custom unit…" }))
    await userEvent.type(screen.getByPlaceholderText("e.g. ct, in"), "w")

    expect(screen.getByPlaceholderText("e.g. ct, in")).toHaveValue("mmw")
    expect(screen.getByLabelText("Unit").textContent).toContain("Custom unit")
  })
})
