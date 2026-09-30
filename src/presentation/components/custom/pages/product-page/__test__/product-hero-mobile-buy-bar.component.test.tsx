import { act, cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { type Product } from "~/src/modules/product/product.types"

import { ProductHeroInfo } from "~/src/presentation/components/custom/pages/product-page/product-hero-info"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/modules/customer-activity/customer-activity.tracking", () => ({ trackCartItemAdded: vi.fn() }))

type VisibilityCallback = (entries: readonly { readonly isIntersecting: boolean }[]) => void

const observed: {
  callbacks: VisibilityCallback[]
  disconnectCount: number
  targets: Element[]
} = { callbacks: [], disconnectCount: 0, targets: [] }

const viewport: { listeners: Set<() => void>; matches: boolean } = { listeners: new Set(), matches: true }

class CapturingIntersectionObserver {
  constructor(callback: VisibilityCallback) {
    observed.callbacks.push(callback)
  }

  observe(target: Element): void {
    observed.targets.push(target)
  }

  unobserve(): void {}

  disconnect(): void {
    observed.disconnectCount += 1
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

const renderInfo = (product: Product["storefront"]) =>
  renderWithProviders(
    <ProductHeroInfo
      onSelectOptionValue={vi.fn<(optionId: string, valueId: string) => void>()}
      product={product}
      selectedValueIds={{}}
      selectedVariant={product.variants[0]}
    />,
  )

const reportVisibility = (isIntersecting: boolean): void => {
  const [notify] = observed.callbacks
  if (notify === undefined) {
    throw new Error("the purchase row was never observed")
  }

  act(() => {
    notify([{ isIntersecting }])
  })
}

const buyButtons = () => screen.getAllByRole("button", { name: "Add to cart" })

beforeEach(() => {
  useCartStore.setState({ items: [] })
  observed.callbacks = []
  observed.disconnectCount = 0
  observed.targets = []
  viewport.listeners.clear()
  viewport.matches = true
  vi.stubGlobal("IntersectionObserver", CapturingIntersectionObserver)
  vi.stubGlobal("matchMedia", matchMediaStub)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ProductHeroInfo mobile buy bar", () => {
  it("watches the purchase row while the product can be bought", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))

    expect(observed.targets).toHaveLength(1)
    expect(buyButtons()).toHaveLength(1)
  })

  it("raises the buy bar once the purchase row scrolls out of sight on a phone", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))

    reportVisibility(false)

    expect(buyButtons()).toHaveLength(2)
  })

  it("drops the buy bar again once the purchase row is back in sight", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))
    reportVisibility(false)

    reportVisibility(true)

    expect(buyButtons()).toHaveLength(1)
  })

  it("never raises the buy bar on a wide viewport", () => {
    viewport.matches = false
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))

    reportVisibility(false)

    expect(buyButtons()).toHaveLength(1)
  })

  it("drops the buy bar when the viewport grows past the mobile breakpoint", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))
    reportVisibility(false)

    viewport.matches = false
    act(() => {
      for (const listener of viewport.listeners) {
        listener()
      }
    })

    expect(buyButtons()).toHaveLength(1)
  })

  it("keeps the buy bar as it is while the viewport stays mobile", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))
    reportVisibility(false)

    act(() => {
      for (const listener of viewport.listeners) {
        listener()
      }
    })

    expect(buyButtons()).toHaveLength(2)
  })

  it("ignores a report that carries no entry", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))
    const [notify] = observed.callbacks

    act(() => {
      notify?.([])
    })

    expect(buyButtons()).toHaveLength(1)
  })

  it("watches nothing while the product is sold out", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 0 })] }))

    expect(observed.targets).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull()
  })

  it("stops watching the purchase row once the panel is gone", () => {
    const { unmount } = renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))

    unmount()

    expect(observed.disconnectCount).toBe(1)
    expect(viewport.listeners.size).toBe(0)
  })
})
