import { type ReactNode } from "react"

import { QueryClient, noop } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"
import { CHECKOUT_QUERY_KEYS } from "~/src/modules/checkout/checkout.constants"
import { type CheckoutSessionStatus } from "~/src/modules/checkout/use-cases/get-checkout-session-status"

import { useCheckoutSessionEntry } from "~/src/presentation/components/custom/checkout/hooks/use-checkout-session-entry"
import { loadCheckoutSessionId, saveCheckoutSession } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

interface EntrySearch {
  readonly session_id?: string | undefined
  readonly success?: boolean | undefined
}

const { navigate, readStatus, toastError } = vi.hoisted(() => ({
  navigate: vi.fn<(options: object) => Promise<void>>(),
  readStatus: vi.fn<(sessionId: string) => Promise<CheckoutSessionStatus>>(),
  toastError: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError } }))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate }
})
vi.mock("~/src/modules/checkout/use-cases/get-checkout-session-status", async () => {
  const reactQuery = await import("@tanstack/react-query")
  const { CHECKOUT_QUERY_KEYS: KEYS } = await import("~/src/modules/checkout/checkout.constants")

  return {
    checkoutSessionStatusQuery: (sessionId: string | undefined) =>
      reactQuery.queryOptions({
        queryFn: sessionId === undefined ? reactQuery.skipToken : () => readStatus(sessionId),
        queryKey: [...KEYS.SESSION_STATUS, sessionId],
        staleTime: "static",
      }),
  }
})

const NOT_COMPLETED = "Your payment was not completed. Choose a payment method to try again."

const cartLine = (variantId: string): CartItem => ({
  id: variantId,
  image: "/ring.avif",
  price: "189,00 zł",
  qty: 1,
  rawPrice: 18_900,
  slug: "silver-ring",
  title: "Silver Ring",
  variantId,
  variantTitle: "One size",
})

const RING = cartLine("variant-ring")

const holdSession = (sessionId: string): void => {
  saveCheckoutSession({ lines: [{ qty: 1, variantId: RING.variantId }], sessionId })
}

const renderEntry = (search: EntrySearch) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      {children}
    </TestProviders>
  )

  return { ...renderHook((current: EntrySearch) => useCheckoutSessionEntry(current), { initialProps: search, wrapper }), queryClient }
}

const statusAnswered = (): Promise<void> =>
  waitFor(() => {
    expect(readStatus).toHaveBeenCalled()
  })

const statusNeverArrives = (): void => {
  readStatus.mockReturnValue(new Promise<CheckoutSessionStatus>(noop))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useCartStore.setState({ items: [RING] })
  navigate.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useCartStore.setState({ items: [] })
})

describe("useCheckoutSessionEntry on /checkout", () => {
  it("opens the checkout straight away when the browser holds no session", () => {
    const { result } = renderEntry({})

    expect(result.current).toBe("checkout")
    expect(readStatus).not.toHaveBeenCalled()
  })

  it("holds the checkout back until the stored session's state is known", async () => {
    holdSession("cs_stored")
    statusNeverArrives()
    const { result } = renderEntry({})

    await statusAnswered()

    expect(readStatus).toHaveBeenCalledWith("cs_stored")
    expect(result.current).toBe("checking")
  })

  it("continues a stored session that can still be paid", async () => {
    holdSession("cs_open")
    readStatus.mockResolvedValue("open")
    const { result } = renderEntry({})

    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })
    expect(loadCheckoutSessionId()).toBe("cs_open")
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("keeps a stored session whose payment the bank is still confirming, so the payment step can wait for it", async () => {
    holdSession("cs_awaiting_bank")
    readStatus.mockResolvedValue("processing")
    const { result } = renderEntry({})

    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })
    expect(loadCheckoutSessionId()).toBe("cs_awaiting_bank")
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows the confirmation of a stored session that was paid for this cart while the page was gone, instead of a payment form", async () => {
    holdSession("cs_paid")
    readStatus.mockResolvedValue("complete")
    const { result } = renderEntry({})

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ replace: true, search: { session_id: "cs_paid", success: true }, to: "." })
    })
    expect(result.current).toBe("checking")
    expect(toastError).not.toHaveBeenCalled()
  })

  it("forgets a stored session that closed before the checkout starts, so the payment step opens a fresh one", async () => {
    holdSession("cs_expired")
    readStatus.mockResolvedValue("closed")
    const { result } = renderEntry({})

    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })
    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("keeps a newer session another tab stored while the old one was being checked", async () => {
    holdSession("cs_expired")
    const status = Promise.withResolvers<CheckoutSessionStatus>()
    readStatus.mockReturnValue(status.promise)
    const { result } = renderEntry({})
    await statusAnswered()

    holdSession("cs_other_tab")
    status.resolve("closed")

    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })
    expect(loadCheckoutSessionId()).toBe("cs_other_tab")
  })

  it("opens the checkout as before when the session's state cannot be learned", async () => {
    holdSession("cs_unknown")
    readStatus.mockRejectedValue(new Error("TOO_MANY_REQUESTS"))
    const { result } = renderEntry({})

    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })
    expect(loadCheckoutSessionId()).toBe("cs_unknown")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("asks about the session it found on arrival only once, even after the payment step stores a replacement", async () => {
    holdSession("cs_open")
    readStatus.mockResolvedValue("open")
    const { rerender, result } = renderEntry({})
    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })

    holdSession("cs_replacement")
    rerender({})

    expect(result.current).toBe("checkout")
    expect(readStatus).toHaveBeenCalledOnce()
  })
})

