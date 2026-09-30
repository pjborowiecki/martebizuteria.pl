import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { CatalogLocalePickerProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import { ProductEditorBasic } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-basic"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

const BasicHarness = ({
  hasVariants = false,
  locale = "pl-PL",
}: Readonly<{
  hasVariants?: boolean
  locale?: SupportedLocale
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: { ...createEmptyProductFormValues(), hasVariants },
  })

  const handle = useWatch({ control: form.control, name: "handle" })

  return (
    <FormProvider {...form}>
      <CatalogLocalePickerProvider activeLocale={locale}>
        <ProductEditorBasic />
      </CatalogLocalePickerProvider>
      <output data-testid="handle-value">{handle}</output>
    </FormProvider>
  )
}

const handleValue = (): string => screen.getByTestId("handle-value").textContent

const slugInput = (): HTMLElement => screen.getByPlaceholderText("minimalist-gold-hoop")

const titleInput = (): HTMLElement => screen.getByPlaceholderText("e.g. Minimalist Gold Hoop")

describe("ProductEditorBasic layout", () => {
  it("titles the card", () => {
    renderWithProviders(<BasicHarness />)

    expect(screen.getByText("Basic details")).toBeInTheDocument()
  })

  it("labels the product name for the active language", () => {
    renderWithProviders(<BasicHarness />)

    expect(screen.getByText("Product name (PL)")).toBeInTheDocument()
  })

  it("labels the product name in English when English is active", () => {
    renderWithProviders(<BasicHarness locale="en-US" />)

    expect(screen.getByText("Product name (EN)")).toBeInTheDocument()
  })

  it("shows the storefront path in front of the slug field", () => {
    renderWithProviders(<BasicHarness />)

    expect(screen.getByText("/products/")).toBeInTheDocument()
  })

  it("offers the subtitle and description fields for the active language", () => {
    renderWithProviders(<BasicHarness />)

    expect(screen.getByText("Subtitle (PL)")).toBeInTheDocument()
    expect(screen.getByText("Description (PL)")).toBeInTheDocument()
  })

  it("asks for a sku on a product sold as a single variant", () => {
    renderWithProviders(<BasicHarness />)

    expect(screen.getByText("SKU")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("MRT-0001")).toBeInTheDocument()
  })

  it("drops the sku field once the product has its own variants", () => {
    renderWithProviders(<BasicHarness hasVariants />)

    expect(screen.queryByPlaceholderText("MRT-0001")).not.toBeInTheDocument()
  })

  it("counts the slug against the column limit", () => {
    renderWithProviders(<BasicHarness />)

    fireEvent.change(slugInput(), { target: { value: "gold-hoop" } })

    expect(screen.getByText("9/255")).toBeInTheDocument()
    expect(slugInput()).toHaveAttribute("maxlength", "255")
  })
})

describe("ProductEditorBasic slug", () => {
  it("follows the product name until the admin takes over", () => {
    renderWithProviders(<BasicHarness />)

    fireEvent.change(titleInput(), { target: { value: "Złoty Pierścionek" } })

    expect(handleValue()).toBe("zloty-pierscionek")
    expect(slugInput()).toHaveValue("zloty-pierscionek")
  })

  it("stops following the product name once the slug is edited by hand", () => {
    renderWithProviders(<BasicHarness />)

    fireEvent.change(titleInput(), { target: { value: "Złoty Pierścionek" } })
    fireEvent.change(slugInput(), { target: { value: "custom-slug" } })
    fireEvent.change(titleInput(), { target: { value: "Srebrny Pierścionek" } })

    expect(handleValue()).toBe("custom-slug")
  })

  it("normalizes what the admin types into a url safe slug", () => {
    renderWithProviders(<BasicHarness />)

    fireEvent.change(slugInput(), { target: { value: "Złota  Obrączka!" } })

    expect(handleValue()).toBe("zlota-obraczka-")
  })

  it("trims the trailing separator once the field loses focus", () => {
    renderWithProviders(<BasicHarness />)

    fireEvent.change(slugInput(), { target: { value: "Złota  Obrączka!" } })
    fireEvent.blur(slugInput())

    expect(handleValue()).toBe("zlota-obraczka")
  })

  it("keeps the typed sku on the form", () => {
    renderWithProviders(<BasicHarness />)

    fireEvent.change(screen.getByPlaceholderText("MRT-0001"), { target: { value: "MRT-0042" } })

    expect(screen.getByPlaceholderText("MRT-0001")).toHaveValue("MRT-0042")
  })
})
