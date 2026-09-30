import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { createProductAttribute, updateProductAttribute } = vi.hoisted(() => ({
  createProductAttribute: vi.fn(),
  updateProductAttribute: vi.fn(),
}))

vi.mock("~/src/modules/product-attribute/use-cases/create-product-attribute", () => ({ createProductAttribute }))
vi.mock("~/src/modules/product-attribute/use-cases/update-product-attribute", () => ({ updateProductAttribute }))

import { PRODUCT_ATTRIBUTE_TYPE } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { ValueSettingsSection } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/value-settings-section"
import { AttributeFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import { AttributeFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-layout"
import {
  type AttributeFormMode,
  AttributeFormProvider,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"

const CREATED_AT = new Date("2026-02-01T00:00:00.000Z")

const attribute = (overrides: Partial<ProductAttribute["adminListItem"]> = {}): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: CREATED_AT,
  handle: "materials",
  id: "attribute-1",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: PRODUCT_ATTRIBUTE_TYPE.TEXT,
  unit: null,
  updatedAt: CREATED_AT,
  ...overrides,
})

const dismiss = vi.fn<() => void>()

const renderSection = (mode: AttributeFormMode, record?: ProductAttribute["adminListItem"]): void => {
  renderWithProviders(
    <AttributeFormLocaleControlsProvider>
      <AttributeFormProvider attribute={record} mode={mode} open onDismiss={dismiss}>
        <AttributeFormLocaleLayout>
          <ValueSettingsSection />
        </AttributeFormLocaleLayout>
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

describe("ValueSettingsSection", () => {
  it("titles the section and labels the type select", () => {
    renderSection("create")

    expect(screen.getByText("Value settings")).toBeInTheDocument()
    expect(screen.getByLabelText("Value type")).toBeInTheDocument()
  })

  it("starts a new attribute on the text type", () => {
    renderSection("create")

    expect(screen.getByLabelText("Value type").textContent).toContain("Text")
  })

  it("shows neither allowed values nor a unit for a text attribute", () => {
    renderSection("create")

    expect(screen.queryByText("Allowed values")).not.toBeInTheDocument()
    expect(screen.queryByText("Unit")).not.toBeInTheDocument()
  })

  it("offers the unit field only for a number attribute", () => {
    renderSection("edit", attribute({ type: PRODUCT_ATTRIBUTE_TYPE.NUMBER, unit: "mm" }))

    expect(screen.getByLabelText("Value type").textContent).toContain("Number")
    expect(screen.getByText("Unit")).toBeInTheDocument()
    expect(screen.queryByText("Allowed values")).not.toBeInTheDocument()
  })

  it("offers allowed values for a single choice attribute", () => {
    renderSection("edit", attribute({ type: PRODUCT_ATTRIBUTE_TYPE.SELECT }))

    expect(screen.getByLabelText("Value type").textContent).toContain("Single choice")
    expect(screen.getByText("Allowed values")).toBeInTheDocument()
    expect(screen.queryByText("Unit")).not.toBeInTheDocument()
  })

  it("offers allowed values for a multiple choice attribute", () => {
    renderSection("edit", attribute({ type: PRODUCT_ATTRIBUTE_TYPE.MULTISELECT }))

    expect(screen.getByText("Allowed values")).toBeInTheDocument()
  })

  it("shows no allowed values for a yes or no attribute", () => {
    renderSection("edit", attribute({ type: PRODUCT_ATTRIBUTE_TYPE.BOOLEAN }))

    expect(screen.getByLabelText("Value type").textContent).toContain("Yes / No")
    expect(screen.queryByText("Allowed values")).not.toBeInTheDocument()
  })

  it("keeps the type select enabled while nothing is being saved", () => {
    renderSection("create")

    expect(screen.getByLabelText("Value type")).not.toBeDisabled()
  })

  it("switches the attribute to the chosen type", async () => {
    renderSection("create")

    await userEvent.click(screen.getByLabelText("Value type"))
    await userEvent.click(await screen.findByRole("option", { name: "Number" }))

    expect(screen.getByLabelText("Value type").textContent).toContain("Number")
    expect(screen.getByText("Unit")).toBeInTheDocument()
  })

  it("reveals the allowed values once a choice type is picked", async () => {
    renderSection("create")

    await userEvent.click(screen.getByLabelText("Value type"))
    await userEvent.click(await screen.findByRole("option", { name: "Multiple choice" }))

    expect(screen.getByText("Allowed values")).toBeInTheDocument()
    expect(screen.queryByText("Unit")).not.toBeInTheDocument()
  })

  it("offers every supported value type", async () => {
    renderSection("create")

    await userEvent.click(screen.getByLabelText("Value type"))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["Text", "Number", "Yes / No", "Single choice", "Multiple choice"])
  })
})
