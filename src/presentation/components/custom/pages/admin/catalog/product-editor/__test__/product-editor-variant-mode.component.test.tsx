import { type JSX, useEffect } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorVariantMode } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-mode"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

type ProductForm = UseFormReturn<ProductFormValues>

const VariantModeHarness = ({
  onForm,
  overrides,
}: Readonly<{
  onForm: (form: ProductForm) => void
  overrides?: Partial<ProductFormValues> | undefined
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      ...overrides,
    },
  })
  useEffect(() => {
    onForm(form)
  }, [form, onForm])

  return (
    <FormProvider {...form}>
      <ProductEditorVariantMode />
    </FormProvider>
  )
}

const renderVariantMode = (overrides?: Partial<ProductFormValues>): (() => ProductFormValues) => {
  const captured: ProductForm[] = []
  const onForm = (form: ProductForm): void => {
    captured.push(form)
  }
  renderWithProviders(<VariantModeHarness onForm={onForm} overrides={overrides} />)

  return () => {
    const [form] = captured
    if (form === undefined) {
      throw new Error("the harness never exposed its form")
    }

    return form.getValues()
  }
}

const pickType = async (label: string): Promise<void> => {
  const trigger = screen.getByRole("combobox", { name: "Type" })
  await userEvent.click(trigger)
  const options = await screen.findAllByRole("option")
  const target = options.find((item) => item.textContent === label)
  await userEvent.click(target ?? trigger)
}

describe("ProductEditorVariantMode", () => {
  it("shows the single variant option for a product without variants", () => {
    renderVariantMode()

    expect(screen.getByText("Product type")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent("Single variant")
  })

  it("shows the multiple variants option for a product that has them", () => {
    renderVariantMode({ hasVariants: true })

    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent("Multiple variants")
  })

  it("offers both product types", async () => {
    renderVariantMode()

    await userEvent.click(screen.getByRole("combobox", { name: "Type" }))
    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["Single variant", "Multiple variants"])
  })

  it("seeds an implicit option and one variant row carrying the simple price when switching to variants", async () => {
    const values = renderVariantMode({
      simpleVariant: { compareAtPrice: "150.00", manageInventory: true, price: "120.00", quantity: 4, sku: "GC-1" },
    })

    await pickType("Multiple variants")
    const current = values()

    expect(current.hasVariants).toBe(true)
    expect(current.options).toHaveLength(1)
    expect(current.options[0]?.titles).toStrictEqual({ "en-US": "Variant", "pl-PL": "Wariant" })
    expect(current.variants).toHaveLength(1)
    expect(current.variants[0]).toMatchObject({ compareAtPrice: "150.00", price: "120.00", quantity: 4, sku: "GC-1" })
  })

  it("starts with blank variant values when the optional simple variant is absent", async () => {
    const values = renderVariantMode({ simpleVariant: undefined })

    await pickType("Multiple variants")

    expect(values().hasVariants).toBe(true)
    expect(values().variants).toHaveLength(1)
    expect(values().variants[0]).toMatchObject({ compareAtPrice: "", price: "", quantity: 0, sku: "" })
  })

  it("copies the first variant row back into the simple variant when switching to single", async () => {
    const values = renderVariantMode({
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
    })

    await pickType("Single variant")
    const current = values()

    expect(current.hasVariants).toBe(false)
    expect(current.options).toStrictEqual([])
    expect(current.variants).toStrictEqual([])
    expect(current.simpleVariant).toStrictEqual({
      compareAtPrice: "180.00",
      manageInventory: true,
      price: "130.00",
      quantity: 6,
      sku: "GC-S",
    })
  })

  it("leaves the form untouched when the picked type is the current one", async () => {
    const values = renderVariantMode({ handle: "gold-chain" })
    const before = values()

    await pickType("Single variant")

    expect(values()).toStrictEqual(before)
  })

  it("keeps the existing simple variant when there is no variant row to copy back", async () => {
    const values = renderVariantMode({
      hasVariants: true,
      simpleVariant: { compareAtPrice: "", manageInventory: true, price: "99.00", quantity: 1, sku: "KEEP" },
    })

    await pickType("Single variant")

    expect(values().simpleVariant).toStrictEqual({ compareAtPrice: "", manageInventory: true, price: "99.00", quantity: 1, sku: "KEEP" })
  })
})
