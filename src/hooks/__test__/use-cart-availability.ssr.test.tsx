import { type JSX } from "react"
import { renderToString } from "react-dom/server"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ env: { DB: {} } }))
vi.mock("~/src/integrations/better-auth/auth.middleware", async () => {
  const { createMiddleware } = await import("@tanstack/react-start")

  return { withRequest: createMiddleware({ type: "function" }).server(({ next }) => next()) }
})
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ getAvailabilityByVariantIds: vi.fn() }))
vi.mock("~/src/modules/payment/payment.accessors", () => ({ getHeldLinesByTransactionId: vi.fn() }))

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

const Availability = (): JSX.Element => {
  const { hasUnavailableItems } = useCartAvailability()

  return <output>{String(hasUnavailableItems)}</output>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useCartAvailability on the server", () => {
  it("renders without a held checkout, whatever browser storage would say", () => {
    vi.stubGlobal("localStorage", { getItem: () => "cs_test_held" })
    const queryClient = new QueryClient()

    expect(
      renderToString(
        <QueryClientProvider client={queryClient}>
          <Availability />
        </QueryClientProvider>,
      ),
    ).toBe("<output>false</output>")
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toStrictEqual([...CART_QUERY_KEYS.AVAILABILITY, [], undefined])
  })
})
