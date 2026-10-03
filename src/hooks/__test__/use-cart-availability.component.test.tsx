import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

const { getAvailabilityByVariantIds } = vi.hoisted(() => ({
  getAvailabilityByVariantIds: vi.fn<(variantIds: readonly string[]) => Promise<Map<string, number>>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/better-auth/auth.middleware", async () => {
  const { createMiddleware } = await import("@tanstack/react-start")

  return { withRequest: createMiddleware({ type: "function" }).server(({ next }) => next()) }
})
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ getAvailabilityByVariantIds }))

const cartItem = (variantId: string, qty: number): CartItem => ({
  id: variantId,
  image: "/ring.avif",
  price: "199,00 zł",
  qty,
  rawPrice: 19_900,
  slug: "silver-ring",
  title: "Silver Ring",
  variantId,
  variantTitle: "One size",
})

const renderCartAvailability = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      {children}
    </TestProviders>
  )

  return { ...renderHook(() => useCartAvailability(), { wrapper }), queryClient }
}

beforeEach(() => {
  getAvailabilityByVariantIds.mockReset()
  useCartStore.setState({ items: [] })
})

afterEach(() => {
  cleanup()
})

describe("useCartAvailability with an empty cart", () => {
  it("reports an available cart without asking the server", async () => {
    const { result } = renderCartAvailability()

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.hasUnavailableItems).toBe(false)
    expect(result.current.issues).toStrictEqual([])
    expect(getAvailabilityByVariantIds).not.toHaveBeenCalled()
  })

  it("exposes an empty issue lookup", () => {
    const { result } = renderCartAvailability()

    expect(result.current.issuesByVariantId.size).toBe(0)
  })
})

describe("useCartAvailability with a stocked cart", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [cartItem("var_1", 2)] })
    getAvailabilityByVariantIds.mockResolvedValue(new Map([["var_1", 5]]))
  })

  it("reports no unavailable items", async () => {
    const { result } = renderCartAvailability()

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.hasUnavailableItems).toBe(false)
    expect(result.current.issues).toStrictEqual([])
  })

  it("checks exactly the variants the cart holds", async () => {
    renderCartAvailability()

    await waitFor(() => {
      expect(getAvailabilityByVariantIds).toHaveBeenCalledWith(["var_1"])
    })
  })

  it("is checking for the first time while the first answer is in flight", () => {
    const { result } = renderCartAvailability()

    expect(result.current.isChecking).toBe(true)
    expect(result.current.isFirstCheck).toBe(true)
  })

  it("is checking again, but no longer for the first time, while an answer is refreshed", async () => {
    const { queryClient, result } = renderCartAvailability()
    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })
    getAvailabilityByVariantIds.mockReturnValue(Promise.withResolvers<Map<string, number>>().promise)

    act(() => {
      void queryClient.invalidateQueries()
    })

    await waitFor(() => {
      expect(result.current.isChecking).toBe(true)
    })
    expect(result.current.isFirstCheck).toBe(false)
    expect(result.current.hasUnavailableItems).toBe(false)
  })
})

describe("useCartAvailability with a short-stocked cart", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [cartItem("var_1", 3), cartItem("var_2", 1)] })
    getAvailabilityByVariantIds.mockResolvedValue(
      new Map([
        ["var_1", 1],
        ["var_2", 4],
      ]),
    )
  })

  it("reports only the line that cannot be fulfilled", async () => {
    const { result } = renderCartAvailability()

    await waitFor(() => {
      expect(result.current.hasUnavailableItems).toBe(true)
    })

    expect(result.current.issues).toStrictEqual([{ available: 1, qty: 3, variantId: "var_1" }])
  })

  it("keys the issues by variant so a line can look up its own problem", async () => {
    const { result } = renderCartAvailability()

    await waitFor(() => {
      expect(result.current.issuesByVariantId.size).toBe(1)
    })

    expect(result.current.issuesByVariantId.get("var_1")).toStrictEqual({ available: 1, qty: 3, variantId: "var_1" })
    expect(result.current.issuesByVariantId.get("var_2")).toBeUndefined()
  })
})

describe("useCartAvailability with an untracked variant", () => {
  it("treats a variant with no inventory row as sold out", async () => {
    useCartStore.setState({ items: [cartItem("var_ghost", 1)] })
    getAvailabilityByVariantIds.mockResolvedValue(new Map())
    const { result } = renderCartAvailability()

    await waitFor(() => {
      expect(result.current.hasUnavailableItems).toBe(true)
    })

    expect(result.current.issues).toStrictEqual([{ available: 0, qty: 1, variantId: "var_ghost" }])
  })
})