describe("useCheckoutSessionEntry with an old payment the shopper never came back from", () => {
  it("forgets a stored session paid for another cart and opens the checkout with the cart untouched", async () => {
    holdSession("cs_paid_last_week")
    const cart = [RING, cartLine("variant-necklace")]
    useCartStore.setState({ items: cart })
    readStatus.mockResolvedValue("complete")
    const { result } = renderEntry({})

    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })
    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(useCartStore.getState().items).toStrictEqual(cart)
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("compares the cart only once it has loaded from storage", async () => {
    holdSession("cs_paid")
    readStatus.mockResolvedValue("complete")
    vi.spyOn(useCartStore.persist, "hasHydrated").mockReturnValue(false)
    const { result } = renderEntry({})
    await statusAnswered()
    await act(async () => {
      await Promise.resolve()
    })

    expect(navigate).not.toHaveBeenCalled()
    expect(result.current).toBe("checking")

    await act(async () => {
      await useCartStore.persist.rehydrate()
    })

    expect(navigate).toHaveBeenCalledExactlyOnceWith({ replace: true, search: { session_id: "cs_paid", success: true }, to: "." })
    expect(loadCheckoutSessionId()).toBe("cs_paid")
  })
})

describe("useCheckoutSessionEntry after the arrival check", () => {
  it("leaves the confirmation of a session the payment step records as paid to the payment step's own navigation", async () => {
    holdSession("cs_open")
    readStatus.mockResolvedValue("open")
    const { queryClient, result } = renderEntry({})
    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })

    act(() => {
      queryClient.setQueryData([...CHECKOUT_QUERY_KEYS.SESSION_STATUS, "cs_open"], "complete")
    })

    expect(result.current).toBe("checkout")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("shows the confirmation once the payment step's navigation names the session it recorded as paid", async () => {
    holdSession("cs_open")
    readStatus.mockResolvedValue("open")
    const { queryClient, rerender, result } = renderEntry({})
    await waitFor(() => {
      expect(result.current).toBe("checkout")
    })

    queryClient.setQueryData([...CHECKOUT_QUERY_KEYS.SESSION_STATUS, "cs_open"], "complete")
    rerender({ session_id: "cs_open", success: true })

    expect(result.current).toBe("confirmation")
    expect(navigate).not.toHaveBeenCalled()
    expect(readStatus).toHaveBeenCalledOnce()
  })
})

describe("useCheckoutSessionEntry on the return from a payment", () => {
  it("shows the confirmation of a returned session that was paid", async () => {
    readStatus.mockResolvedValue("complete")
    const { result } = renderEntry({ session_id: "cs_paid", success: true })

    await waitFor(() => {
      expect(result.current).toBe("confirmation")
    })
    expect(readStatus).toHaveBeenCalledWith("cs_paid")
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("does not claim the payment went through while the returned session is still being checked", async () => {
    statusNeverArrives()
    const { result } = renderEntry({ session_id: "cs_returned", success: true })

    await statusAnswered()

    expect(result.current).toBe("checking")
  })

  it("sends a shopper who left the bank's page without paying back to the payment step with the session kept", async () => {
    holdSession("cs_abandoned")
    readStatus.mockResolvedValue("open")
    const { result } = renderEntry({ session_id: "cs_abandoned", success: true })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ replace: true, search: { step: 4 }, to: "." })
    })
    expect(toastError).toHaveBeenCalledExactlyOnceWith(NOT_COMPLETED)
    expect(result.current).toBe("checking")
    expect(loadCheckoutSessionId()).toBe("cs_abandoned")
  })

  it("sends a shopper whose bank is still confirming the returned payment to the payment step without saying it failed", async () => {
    holdSession("cs_awaiting_bank")
    readStatus.mockResolvedValue("processing")
    const { result } = renderEntry({ session_id: "cs_awaiting_bank", success: true })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ replace: true, search: { step: 4 }, to: "." })
    })
    expect(toastError).not.toHaveBeenCalled()
    expect(result.current).toBe("checking")
    expect(loadCheckoutSessionId()).toBe("cs_awaiting_bank")
  })

  it("continues the abandoned session on the payment step without asking about it again", async () => {
    holdSession("cs_abandoned")
    readStatus.mockResolvedValue("open")
    const { rerender, result } = renderEntry({ session_id: "cs_abandoned", success: true })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })

    rerender({})

    expect(result.current).toBe("checkout")
    expect(readStatus).toHaveBeenCalledOnce()
    expect(toastError).toHaveBeenCalledOnce()
  })

  it("forgets a returned session that has closed and sends the shopper back to pay again", async () => {
    holdSession("cs_failed")
    readStatus.mockResolvedValue("closed")
    const { rerender, result } = renderEntry({ session_id: "cs_failed", success: true })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ replace: true, search: { step: 4 }, to: "." })
    })
    expect(toastError).toHaveBeenCalledExactlyOnceWith(NOT_COMPLETED)
    expect(loadCheckoutSessionId()).toBeUndefined()

    rerender({})

    expect(result.current).toBe("checkout")
  })

  it("leaves the browser's own session alone when the returned one is a different, closed session", async () => {
    holdSession("cs_own")
    readStatus.mockResolvedValue("closed")
    renderEntry({ session_id: "cs_foreign", success: true })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })
    expect(loadCheckoutSessionId()).toBe("cs_own")
  })

  it("shows the generic confirmation for a return that names no session", () => {
    const { result } = renderEntry({ success: true })

    expect(result.current).toBe("confirmation")
    expect(readStatus).not.toHaveBeenCalled()
  })

  it("shows the confirmation as before when the returned session's state cannot be learned", async () => {
    readStatus.mockRejectedValue(new Error("TOO_MANY_REQUESTS"))
    const { result } = renderEntry({ session_id: "cs_returned", success: true })

    await waitFor(() => {
      expect(result.current).toBe("confirmation")
    })
    expect(navigate).not.toHaveBeenCalled()
  })
})
