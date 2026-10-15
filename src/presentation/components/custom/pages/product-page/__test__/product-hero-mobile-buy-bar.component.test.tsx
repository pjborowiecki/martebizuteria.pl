import { act, cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { type Product } from "~/src/modules/product/product.types"

import { ProductHeroInfo } from "~/src/presentation/components/custom/pages/product-page/product-hero-info"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/hooks/use-wishlist", () => ({
  useWishlist: () => ({ isWishlisted: () => false, signedIn: false, toggle: vi.fn() }),
}))
vi.mock("~/src/modules/customer-activity/customer-activity.tracking", () => ({ trackCartItemAdded: vi.fn() }))

type VisibilityCallback = (entries: readonly { readonly isIntersecting: boolean }[]) => void

type RowPosition = "above" | "below" | "visible"

const SCREEN_HEIGHT = 844

const ROW_HEIGHT = 56

const ROW_TOP: Readonly<Record<RowPosition, number>> = { above: -240, below: 1028, visible: 300 }

const observed: {
  disconnectCount: number
  observers: ScreenIntersectionObserver[]
  targets: Element[]
} = { disconnectCount: 0, observers: [], targets: [] }

const viewport: { listeners: Set<() => void>; matches: boolean } = { listeners: new Set(), matches: true }

class ScreenIntersectionObserver {
  readonly callback: VisibilityCallback

  readonly rootBottom: number

  readonly rootTop: number

  intersecting: boolean | undefined

  constructor(callback: VisibilityCallback, options: IntersectionObserverInit) {
    const [top = 0, , bottom = 0] = (options.rootMargin ?? "0px").split(" ").map((margin) => Number(margin.replace(/px$/u, "")))
    this.callback = callback
    this.rootTop = -top
    this.rootBottom = SCREEN_HEIGHT + bottom
    observed.observers.push(this)
  }

  observe(target: Element): void {
    observed.targets.push(target)
  }

  unobserve(): void {}

  disconnect(): void {
    observed.disconnectCount += 1
  }

  scrollRowTo(rowTop: number): void {
    const intersecting = rowTop < this.rootBottom && rowTop + ROW_HEIGHT > this.rootTop
    if (intersecting === this.intersecting) {
      return
    }
    this.intersecting = intersecting
    this.callback([{ isIntersecting: intersecting }])
  }
}

const matchMediaStub = (query: string) => ({
  addEventListener: (_: string, listener: () => void) => {
    viewport.listeners.add(listener)
  },
  addListener: () => {},
  dispatchEvent: () => false,
  get matches() {
    return viewport.matches
  },
  media: query,
  onchange: null,
  removeEventListener: (_: string, listener: () => void) => {
    viewport.listeners.delete(listener)
  },
  removeListener: () => {},
})

const heroInfo = (product: Product["storefront"]) => (
  <ProductHeroInfo
    onSelectOptionValue={vi.fn<(optionId: string, valueId: string) => void>()}
    product={product}
    selectedValueIds={{}}
    selectedVariant={product.variants[0]}
  />
)

const renderInfo = (product: Product["storefront"]) => renderWithProviders(heroInfo(product))

const purchasableProduct = (overrides: Partial<Product["storefront"]> = {}) =>
  storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })], ...overrides })

const watcher = (): ScreenIntersectionObserver => {
  const observer = observed.observers.at(-1)
  if (observer === undefined) {
    throw new Error("the purchase row was never observed")
  }

  return observer
}

const scrollRow = (...positions: readonly RowPosition[]): void => {
  for (const position of positions) {
    act(() => {
      watcher().scrollRowTo(ROW_TOP[position])
    })
  }
}

const buyButtons = () => screen.getAllByRole("button", { name: "Add to cart" })

beforeEach(() => {
  useCartStore.setState({ items: [] })
  observed.disconnectCount = 0
  observed.observers = []
  observed.targets = []
  viewport.listeners.clear()
  viewport.matches = true
  vi.stubGlobal("IntersectionObserver", ScreenIntersectionObserver)
  vi.stubGlobal("matchMedia", matchMediaStub)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ProductHeroInfo mobile buy bar", () => {
  it("watches the purchase row while the product can be bought", () => {
    renderInfo(purchasableProduct())

    expect(observed.targets).toHaveLength(1)
    expect(buyButtons()).toHaveLength(1)
  })

  it("raises the buy bar once the purchase row scrolls above the screen on a phone", () => {
    renderInfo(purchasableProduct())

    scrollRow("visible", "above")

    expect(buyButtons()).toHaveLength(2)
  })

  it("keeps the buy bar down while the purchase row is still below the screen", () => {
    renderInfo(purchasableProduct())

    scrollRow("below")

    expect(buyButtons()).toHaveLength(1)
  })

  it("drops the buy bar when the page jumps from past the purchase row back to the top", () => {
    renderInfo(purchasableProduct())
    scrollRow("visible", "above")

    scrollRow("below")

    expect(buyButtons()).toHaveLength(1)
  })

  it("drops the buy bar when a related product opens at the top of its page", () => {
    const { queryClient, rerender, router } = renderInfo(purchasableProduct())
    scrollRow("visible", "above")

    rerender(
      <TestProviders queryClient={queryClient} router={router}>
        {heroInfo(purchasableProduct({ handle: "onyx-necklace", id: "product-2", title: "Onyx Necklace" }))}
      </TestProviders>,
    )
    scrollRow("below")

    expect(screen.getByRole("heading", { level: 1, name: "Onyx Necklace" })).toBeInTheDocument()
    expect(buyButtons()).toHaveLength(1)
  })

  it("pins the buy bar to the screen from the page body so the animated panel cannot hold it mid-page", () => {
    const { container } = renderInfo(purchasableProduct())

    scrollRow("visible", "above")
    const bar = buyButtons()[1]?.closest(".sticky")

    expect(bar?.parentElement).toBe(document.body)
    expect(container.querySelector("aside")?.contains(bar ?? null)).toBe(false)
  })

  it("drops the buy bar again once the purchase row is back in sight", () => {
    renderInfo(purchasableProduct())
    scrollRow("visible", "above")

    scrollRow("visible")

    expect(buyButtons()).toHaveLength(1)
  })

  it("never raises the buy bar on a wide viewport", () => {
    viewport.matches = false
    renderInfo(purchasableProduct())

    scrollRow("visible", "above")

    expect(buyButtons()).toHaveLength(1)
  })

  it("drops the buy bar when the viewport grows past the mobile breakpoint", () => {
    renderInfo(purchasableProduct())
    scrollRow("visible", "above")

    viewport.matches = false
    act(() => {
      for (const listener of viewport.listeners) {
        listener()
      }
    })

    expect(buyButtons()).toHaveLength(1)
  })

  it("keeps the buy bar as it is while the viewport stays mobile", () => {
    renderInfo(purchasableProduct())
    scrollRow("visible", "above")

    act(() => {
      for (const listener of viewport.listeners) {
        listener()
      }
    })

    expect(buyButtons()).toHaveLength(2)
  })

  it("ignores a report that carries no entry", () => {
    renderInfo(purchasableProduct())

    act(() => {
      watcher().callback([])
    })

    expect(buyButtons()).toHaveLength(1)
  })

  it("watches nothing while the product is sold out", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 0 })] }))

    expect(observed.targets).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull()
  })

  it("stops watching the purchase row once the panel is gone", () => {
    const { unmount } = renderInfo(purchasableProduct())

    unmount()

    expect(observed.disconnectCount).toBe(1)
    expect(viewport.listeners.size).toBe(0)
  })
})
