import { type JSX, useEffect } from "react"

import { cleanup, screen } from "@testing-library/react"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorVariantsSection } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variants-section"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-list", () => ({
  ProductEditorVariantList: (): JSX.Element => <output data-testid="variant-list" />,
}))

afterEach(cleanup)

type ProductForm = UseFormReturn<ProductFormValues>

const VariantsSectionHarness = ({
  optionsError,
  variantsError,
}: Readonly<{
  optionsError?: string | undefined
  variantsError?: string | undefined
}>): JSX.Element => {
  const form: ProductForm = useForm<ProductFormValues>({
    defaultValues: createEmptyProductFormValues(),
  })
  useEffect(() => {
    if (optionsError !== undefined) {
      form.setError("options", {
        message: optionsError,
      })
    }
    if (variantsError !== undefined) {
      form.setError("variants", {
        message: variantsError,
      })
    }
  }, [form, optionsError, variantsError])

  return (
    <FormProvider {...form}>
      <ProductEditorVariantsSection />
    </FormProvider>
  )
}

describe("ProductEditorVariantsSection", () => {
  it("titles the section and explains what a row means", () => {
    renderWithProviders(<VariantsSectionHarness />)

    expect(screen.getByText("Variants")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Each row is one variant (e.g. Silver, Gold plated). Set name, price, stock, and photos. Use the PL/EN picker at the top to translate names.",
      ),
    ).toBeInTheDocument()
  })

  it("always renders the variant list", () => {
    renderWithProviders(<VariantsSectionHarness />)

    expect(screen.getByTestId("variant-list")).toBeInTheDocument()
  })

  it("shows no error row while the section is valid", () => {
    renderWithProviders(<VariantsSectionHarness />)

    expect(screen.queryByText("Add at least one option (e.g. Size) for products with variants.")).not.toBeInTheDocument()
    expect(screen.queryByText("Generate at least one variant row.")).not.toBeInTheDocument()
  })

  it("translates a known options validation key", async () => {
    renderWithProviders(<VariantsSectionHarness optionsError="form.validation.optionsRequired" />)

    expect(await screen.findByText("Add at least one option (e.g. Size) for products with variants.")).toBeInTheDocument()
  })

  it("translates a known variants validation key", async () => {
    renderWithProviders(<VariantsSectionHarness variantsError="form.validation.variantsRequired" />)

    expect(await screen.findByText("Generate at least one variant row.")).toBeInTheDocument()
  })

  it("shows both errors at once when options and variants are both wrong", async () => {
    renderWithProviders(
      <VariantsSectionHarness optionsError="form.validation.optionsRequired" variantsError="form.validation.variantsRequired" />,
    )

    expect(await screen.findByText("Add at least one option (e.g. Size) for products with variants.")).toBeInTheDocument()
    expect(screen.getByText("Generate at least one variant row.")).toBeInTheDocument()
  })

  it("passes an unrecognized message through untranslated", async () => {
    renderWithProviders(<VariantsSectionHarness optionsError="raw option failure" />)

    expect(await screen.findByText("raw option failure")).toBeInTheDocument()
  })

  it("ignores an empty error message", () => {
    renderWithProviders(<VariantsSectionHarness optionsError="" variantsError="" />)

    expect(screen.getAllByText("Variants")).toHaveLength(1)
    expect(screen.getByTestId("variant-list")).toBeInTheDocument()
  })
})
