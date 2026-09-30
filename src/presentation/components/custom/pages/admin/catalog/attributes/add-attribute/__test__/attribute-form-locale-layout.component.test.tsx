import { type JSX, useCallback } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { AttributeFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import { AttributeFormLocaleLayout } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-layout"
import {
  AttributeForm,
  AttributeFormProvider,
  useAttributeForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"
import { AttributeSheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-sheet-footer"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("~/src/modules/product-attribute/use-cases/create-product-attribute", () => ({ createProductAttribute: vi.fn() }))
vi.mock("~/src/modules/product-attribute/use-cases/update-product-attribute", () => ({ updateProductAttribute: vi.fn() }))

const attribute = (overrides: Partial<ProductAttribute["adminListItem"]> = {}): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  handle: "material",
  id: "attribute-material",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: "text",
  unit: "",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

const TranslateEverything = (): JSX.Element => {
  const { setValue } = useAttributeForm()
  const fill = useCallback(() => {
    setValue("titles", { "en-US": "Material", "pl-PL": "Material" })
  }, [setValue])

  return (
    <button onClick={fill} type="button">
      translate
    </button>
  )
}

const renderLayout = ({ mode, row }: { mode: "create" | "edit"; row?: ProductAttribute["adminListItem"] }) =>
  renderWithProviders(
    <AttributeFormLocaleControlsProvider>
      <AttributeFormProvider attribute={row} mode={mode} onDismiss={vi.fn<() => void>()} open>
        <AttributeForm>
          <AttributeFormLocaleLayout>
            <p>attribute fields</p>
            <TranslateEverything />
          </AttributeFormLocaleLayout>
        </AttributeForm>
        <AttributeSheetFooter />
      </AttributeFormProvider>
    </AttributeFormLocaleControlsProvider>,
  )

describe("AttributeFormLocaleLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("starts on the polish locale and renders the form body", () => {
    renderLayout({ mode: "create" })

    expect(screen.getByLabelText("Language")).toHaveTextContent("PL-PL")
    expect(screen.getByText("attribute fields")).toBeInTheDocument()
  })

  it("explains that the count covers names and option labels", () => {
    renderLayout({ mode: "create" })

    expect(screen.getByText("· name and option labels in each language")).toBeInTheDocument()
  })

  it("counts no locale as complete for a blank new attribute", () => {
    renderLayout({ mode: "create" })

    expect(screen.getByText(/0 of 2 filled/u)).toBeInTheDocument()
  })

  it("counts both locales as complete for a fully translated text attribute", () => {
    renderLayout({ mode: "edit", row: attribute() })

    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("counts only the translated locale when a title is missing", () => {
    renderLayout({ mode: "edit", row: attribute({ titles: { "en-US": "", "pl-PL": "Materiał" } }) })

    expect(screen.getByText(/1 of 2 filled/u)).toBeInTheDocument()
  })

  it("keeps both locales complete when every option row is translated", () => {
    renderLayout({
      mode: "edit",
      row: attribute({
        allowedValues: [{ labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" }],
        type: "select",
      }),
    })

    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("shows no incomplete alert before the form is submitted", () => {
    renderLayout({ mode: "create" })

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("names the untranslated locales in an alert after a blocked submit", async () => {
    renderLayout({ mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Complete required fields for: PL-PL, EN-US.")
    })
    expect(screen.getByLabelText("Language")).toHaveAttribute("aria-invalid", "true")
  })

  it("clears the alert as soon as every locale is translated", async () => {
    renderLayout({ mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole("button", { name: "translate" }))

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull()
    })
    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })
})
