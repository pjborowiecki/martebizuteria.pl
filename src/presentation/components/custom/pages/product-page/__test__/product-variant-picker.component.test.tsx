import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Product } from "~/src/modules/product/product.types"

import { ProductVariantPicker } from "~/src/presentation/components/custom/pages/product-page/product-variant-picker"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

const FINISH = "option-finish"

const SILVER = "value-silver"

const GOLD = "value-gold"

const finishOption = (title = "Finish") => ({
  id: FINISH,
  title,
  values: [
    { id: SILVER, label: "Silver" },
    { id: GOLD, label: "Gold" },
  ],
})

const variantProduct = (overrides: Partial<Product["storefront"]> = {}) =>
  storefrontProduct({
    hasVariants: true,
    options: [finishOption()],
    variants: [
      storefrontVariant({ id: "silver", optionValueIds: { [FINISH]: SILVER }, quantityAvailable: 3 }),
      storefrontVariant({ id: "gold", optionValueIds: { [FINISH]: GOLD }, quantityAvailable: 0 }),
    ],
    ...overrides,
  })

const SILVER_SELECTION: Record<string, string> = { [FINISH]: SILVER }

const renderPicker = (product: Product["storefront"], selectedValueIds = SILVER_SELECTION) => {
  const onSelectOptionValue = vi.fn<(optionId: string, valueId: string) => void>()

  renderWithProviders(
    <ProductVariantPicker onSelectOptionValue={onSelectOptionValue} product={product} selectedValueIds={selectedValueIds} />,
  )

  return onSelectOptionValue
}

describe("ProductVariantPicker", () => {
  afterEach(() => {
    cleanup()
  })

  it("stays out of the way for a product without variants", () => {
    renderPicker(storefrontProduct())

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("stays out of the way when the product has variants but no options to pick", () => {
    renderPicker(variantProduct({ options: [] }))

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("offers one button per option value", () => {
    renderPicker(variantProduct())

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toStrictEqual(["Silver", "Gold"])
  })

  it("marks the selected value as pressed", () => {
    renderPicker(variantProduct())

    expect(screen.getByRole("button", { name: "Silver" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Gold" })).toHaveAttribute("aria-pressed", "false")
  })

  it("disables a value no variant has in stock", () => {
    renderPicker(variantProduct())

    expect(screen.getByRole("button", { name: "Silver" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Gold" })).toBeDisabled()
  })

  it("reports the option and the value the shopper picked", async () => {
    const product = variantProduct({
      variants: [
        storefrontVariant({ id: "silver", optionValueIds: { [FINISH]: SILVER }, quantityAvailable: 3 }),
        storefrontVariant({ id: "gold", optionValueIds: { [FINISH]: GOLD }, quantityAvailable: 2 }),
      ],
    })
    const onSelectOptionValue = renderPicker(product)

    await userEvent.click(screen.getByRole("button", { name: "Gold" }))

    expect(onSelectOptionValue).toHaveBeenCalledWith(FINISH, GOLD)
  })

  it("cannot pick a value that is out of stock", async () => {
    const onSelectOptionValue = renderPicker(variantProduct())

    await userEvent.click(screen.getByRole("button", { name: "Gold" }))

    expect(onSelectOptionValue).not.toHaveBeenCalled()
  })

  it("names the axis a product with a real option has", () => {
    renderPicker(variantProduct())

    expect(screen.getByText("Finish")).toBeInTheDocument()
  })

  it("hides the axis name of the single implicit variant option", () => {
    renderPicker(variantProduct({ options: [finishOption("Variant")] }))

    expect(screen.queryByText("Variant")).toBeNull()
  })

  it("still names an implicit axis when the product has a second axis", () => {
    const product = variantProduct({
      options: [finishOption("Variant"), { id: "option-size", title: "Size", values: [{ id: "value-s", label: "S" }] }],
    })
    renderPicker(product)

    expect(screen.getByText("Variant")).toBeInTheDocument()
    expect(screen.getByText("Size")).toBeInTheDocument()
  })

  it("explains that the gallery and the price follow the picked finish", () => {
    renderPicker(variantProduct())

    expect(screen.getByText("Gallery, specifications, and price update when you change the finish.")).toBeInTheDocument()
  })
})
