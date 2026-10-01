import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const trackCartItemAdded = vi.hoisted(() => vi.fn<(input: { readonly variantTitle: string }) => void>())

const wishlist = vi.hoisted(() => ({ toggle: vi.fn<(productId: string) => void>(), wishlistedIds: new Set<string>() }))

vi.mock("~/src/modules/customer-activity/customer-activity.tracking", () => ({ trackCartItemAdded }))
vi.mock("~/src/hooks/use-wishlist", () => ({
  useWishlist: () => ({
    isWishlisted: (productId: string) => wishlist.wishlistedIds.has(productId),
    signedIn: true,
    toggle: wishlist.toggle,
  }),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

import { useCartStore } from "~/src/modules/cart/cart.store"

import { ProductCard } from "~/src/presentation/components/custom/product-card"

const BASE_PROPS = {
  detail: "Sterling silver",
  href: "/products/$handle",
  image: "/products/aurora.avif",
  name: "Aurora ring",
  params: { handle: "aurora-ring" },
  price: "PLN 249.00",
  productId: "product-1",
  rawPrice: 24_900,
  slug: "aurora-ring",
  variantId: "variant-1",
} as const

const renderCard = (overrides: Partial<Parameters<typeof ProductCard>[0]> = {}): void => {
  renderWithProviders(<ProductCard {...BASE_PROPS} {...overrides} />)
}

const addToCartButton = (): HTMLElement => screen.getByRole("button", { name: /Add to Cart|Added/u })

const cartItems = () => useCartStore.getState().items

beforeEach(() => {
  vi.clearAllMocks()
  wishlist.wishlistedIds.clear()
  useCartStore.setState({ items: [] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("ProductCard presentation", () => {
  it("shows the name, the detail line and the price", () => {
    renderCard()

    expect(screen.getByRole("heading", { name: "Aurora ring" })).toBeInTheDocument()
    expect(screen.getByText("Sterling silver")).toBeInTheDocument()
    expect(screen.getByText("PLN 249.00")).toBeInTheDocument()
  })

  it("links the whole card to the product page", () => {
    renderCard()

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/aurora-ring")
  })

  it("supports a static destination without route parameters", () => {
    renderCard({ href: "/products", params: undefined })

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products")
  })

  it("renders the product image with the product name as its description", () => {
    renderCard()

    expect(screen.getByRole("img", { name: "Aurora ring" })).toHaveAttribute("src", "/products/aurora.avif")
  })

  it("leaves the price line out when there is no price to show", () => {
    renderCard({ price: undefined })

    expect(screen.queryByText("PLN 249.00")).not.toBeInTheDocument()
  })

  it("shows a badge only when one is supplied", () => {
    renderCard({ badge: "New" })

    expect(screen.getByText("New")).toBeInTheDocument()
  })

  it("uses the compact layout with a parallax image container when requested", () => {
    renderCard({ compact: true, parallax: true })

    const heading = screen.getByRole("heading", { name: "Aurora ring" })
    expect(heading).not.toHaveClass("lg:text-lg")
    expect(heading.parentElement).toHaveClass("space-y-1")
    expect(screen.getByRole("img").closest(".parallax-img")).toBeInTheDocument()
  })

  it("omits the badge by default", () => {
    renderCard()

    expect(screen.queryByText("New")).not.toBeInTheDocument()
  })
})

describe("ProductCard wishlist toggle", () => {
  it("offers to add the product to the wishlist", () => {
    renderCard()

    expect(screen.getByRole("button", { name: "Add to Wishlist" })).toBeInTheDocument()
  })

  it("labels the control from the saved wishlist rather than from a local toggle", () => {
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Add to Wishlist" }))

    expect(screen.getByRole("button", { name: "Add to Wishlist" })).toBeInTheDocument()
  })

  it("saves the product against the account", () => {
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Add to Wishlist" }))

    expect(wishlist.toggle).toHaveBeenCalledWith("product-1")
  })

  it("starts on the remove label for a product already wishlisted", () => {
    wishlist.wishlistedIds.add("product-1")
    renderCard()

    expect(screen.getByRole("button", { name: "Remove from Wishlist" })).toBeInTheDocument()
  })
})

describe("ProductCard add to cart", () => {
  it("keeps the charge amount when the formatted display price is absent", () => {
    renderCard({ price: undefined })
    fireEvent.click(addToCartButton())

    expect(cartItems().at(0)).toMatchObject({ price: "", rawPrice: 24_900, variantId: "variant-1" })
  })

  it("puts the variant in the cart with its display price and raw price", () => {
    renderCard()
    fireEvent.click(addToCartButton())

    expect(cartItems()).toStrictEqual([
      {
        id: "variant-1",
        image: "/products/aurora.avif",
        price: "PLN 249.00",
        qty: 1,
        rawPrice: 24_900,
        slug: "aurora-ring",
        title: "Aurora ring",
        variantId: "variant-1",
        variantTitle: "",
      },
    ])
  })

  it("records the add as customer activity", () => {
    renderCard({ variantTitle: "Gold / 54" })
    fireEvent.click(addToCartButton())

    expect(trackCartItemAdded).toHaveBeenCalledWith({
      productTitle: "Aurora ring",
      quantity: 1,
      variantId: "variant-1",
      variantTitle: "Gold / 54",
    })
  })

  it("keeps a real variant title on the cart line", () => {
    renderCard({ variantTitle: "Gold / 54" })
    fireEvent.click(addToCartButton())

    expect(cartItems().at(0)?.variantTitle).toBe("Gold / 54")
  })

  it("drops the placeholder variant title so the cart shows no option", () => {
    renderCard({ variantTitle: "Default" })
    fireEvent.click(addToCartButton())

    expect(cartItems().at(0)?.variantTitle).toBe("")
  })

  it("confirms the add on the button itself", () => {
    renderCard()
    fireEvent.click(addToCartButton())

    expect(screen.getByRole("button", { name: "Added" })).toBeInTheDocument()
  })

  it("tells the caller a line was added", () => {
    const onAddToCart = vi.fn<() => void>()
    renderCard({ onAddToCart })
    fireEvent.click(addToCartButton())

    expect(onAddToCart).toHaveBeenCalledTimes(1)
  })

  it("raises the quantity instead of adding a second line", () => {
    renderCard()
    fireEvent.click(addToCartButton())
    fireEvent.click(addToCartButton())

    expect(cartItems()).toHaveLength(1)
    expect(cartItems().at(0)?.qty).toBe(2)
  })

  it("goes back to the idle label once the confirmation has run its course", () => {
    vi.useFakeTimers()
    renderCard()
    fireEvent.click(addToCartButton())

    expect(screen.getByRole("button", { name: "Added" })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1800)
    })

    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeInTheDocument()
  })

  it("adds nothing when the card has no variant to sell", () => {
    renderCard({ variantId: undefined })
    fireEvent.click(addToCartButton())

    expect(cartItems()).toStrictEqual([])
    expect(trackCartItemAdded).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeInTheDocument()
  })

  it("adds nothing when the card has no slug to link the cart line to", () => {
    renderCard({ slug: undefined })
    fireEvent.click(addToCartButton())

    expect(cartItems()).toStrictEqual([])
  })

  it("adds nothing when the card has no price to charge", () => {
    renderCard({ rawPrice: undefined })
    fireEvent.click(addToCartButton())

    expect(cartItems()).toStrictEqual([])
  })
})

type ShareFn = (data: { title?: string; url?: string }) => Promise<void>

const withNavigatorShare = (share: ShareFn | undefined): void => {
  Object.defineProperty(globalThis.navigator, "share", { configurable: true, value: share, writable: true })
}

const withClipboard = (writeText: (text: string) => Promise<void>): void => {
  Object.defineProperty(globalThis.navigator, "clipboard", { configurable: true, value: { writeText }, writable: true })
}

describe("ProductCard share", () => {
  afterEach(() => {
    withNavigatorShare(undefined)
  })

  it("hands the product name and link to the native share sheet", async () => {
    const share = vi.fn<ShareFn>(() => Promise.resolve())
    withNavigatorShare(share)
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({ title: "Aurora ring", url: "/products/aurora-ring" })
    })
  })

  it("stays quiet when the visitor dismisses the share sheet", async () => {
    const share = vi.fn<ShareFn>(() => Promise.reject(new Error("AbortError")))
    withNavigatorShare(share)
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(share).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole("heading", { name: "Aurora ring" })).toBeInTheDocument()
  })

  it("copies the absolute link when there is no share sheet", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    withNavigatorShare(undefined)
    withClipboard(writeText)
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/products/aurora-ring`)
    })
  })

  it("survives a clipboard the browser refuses to write to", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.reject(new Error("NotAllowedError")))
    withNavigatorShare(undefined)
    withClipboard(writeText)
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole("heading", { name: "Aurora ring" })).toBeInTheDocument()
  })
})
