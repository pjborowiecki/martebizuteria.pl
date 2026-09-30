import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as I18nMessages from "~/src/integrations/use-intl/i18n.messages"

interface MetaEntry {
  readonly content?: string
  readonly name?: string
  readonly property?: string
  readonly title?: string
}

interface CartLoaderContext {
  readonly context: {
    readonly locale: string
    readonly queryClient: {
      readonly query: (options: {
        readonly queryKey: readonly string[]
      }) => Promise<{ readonly description: string; readonly title: string }>
    }
  }
}

interface CartRouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (context: CartLoaderContext) => Promise<{ readonly description: string; readonly title: string }>
  readonly head?: (context: { readonly loaderData?: { readonly description: string; readonly title: string } }) => {
    readonly meta: readonly MetaEntry[]
  }
}

const captured: { current: CartRouteDefinition | undefined } = { current: undefined }

vi.mock("~/src/integrations/use-intl/i18n.messages", async (importOriginal) => {
  const actual = await importOriginal<typeof I18nMessages>()

  return {
    ...actual,
    messagesQueryOptions: (input: { locale: string; namespace: string }) => ({ queryKey: ["messages", input.locale, input.namespace] }),
  }
})
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: CartRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

const availability = vi.hoisted(() => ({ hasUnavailableItems: false, isChecking: false }))

vi.mock("~/src/hooks/use-cart-availability", () => ({
  useCartAvailability: () => ({
    hasUnavailableItems: availability.hasUnavailableItems,
    isChecking: availability.isChecking,
    issues: [],
    issuesByVariantId: new Map(),
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/cart-page/cart-item-card", () => ({
  CartItemCard: ({ item }: Readonly<{ item: { title: string } }>): JSX.Element => <li data-testid="cart-line">{item.title}</li>,
}))
vi.mock("~/src/presentation/components/custom/pages/cart-page/cart-summary", () => ({
  CartSummary: ({ checkoutDisabled, subtotal }: Readonly<{ checkoutDisabled: boolean; subtotal: string }>): JSX.Element => (
    <aside data-testid="cart-summary" data-disabled={String(checkoutDisabled)}>
      {subtotal}
    </aside>
  ),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { APP_NAME } from "~/src/presentation/branding/app"

await import("~/src/routes/_storefront.cart")

const route = captured.current

if (route === undefined) {
  throw new Error("the cart route did not register any options")
}

const cartLine = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "variant-1",
  image: "products/aurora.jpg",
  price: "249,00 zł",
  qty: 1,
  rawPrice: 24_900,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId: "variant-1",
  variantTitle: "Rozmiar M",
  ...overrides,
})

const renderCart = () => {
  const CartPage = route.component
  if (CartPage === undefined) {
    throw new Error("the cart route registered no component")
  }

  return renderWithProviders(<CartPage />)
}

const fillCart = (lines: CartItem[]) => {
  useCartStore.setState({ items: lines })
}

const zloty = (major: number) => new Intl.NumberFormat("pl-PL", { currency: "PLN", style: "currency" }).format(major)

beforeEach(() => {
  availability.hasUnavailableItems = false
  availability.isChecking = false
  useCartStore.getState().clearCart()
})

afterEach(() => {
  cleanup()
})

describe("cart page with an empty cart", () => {
  it("says the cart is empty instead of showing a summary", () => {
    renderCart()

    expect(screen.getByRole("heading", { name: "Your cart is empty" })).toBeInTheDocument()
    expect(screen.queryByTestId("cart-summary")).not.toBeInTheDocument()
  })

  it("offers a way back into the catalogue", () => {
    renderCart()

    expect(screen.getByRole("link", { name: /Browse products/u })).toHaveAttribute("href", "/products")
  })

  it("shows no cart lines at all", () => {
    renderCart()

    expect(screen.queryAllByTestId("cart-line")).toHaveLength(0)
  })
})

describe("cart page with items", () => {
  it("titles the page and counts a single item", () => {
    fillCart([cartLine()])

    renderCart()

    expect(screen.getByRole("heading", { name: "Cart" })).toBeInTheDocument()
    expect(screen.getByText("1 item")).toBeInTheDocument()
  })

  it("adds up the quantities of every line for the count", () => {
    fillCart([cartLine({ qty: 3 }), cartLine({ id: "variant-2", qty: 2, variantId: "variant-2" })])

    renderCart()

    expect(screen.getByText("5 items")).toBeInTheDocument()
  })

  it("renders one card per cart line", () => {
    fillCart([cartLine(), cartLine({ id: "variant-2", title: "Kolczyki Luna", variantId: "variant-2" })])

    renderCart()

    expect(screen.getAllByTestId("cart-line").map((line) => line.textContent)).toStrictEqual(["Bransoletka Aurora", "Kolczyki Luna"])
  })

  it("converts the stored minor units into a złoty subtotal", () => {
    fillCart([cartLine({ qty: 2 })])

    renderCart()

    expect(screen.getByTestId("cart-summary").textContent).toBe(zloty(498))
  })

  it("sums every line into the subtotal", () => {
    fillCart([cartLine({ qty: 2 }), cartLine({ id: "variant-2", rawPrice: 10_000, variantId: "variant-2" })])

    renderCart()

    expect(screen.getByTestId("cart-summary").textContent).toBe(zloty(598))
  })

  it("keeps checkout open while every item is available", () => {
    fillCart([cartLine()])

    renderCart()

    expect(screen.getByTestId("cart-summary")).toHaveAttribute("data-disabled", "false")
  })

  it("blocks checkout while an item is unavailable", () => {
    availability.hasUnavailableItems = true
    fillCart([cartLine()])

    renderCart()

    expect(screen.getByTestId("cart-summary")).toHaveAttribute("data-disabled", "true")
  })

  it("blocks checkout while availability is still being checked", () => {
    availability.isChecking = true
    fillCart([cartLine()])

    renderCart()

    expect(screen.getByTestId("cart-summary")).toHaveAttribute("data-disabled", "true")
  })

  it("offers the continue shopping link on both breakpoints", () => {
    fillCart([cartLine()])

    renderCart()

    const links = screen.getAllByRole("link", { name: "Continue shopping" })

    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/products")
  })
})

describe("cart page metadata", () => {
  it("uses the loaded copy for the document and social titles", () => {
    const meta = route.head?.({ loaderData: { description: "Your cart will appear here.", title: "Cart" } }).meta

    expect(meta).toStrictEqual([
      { title: "Cart" },
      { content: "Your cart will appear here.", name: "description" },
      { content: "Cart", property: "og:title" },
      { content: "Your cart will appear here.", property: "og:description" },
    ])
  })

  it("falls back to the store name when the copy has not loaded", () => {
    const meta = route.head?.({}).meta

    expect(meta).toStrictEqual([
      { title: APP_NAME },
      { content: "", name: "description" },
      { content: APP_NAME, property: "og:title" },
      { content: "", property: "og:description" },
    ])
  })
})

describe("cart page loader", () => {
  it("loads the cart namespace for the active locale and keeps its title and description", async () => {
    const seen: { options?: { readonly queryKey: readonly string[] } } = {}

    const loaded = await route.loader?.({
      context: {
        locale: "en-US",
        queryClient: {
          query: (options: { readonly queryKey: readonly string[] }) => {
            seen.options = options

            return Promise.resolve({ description: "Your cart will appear here.", title: "Cart" })
          },
        },
      },
    })

    expect(seen.options?.queryKey).toStrictEqual(["messages", "en-US", "pages.cart"])
    expect(loaded).toStrictEqual({ description: "Your cart will appear here.", title: "Cart" })
  })
})
