import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { useSelectedProductVariant } from "~/src/presentation/components/custom/pages/product-page/use-selected-product-variant"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

const SILVER = "value-silver"

const GOLD = "value-gold"

const SIZE_SMALL = "value-small"

const SIZE_LARGE = "value-large"

const FINISH = "option-finish"

const SIZE = "option-size"

const twoAxisProduct = () =>
  storefrontProduct({
    hasVariants: true,
    variants: [
      storefrontVariant({ id: "silver-small", optionValueIds: { [FINISH]: SILVER, [SIZE]: SIZE_SMALL }, quantityAvailable: 0 }),
      storefrontVariant({ id: "silver-large", optionValueIds: { [FINISH]: SILVER, [SIZE]: SIZE_LARGE }, quantityAvailable: 3 }),
      storefrontVariant({ id: "gold-large", optionValueIds: { [FINISH]: GOLD, [SIZE]: SIZE_LARGE }, quantityAvailable: 2 }),
    ],
  })

describe("useSelectedProductVariant", () => {
  it("has no selected variant for a product without variants", () => {
    const { result } = renderHook(() => useSelectedProductVariant(storefrontProduct({ variants: [] })))

    expect(result.current.selectedVariant).toBeUndefined()
    expect(result.current.selectedValueIds).toStrictEqual({})
  })

  it("starts on the first variant that is actually in stock", () => {
    const { result } = renderHook(() => useSelectedProductVariant(twoAxisProduct()))

    expect(result.current.selectedVariant?.id).toBe("silver-large")
    expect(result.current.selectedValueIds).toStrictEqual({ [FINISH]: SILVER, [SIZE]: SIZE_LARGE })
  })

  it("falls back to the first variant when the whole product is sold out", () => {
    const product = storefrontProduct({
      hasVariants: true,
      variants: [
        storefrontVariant({ id: "silver", optionValueIds: { [FINISH]: SILVER }, quantityAvailable: 0 }),
        storefrontVariant({ id: "gold", optionValueIds: { [FINISH]: GOLD }, quantityAvailable: 0 }),
      ],
    })

    const { result } = renderHook(() => useSelectedProductVariant(product))

    expect(result.current.selectedVariant?.id).toBe("silver")
  })

  it("switches to the variant that matches the newly chosen value", () => {
    const { result } = renderHook(() => useSelectedProductVariant(twoAxisProduct()))

    act(() => {
      result.current.selectOptionValue(FINISH, GOLD)
    })

    expect(result.current.selectedVariant?.id).toBe("gold-large")
    expect(result.current.selectedValueIds[FINISH]).toBe(GOLD)
  })

  it("selects a variant that is out of stock so the shopper still sees it", () => {
    const { result } = renderHook(() => useSelectedProductVariant(twoAxisProduct()))

    act(() => {
      result.current.selectOptionValue(SIZE, SIZE_SMALL)
    })

    expect(result.current.selectedVariant?.id).toBe("silver-small")
  })

  it("refuses a combination no variant offers and keeps the current selection", () => {
    const { result } = renderHook(() => useSelectedProductVariant(twoAxisProduct()))

    act(() => {
      result.current.selectOptionValue(FINISH, GOLD)
    })
    act(() => {
      result.current.selectOptionValue(SIZE, SIZE_SMALL)
    })

    expect(result.current.selectedVariant?.id).toBe("gold-large")
    expect(result.current.selectedValueIds[SIZE]).toBe(SIZE_LARGE)
  })

  it("ignores a value of an option the product does not have", () => {
    const { result } = renderHook(() => useSelectedProductVariant(twoAxisProduct()))

    act(() => {
      result.current.selectOptionValue("option-engraving", "value-yes")
    })

    expect(result.current.selectedVariant?.id).toBe("silver-large")
    expect(result.current.selectedValueIds).toStrictEqual({ [FINISH]: SILVER, [SIZE]: SIZE_LARGE })
  })

  it("keeps the single variant of a product without options selected", () => {
    const { result } = renderHook(() => useSelectedProductVariant(storefrontProduct()))

    expect(result.current.selectedVariant?.id).toBe("variant-1")
  })
})
