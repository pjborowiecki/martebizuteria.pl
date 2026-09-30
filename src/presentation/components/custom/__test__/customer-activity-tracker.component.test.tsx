import { QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { recordCustomerActivity, routeState, sessionState } = vi.hoisted(() => ({
  recordCustomerActivity: vi.fn<(options: { data: Record<string, unknown> }) => Promise<void>>(),
  routeState: { pathname: "/" },
  sessionState: { email: undefined as string | undefined },
}))

vi.mock("~/src/modules/customer-activity/use-cases/record-customer-activity", () => ({ recordCustomerActivity }))
vi.mock("~/src/integrations/better-auth/auth.session", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getCurrentSessionQuery: queryOptions({
      queryFn: () => (sessionState.email === undefined ? undefined : { user: { email: sessionState.email } }),
      queryKey: ["session", "current"],
    }),
  }
})
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    useRouteContext: ({ select }: { select: (context: { internalPathname: string }) => string }) =>
      select({ internalPathname: routeState.pathname }),
  }
})

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"
import { CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY } from "~/src/modules/customer-activity/customer-activity.constants"

import { CustomerActivityTracker } from "~/src/presentation/components/custom/customer-activity-tracker"

afterEach(cleanup)

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

const renderTracker = (signedIn = true) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (signedIn) {
    queryClient.setQueryData(["session", "current"], { user: { email: "anna@example.com" } })
  }

  return renderWithProviders(<CustomerActivityTracker />, { queryClient })
}

const recordedKinds = (): unknown[] => recordCustomerActivity.mock.calls.map((call) => call[0].data["kind"])

const hide = (): void => {
  const visibility = vi.spyOn(document, "visibilityState", "get")
  visibility.mockReturnValue("hidden")
  document.dispatchEvent(new Event("visibilitychange"))
  visibility.mockRestore()
}

const stayVisible = (): void => {
  document.dispatchEvent(new Event("visibilitychange"))
}

beforeEach(() => {
  recordCustomerActivity.mockReset()
  recordCustomerActivity.mockResolvedValue()
  routeState.pathname = "/"
  sessionState.email = "anna@example.com"
  useCartStore.setState({ items: [] })
  sessionStorage.clear()
})

describe("CustomerActivityTracker page views", () => {
  it("renders nothing at all", () => {
    const { container } = renderTracker()

    expect(container).toBeEmptyDOMElement()
  })

  it("records the storefront path the signed-in customer landed on", async () => {
    routeState.pathname = "/products/silver-ring"
    renderTracker()

    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenCalledWith({ data: { kind: "page_viewed", path: "/products/silver-ring" } })
    })
  })

  it("stays quiet for a guest", async () => {
    sessionState.email = undefined
    routeState.pathname = "/products/silver-ring"
    renderTracker(false)

    await waitFor(() => {
      expect(recordCustomerActivity).not.toHaveBeenCalled()
    })
  })

  it("never tracks the admin area", async () => {
    routeState.pathname = "/admin/orders"
    renderTracker()

    await waitFor(() => {
      expect(recordedKinds()).toStrictEqual([])
    })
  })

  it("never tracks the customer account area", async () => {
    routeState.pathname = "/account/orders"
    renderTracker()

    await waitFor(() => {
      expect(recordedKinds()).toStrictEqual([])
    })
  })

  it("records a path only once per session", async () => {
    routeState.pathname = "/products/silver-ring"
    const first = renderTracker()
    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenCalledTimes(1)
    })
    first.unmount()

    renderTracker()

    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenCalledTimes(1)
    })
  })

  it("records the next path the customer navigates to", async () => {
    routeState.pathname = "/products/silver-ring"
    const { unmount } = renderTracker()
    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenCalledTimes(1)
    })
    unmount()

    routeState.pathname = "/collections/rings"
    renderTracker()

    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenLastCalledWith({ data: { kind: "page_viewed", path: "/collections/rings" } })
    })
  })
})

describe("CustomerActivityTracker cart abandonment", () => {
  beforeEach(() => {
    routeState.pathname = ""
  })

  it("reports the abandoned quantities when the tab is hidden", async () => {
    useCartStore.setState({ items: [cartItem("v-1", 2), cartItem("v-2", 3)] })
    renderTracker()

    hide()

    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenCalledWith({ data: { itemCount: 5, kind: "cart_abandoned", lineCount: 2 } })
    })
  })

  it("ignores a visibility change that keeps the tab visible", async () => {
    useCartStore.setState({ items: [cartItem("v-1", 2)] })
    renderTracker()

    stayVisible()

    await waitFor(() => {
      expect(recordedKinds()).toStrictEqual([])
    })
  })

  it("does not report an empty cart as abandoned", async () => {
    renderTracker()

    hide()

    await waitFor(() => {
      expect(recordedKinds()).toStrictEqual([])
    })
  })

  it("does not report abandonment for a guest", async () => {
    sessionState.email = undefined
    useCartStore.setState({ items: [cartItem("v-1", 1)] })
    renderTracker(false)

    hide()

    await waitFor(() => {
      expect(recordCustomerActivity).not.toHaveBeenCalled()
    })
  })

  it("reports abandonment once until the cart is emptied", async () => {
    useCartStore.setState({ items: [cartItem("v-1", 1)] })
    renderTracker()

    hide()
    await waitFor(() => {
      expect(recordCustomerActivity).toHaveBeenCalledTimes(1)
    })
    hide()

    expect(recordCustomerActivity).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBe("1")
  })

  it("clears the abandonment flag once the cart becomes empty", async () => {
    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1")

    renderTracker()

    await waitFor(() => {
      expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBeNull()
    })
  })

  it("keeps the abandonment flag while the cart still holds items", async () => {
    useCartStore.setState({ items: [cartItem("v-1", 1)] })
    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1")

    renderTracker()

    await waitFor(() => {
      expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBe("1")
    })
  })

  it("stops listening for visibility changes after unmounting", async () => {
    useCartStore.setState({ items: [cartItem("v-1", 1)] })
    const { unmount } = renderTracker()
    await waitFor(() => {
      expect(recordedKinds()).toStrictEqual([])
    })

    unmount()
    hide()

    expect(recordCustomerActivity).not.toHaveBeenCalled()
  })
})
