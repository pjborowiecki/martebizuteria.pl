import { type JSX, useEffect } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorPricing } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-pricing"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

type ProductForm = UseFormReturn<ProductFormValues>

const PricingHarness = ({
  onForm,
  overrides,
  priceError,
  simpleVariantError,
}: Readonly<{
  onForm: (form: ProductForm) => void
  overrides?: Partial<ProductFormValues> | undefined
  priceError?: string | undefined
  simpleVariantError?: string | undefined
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      ...overrides,
    },
  })
  useEffect(() => {
    onForm(form)
    if (priceError !== undefined) {
      form.setError("simpleVariant.price", {
        message: priceError,
      })
    }
    if (simpleVariantError !== undefined) {
      form.setError("simpleVariant", {
        message: simpleVariantError,
      })
    }
  }, [form, onForm, priceError, simpleVariantError])

  return (
    <FormProvider {...form}>
      <ProductEditorPricing />
    </FormProvider>
  )
}

const renderPricing = (props: Omit<Parameters<typeof PricingHarness>[0], "onForm"> = {}): (() => ProductFormValues) => {
  const captured: ProductForm[] = []
  const onForm = (form: ProductForm): void => {
    captured.push(form)
  }
  renderWithProviders(<PricingHarness onForm={onForm} {...props} />)

  return () => {
    const [form] = captured
    if (form === undefined) {
      throw new TypeError("the harness never exposed its form")
    }

    return form.getValues()
  }
}

describe("ProductEditorPricing for a simple product", () => {
  it("asks for a price and a stock quantity", () => {
    renderPricing()

    expect(screen.getByText("Pricing & Inventory")).toBeInTheDocument()
    expect(screen.getByText("Price")).toBeInTheDocument()
    expect(screen.getByText("Stock quantity (units)")).toBeInTheDocument()
  })

  it("labels the price field with the store currency", () => {
    renderPricing()

    expect(screen.getByText("PLN")).toBeInTheDocument()
  })

  it("renders blank price and zero quantity before an optional simple variant is initialized", () => {
    renderPricing({ overrides: { simpleVariant: undefined } })

    expect(screen.getByDisplayValue("")).toBeInTheDocument()
    expect(screen.getByDisplayValue("0")).toBeInTheDocument()
  })

  it("shows the stored price and quantity", () => {
    renderPricing({
      overrides: { simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 7, sku: "" } },
    })

    expect(screen.getByDisplayValue("120.00")).toBeInTheDocument()
    expect(screen.getByDisplayValue("7")).toBeInTheDocument()
  })

  it("refuses a non numeric stock quantity and settles back on zero", async () => {
    const values = renderPricing()
    const quantity = screen.getByDisplayValue("0")

    await userEvent.type(quantity, "-5")
    await userEvent.tab()

    expect(values().simpleVariant?.quantity).toBe(5)
    expect(quantity).toHaveValue("5")
  })

  it("commits the typed stock quantity as an integer", async () => {
    const values = renderPricing()

    await userEvent.type(screen.getByDisplayValue("0"), "12")
    await userEvent.tab()

    expect(values().simpleVariant?.quantity).toBe(12)
  })

  it("writes the typed price back into the form", async () => {
    const values = renderPricing()

    await userEvent.type(screen.getByDisplayValue(""), "99")

    expect(values().simpleVariant?.price).toBe("99")
  })

  it("translates a known price validation key", async () => {
    renderPricing({ priceError: "form.validation.priceRequired" })

    expect(await screen.findByText("Minimum price is 2.00 PLN.")).toBeInTheDocument()
  })

  it("passes an unknown price error through untranslated", async () => {
    renderPricing({ priceError: "something odd" })

    expect(await screen.findByText("something odd")).toBeInTheDocument()
  })

  it("translates the simple variant requirement into the localized message", async () => {
    renderPricing({ simpleVariantError: "form.validation.simpleVariantRequired" })

    expect(await screen.findByText("Enter price and stock for this product.")).toBeInTheDocument()
  })

  it("shows an unrecognized simple variant error as it stands", async () => {
    renderPricing({ simpleVariantError: "unmapped failure" })

    expect(await screen.findByText("unmapped failure")).toBeInTheDocument()
  })

  it("shows no error row while the section is valid", () => {
    renderPricing()

    expect(screen.queryByText("Enter price and stock for this product.")).not.toBeInTheDocument()
  })
})

describe("ProductEditorPricing for a variant product", () => {
  it("defers pricing to the variant rows", () => {
    renderPricing({ overrides: { hasVariants: true } })

    expect(screen.getByText("Prices, SKU, and stock are set per variant below.")).toBeInTheDocument()
  })

  it("offers no price or stock field of its own", () => {
    renderPricing({ overrides: { hasVariants: true } })

    expect(screen.queryByText("Price")).not.toBeInTheDocument()
    expect(screen.queryByText("Stock quantity (units)")).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("still titles the section", () => {
    renderPricing({ overrides: { hasVariants: true } })

    expect(screen.getByText("Pricing & Inventory")).toBeInTheDocument()
  })
})
