import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

interface MessagesQueryStub<TMessages> {
  readonly queryFn: () => Promise<TMessages>
  readonly queryKey: readonly unknown[]
}

interface LoaderContext {
  readonly context: {
    readonly locale: SupportedLocale
    readonly queryClient: {
      readonly query: <TMessages>(options: MessagesQueryStub<TMessages>) => Promise<TMessages>
    }
  }
}

interface CheckoutSearch {
  readonly step: number
  readonly success?: boolean | undefined
}

interface CheckoutRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (context: LoaderContext) => Promise<PageMeta>
  readonly staticData?: { readonly namespaces?: readonly string[] }
  readonly validateSearch?: { readonly parse: (input: unknown) => CheckoutSearch }
}

const captured: { current: CheckoutRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    Outlet: (): JSX.Element => <div data-testid="outlet" />,
    createFileRoute: () => (options: CheckoutRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-header", () => ({
  CheckoutHeader: (): JSX.Element => <header data-testid="checkout-header" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/checkout")

const route = captured.current

if (route === undefined) {
  throw new Error("the checkout route registered no options")
}

const renderLayout = () => {
  const CheckoutLayout = route.component
  if (CheckoutLayout === undefined) {
    throw new Error("the checkout route registered no component")
  }

  return renderWithProviders(<CheckoutLayout />)
}

const parseSearch = (input: unknown): CheckoutSearch => {
  const { validateSearch } = route
  if (validateSearch === undefined) {
    throw new Error("the checkout route validates no search params")
  }

  return validateSearch.parse(input)
}

const seenQueryKeys: unknown[][] = []

const loadMeta = (locale: SupportedLocale = "en-US"): Promise<PageMeta> => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the checkout route registered no loader")
  }
  seenQueryKeys.length = 0

  return loader({
    context: {
      locale,
      queryClient: {
        query: <TMessages,>(options: MessagesQueryStub<TMessages>) => {
          seenQueryKeys.push([...options.queryKey])

          return options.queryFn()
        },
      },
    },
  })
}

afterEach(() => {
  cleanup()
})

describe("checkout layout", () => {
  it("keeps the checkout header above the routed step", () => {
    renderLayout()

    const header = screen.getByTestId("checkout-header")
    const outlet = screen.getByTestId("outlet")

    expect(header.compareDocumentPosition(outlet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("wraps the step in the page main region", () => {
    renderLayout()

    expect(screen.getByRole("main")).toContainElement(screen.getByTestId("outlet"))
  })
})

describe("checkout step search param", () => {
  it.each([1, 2, 3, 4])("keeps step %i as it came in", (step) => {
    expect(parseSearch({ step }).step).toBe(step)
  })

  it.each([0, -1, 5, 40])("falls back to the first step for the out-of-range step %i", (step) => {
    expect(parseSearch({ step }).step).toBe(1)
  })

  it("falls back to the first step for a fractional step", () => {
    expect(parseSearch({ step: 2.5 }).step).toBe(1)
  })

  it("falls back to the first step for a step that arrived as text", () => {
    expect(parseSearch({ step: "3" }).step).toBe(1)
  })

  it("falls back to the first step when no step was given at all", () => {
    expect(parseSearch({}).step).toBe(1)
  })
})

describe("checkout success search param", () => {
  it("reads the boolean flag Stripe sends back", () => {
    expect(parseSearch({ step: 4, success: true }).success).toBe(true)
  })

  it("reads the flag that survived the URL as text", () => {
    expect(parseSearch({ step: 4, success: "true" }).success).toBe(true)
  })

  it.each(["false", "1", 0, null])("leaves the flag unset for %o", (success) => {
    expect(parseSearch({ step: 4, success }).success).toBeUndefined()
  })

  it("leaves the flag unset before the shopper has paid", () => {
    expect(parseSearch({ step: 1 }).success).toBeUndefined()
  })
})

describe("checkout route metadata", () => {
  it("builds its document head with the shared page head helper", () => {
    expect(route.head).toBe(pageHead)
  })

  it("preloads the checkout and cart copy", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.checkout", "pages.cart"] })
  })

  it("titles the document after the store and the checkout copy", async () => {
    await expect(loadMeta()).resolves.toStrictEqual({
      description: "Complete your order securely at M'Arte.",
      title: "M'Arte | Checkout",
    })
  })

  it("asks for the checkout messages of the active locale", async () => {
    await loadMeta()

    expect(seenQueryKeys).toStrictEqual([["messages", "en-US", "pages.checkout"]])
  })
})
