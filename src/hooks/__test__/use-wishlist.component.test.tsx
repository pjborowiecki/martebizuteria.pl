import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const SESSION_KEY = vi.hoisted(() => ["session", "current"] as const)

const calls = vi.hoisted(() => ({
  navigate: vi.fn<(options: { to: string }) => Promise<void>>(),
  session: { user: undefined as { id: string } | undefined },
  toastError: vi.fn<(message: string) => void>(),
  toastInfo: vi.fn<(message: string, options: { action: { label: string; onClick: () => void }; description: string }) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  toggle: vi.fn<(variables: { productId: string }) => Promise<{ wishlisted: boolean }>>(),
}))

vi.mock("sonner", () => ({
  toast: { error: calls.toastError, info: calls.toastInfo, success: calls.toastSuccess },
}))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => calls.navigate }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getCurrentSessionQuery: { queryFn: () => Promise.resolve(calls.session), queryKey: SESSION_KEY },
}))
vi.mock("~/src/modules/wishlist/use-cases/toggle-wishlist-item", () => ({
  toggleWishlistItemMutation: { mutationFn: calls.toggle, mutationKey: ["wishlist", "toggleItem"] },
}))
vi.mock("~/src/modules/wishlist/use-cases/list-wishlist-product-ids", () => ({
  listWishlistProductIdsQuery: () => ({ queryFn: () => Promise.resolve(["product-1"]), queryKey: ["wishlist", "productIds"] }),
}))

import { WISHLIST_ERROR_CODES, WISHLIST_MAX_ITEMS, WISHLIST_QUERY_KEYS } from "~/src/modules/wishlist/wishlist.constants"

import { useWishlist } from "~/src/hooks/use-wishlist"

const WishlistProbe = (): JSX.Element => {
  const { isWishlisted, signedIn, toggle } = useWishlist()

  return (
    <div>
      <p>{signedIn ? "signed in" : "guest"}</p>
      <p>{isWishlisted("product-1") ? "saved" : "not saved"}</p>
      <button
        onClick={() => {
          toggle("product-1")
        }}
        type="button"
      >
        toggle
      </button>
    </div>
  )
}

const renderProbe = (saved: readonly string[] = []) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(WISHLIST_QUERY_KEYS.PRODUCT_IDS, saved)
  queryClient.setQueryData(SESSION_KEY, calls.session)

  return renderWithProviders(<WishlistProbe />, { queryClient })
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.session.user = { id: "user-1" }
  calls.toggle.mockResolvedValue({ wishlisted: true })
})

afterEach(cleanup)

describe("useWishlist for a signed-in customer", () => {
  it("reads the saved products from the account", () => {
    renderProbe(["product-1"])

    expect(screen.getByText("saved")).toBeInTheDocument()
    expect(screen.getByText("signed in")).toBeInTheDocument()
  })

  it("reports a product the customer has not saved", () => {
    renderProbe([])

    expect(screen.getByText("not saved")).toBeInTheDocument()
  })

  it("saves the product against the account and confirms it", async () => {
    renderProbe([])
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))

    await waitFor(() => {
      expect(calls.toggle.mock.lastCall?.[0]).toStrictEqual({ productId: "product-1" })
    })
    expect(calls.toastSuccess).toHaveBeenCalledWith("Saved to your wishlist")
  })

  it("confirms a removal with its own message", async () => {
    calls.toggle.mockResolvedValue({ wishlisted: false })
    renderProbe(["product-1"])
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledWith("Removed from your wishlist")
    })
  })

  it("refreshes every wishlist read after a change", async () => {
    const { queryClient } = renderProbe([])
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: WISHLIST_QUERY_KEYS.ROOT })
    })
  })

  it("says so when the change could not be saved", async () => {
    calls.toggle.mockRejectedValue(new Error("offline"))
    renderProbe([])
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not update your wishlist. Please try again.")
    })
  })

  it("explains a full wishlist instead of blaming the network", async () => {
    calls.toggle.mockRejectedValue(new Error(WISHLIST_ERROR_CODES.FULL))
    renderProbe([])
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith(
        `Your wishlist holds the most we can keep (${WISHLIST_MAX_ITEMS} pieces). Remove one to save another.`,
      )
    })
  })
})

describe("useWishlist for a guest", () => {
  beforeEach(() => {
    calls.session.user = undefined
  })

  it("holds nothing saved and asks the visitor to sign in instead of writing", () => {
    renderProbe([])
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))

    expect(screen.getByText("guest")).toBeInTheDocument()
    expect(calls.toggle).not.toHaveBeenCalled()
    expect(calls.toastInfo).toHaveBeenCalledWith(
      "Sign in to save pieces",
      expect.objectContaining({ description: "Your wishlist is kept with your account." }),
    )
  })

  it("sends the visitor to sign in from the prompt", () => {
    renderProbe([])
    fireEvent.click(screen.getByRole("button", { name: "toggle" }))
    calls.toastInfo.mock.lastCall?.[1].action.onClick()

    expect(calls.navigate).toHaveBeenCalledWith({ to: "/auth/sign-in" })
  })
})
