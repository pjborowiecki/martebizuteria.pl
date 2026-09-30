import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"
import { type Product } from "~/src/modules/product/product.types"

import { useProductHeroCart } from "~/src/presentation/components/custom/pages/product-page/use-product-hero-cart"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

const tracking = vi.hoisted(() => ({
  trackCartItemAdded: vi.fn<(input: { productTitle: string; quantity: number; variantId: string; variantTitle: string }) => void>(),
}))

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `https://cdn.example.com/${path ?? "placeholder"}` }))
vi.mock("~/src/modules/customer-activity/customer-activity.tracking", () => tracking)

const PRODUCT = storefrontProduct({ handle: "silver-ring", title: "Silver ring" })

const DEFAULT_PRICE = 120_000

const DEFAULT_OPTIONS: { readonly variantPrice?: number | undefined } = { variantPrice: DEFAULT_PRICE }

const renderCart = (selectedVariant: Product["storefrontVariant"] | undefined, options = DEFAULT_OPTIONS) =>
  renderHook(
    (props: { selectedVariant: Product["storefrontVariant"] | undefined }) =>
      useProductHeroCart({
        heroImage: "rings/silver.webp",
        price: "1 200,00 zl",
        product: PRODUCT,
        selectedVariant: props.selectedVariant,
        variantPrice: options.variantPrice,
      }),
    { initialProps: { selectedVariant } },
  )

const cartItems = (): readonly CartItem[] => useCartStore.getState().items

describe("useProductHeroCart", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
    tracking.trackCartItemAdded.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts at a single unit and reports the available stock", () => {
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 4 }))

    expect(result.current.quantity).toBe(1)
    expect(result.current.availableQuantity).toBe(4)
    expect(result.current.isOutOfStock).toBe(false)
    expect(result.current.canPurchase).toBe(true)
  })

  it("reports a sold out variant as unpurchasable", () => {
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 0 }))

    expect(result.current.isOutOfStock).toBe(true)
    expect(result.current.canPurchase).toBe(false)
  })

  it("treats a missing variant as sold out", () => {
    const { result } = renderCart(undefined)

    expect(result.current.availableQuantity).toBe(0)
    expect(result.current.canPurchase).toBe(false)
  })

  it("refuses a quantity beyond the available stock", () => {
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 2 }))

    act(() => {
      result.current.setQuantity(2)
    })

    expect(result.current.canPurchase).toBe(true)
  })

  it("pulls an over-large quantity back down to the available stock", () => {
    const { result, rerender } = renderCart(storefrontVariant({ id: "variant-a", quantityAvailable: 5 }))

    act(() => {
      result.current.setQuantity(5)
    })
    rerender({ selectedVariant: storefrontVariant({ id: "variant-a", quantityAvailable: 2 }) })

    expect(result.current.quantity).toBe(2)
  })

  it("starts over at one unit when the shopper picks another variant", () => {
    const { result, rerender } = renderCart(storefrontVariant({ id: "variant-a", quantityAvailable: 5 }))

    act(() => {
      result.current.setQuantity(3)
    })
    rerender({ selectedVariant: storefrontVariant({ id: "variant-b", quantityAvailable: 5 }) })

    expect(result.current.quantity).toBe(1)
  })
})

describe("useProductHeroCart adding to the cart", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
    tracking.trackCartItemAdded.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("adds the chosen variant to the cart with its display price and image", () => {
    const { result } = renderCart(storefrontVariant({ id: "variant-a", quantityAvailable: 5, title: "Gold" }))

    act(() => {
      result.current.handleAddToCart()
    })

    expect(cartItems()).toStrictEqual([
      {
        id: "variant-a",
        image: "https://cdn.example.com/rings/silver.webp",
        price: "1 200,00 zl",
        qty: 1,
        rawPrice: 120_000,
        slug: "silver-ring",
        title: "Silver ring",
        variantId: "variant-a",
        variantTitle: "Gold",
      },
    ])
  })

  it("hides the placeholder variant title from the cart line", () => {
    const { result } = renderCart(storefrontVariant({ title: "Default" }))

    act(() => {
      result.current.handleAddToCart()
    })

    expect(cartItems()[0]?.variantTitle).toBe("")
  })

  it("adds the quantity the shopper picked", () => {
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 5 }))

    act(() => {
      result.current.setQuantity(3)
    })
    act(() => {
      result.current.handleAddToCart()
    })

    expect(cartItems()[0]?.qty).toBe(3)
  })

  it("records the addition for the activity feed", () => {
    const { result } = renderCart(storefrontVariant({ id: "variant-a", quantityAvailable: 5, title: "Gold" }))

    act(() => {
      result.current.handleAddToCart()
    })

    expect(tracking.trackCartItemAdded).toHaveBeenCalledWith({
      productTitle: "Silver ring",
      quantity: 1,
      variantId: "variant-a",
      variantTitle: "Gold",
    })
  })

  it("adds nothing when there is no variant to add", () => {
    const { result } = renderCart(undefined)

    act(() => {
      result.current.handleAddToCart()
    })

    expect(cartItems()).toStrictEqual([])
    expect(tracking.trackCartItemAdded).not.toHaveBeenCalled()
  })

  it("adds nothing while the variant has no price", () => {
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 5 }), { variantPrice: undefined })

    act(() => {
      result.current.handleAddToCart()
    })

    expect(cartItems()).toStrictEqual([])
  })

  it("adds nothing when the variant is sold out", () => {
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 0 }))

    act(() => {
      result.current.handleAddToCart()
    })

    expect(cartItems()).toStrictEqual([])
  })

  it("confirms the addition and forgets it again after two seconds", () => {
    vi.useFakeTimers()
    const { result } = renderCart(storefrontVariant({ quantityAvailable: 5 }))

    act(() => {
      result.current.handleAddToCart()
    })
    expect(result.current.isAdded).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.isAdded).toBe(false)
  })
})
