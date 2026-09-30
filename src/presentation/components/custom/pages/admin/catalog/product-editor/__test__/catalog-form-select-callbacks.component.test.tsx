import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

const formBridge = vi.hoisted(() => ({ current: {} }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider", () => ({
  useAttributeForm: () => formBridge.current,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider", () => ({
  useCollectionForm: () => formBridge.current,
}))
vi.mock("~/src/modules/product-category/use-cases/get-admin-categories", () => ({
  getAdminCategoriesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["select-contract", "categories"] }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["select-contract", "collections"] }),
}))
vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange, value }: Readonly<{ onValueChange: (value: string | null) => void; value: string }>): JSX.Element => (
    <>
      <button
        type="button"
        onClick={() => {
          onValueChange(null)
        }}
      >
        Emit empty selection
      </button>
      <button
        type="button"
        onClick={() => {
          onValueChange("attribute-1")
        }}
      >
        Choose attribute
      </button>
      <output data-testid="selection">{value}</output>
    </>
  ),
}))

import { AttributeUnitField } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-unit-field"
import { ValueSettingsSection } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/value-settings-section"
import { StatusSection } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/_sections/status-section"
import { ProductEditorAttributeFields } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-fields"
import { ProductEditorAttributeListPanel } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel"
import {
  type ProductEditorAttributeDefinition,
  ProductEditorAttributeValueInput,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value-input"
import { ProductEditorOrganization } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-organization"
import { ProductEditorStatus } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-status"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const FormHarness = ({ children, values }: Readonly<{ children: ReactNode; values?: Partial<ProductFormValues> }>): JSX.Element => {
  const form = useForm<ProductFormValues & ProductAttribute["formValues"]>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      allowedValues: [],
      attributeValues: [{ attributeId: "attribute-1", rank: 0, value: "gold" }],
      type: "text",
      unit: "mm",
      ...values,
    },
  })
  formBridge.current = { control: form.control, getValues: form.getValues, isPending: false, setValue: form.setValue }

  return (
    <FormProvider {...form}>
      {children}
      <output data-testid="form-values">{JSON.stringify(form.watch())}</output>
    </FormProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("catalog form nullable select contracts", () => {
  it.each([
    { component: <AttributeUnitField disabled={false} />, expected: '"unit":"mm"', name: "attribute unit" },
    { component: <ValueSettingsSection />, expected: '"type":"text"', name: "attribute type" },
    { component: <StatusSection />, expected: '"status":"draft"', name: "collection status" },
  ])("preserves $name when the control reports no selection", async ({ component, expected }) => {
    renderWithProviders(<FormHarness>{component}</FormHarness>)

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("form-values")).toHaveTextContent(expected)
  })

  it("clears product status so a missing required selection can be validated", async () => {
    renderWithProviders(
      <FormHarness>
        <ProductEditorStatus />
      </FormHarness>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("form-values")).toHaveTextContent('"status":""')
  })

  it("keeps both the attribute identity and its value on an empty attribute selection", async () => {
    renderWithProviders(
      <FormHarness>
        <ProductEditorAttributeFields
          attributeOptions={[{ label: "Material", value: "attribute-1" }]}
          attributesById={new Map()}
          baseName="attributeValues"
          index={0}
          onRemove={vi.fn<(index?: number | number[]) => void>()}
        />
      </FormHarness>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("form-values")).toHaveTextContent('"attributeId":"attribute-1"')
    expect(screen.getByTestId("form-values")).toHaveTextContent('"value":"gold"')
  })

  it.each<ProductEditorAttributeDefinition>([
    { allowedValues: null, type: "boolean" },
    { allowedValues: [{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }], type: "select" },
  ])("preserves an existing $type value on an empty selection", async (definition) => {
    const onChange = vi.fn<(value: string) => void>()
    renderWithProviders(
      <ProductEditorAttributeValueInput
        definition={definition}
        disabled={false}
        onChange={onChange}
        value={definition.type === "boolean" ? "true" : "gold"}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("clears an empty primary selection without changing additional categories", async () => {
    renderWithProviders(
      <FormHarness values={{ additionalCategoryIds: ["category-2"] }}>
        <ProductEditorOrganization />
      </FormHarness>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("selection")).toBeEmptyDOMElement()
    expect(screen.getByTestId("form-values")).toHaveTextContent('"additionalCategoryIds":["category-2"]')
  })

  it("clears an unfinished attribute draft when its selection is removed", async () => {
    const attribute: ProductAttribute["select"] = {
      allowedValues: null,
      createdAt: new Date("2026-01-01"),
      handle: "material",
      id: "attribute-1",
      rank: 0,
      titles: { "en-US": "Material", "pl-PL": "Materiał" },
      type: "text",
      unit: null,
      updatedAt: new Date("2026-01-01"),
    }
    renderWithProviders(
      <FormHarness values={{ attributeValues: [] }}>
        <ProductEditorAttributeListPanel attributes={[attribute]} baseName="attributeValues" />
      </FormHarness>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Choose attribute" }))
    await userEvent.type(screen.getByRole("textbox"), "Gold")
    expect(screen.getByRole("button", { name: "Add attribute" })).toBeEnabled()

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByRole("textbox")).toHaveValue("")
    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Add attribute" })).toBeDisabled()
    expect(screen.getByTestId("form-values")).toHaveTextContent('"attributeValues":[]')
  })
})
