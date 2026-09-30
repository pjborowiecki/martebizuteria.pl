import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

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
      <output data-testid="selection">{value}</output>
    </>
  ),
}))

import { ProductEditorVariantMode } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-mode"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

const variantProduct: Partial<ProductFormValues> = {
  hasVariants: true,
  options: [
    {
      id: "option-1",
      titles: { "en-US": "Size", "pl-PL": "Rozmiar" },
      values: [{ id: "value-s", labels: { "en-US": "S", "pl-PL": "S" } }],
    },
  ],
  variants: [
    {
      compareAtPrice: "180.00",
      id: "var-s",
      manageInventory: true,
      optionValues: { "option-1": "value-s" },
      price: "130.00",
      quantity: 6,
      sku: "GC-S",
    },
  ],
}

const VariantModeHarness = (): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: { ...createEmptyProductFormValues(), ...variantProduct },
  })

  return (
    <FormProvider {...form}>
      <ProductEditorVariantMode />
      <output data-testid="form-values">{JSON.stringify(form.watch())}</output>
    </FormProvider>
  )
}

describe("ProductEditorVariantMode with no selection reported", () => {
  it("keeps the product on multiple variants when the control reports no selection", async () => {
    renderWithProviders(<VariantModeHarness />)

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("selection")).toHaveTextContent("variants")
    expect(screen.getByTestId("form-values")).toHaveTextContent('"hasVariants":true')
  })

  it("keeps the existing option and variant rows when the control reports no selection", async () => {
    renderWithProviders(<VariantModeHarness />)

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))
    const values = screen.getByTestId("form-values")

    expect(values).toHaveTextContent('"sku":"GC-S"')
    expect(values).toHaveTextContent('"id":"option-1"')
  })
})
