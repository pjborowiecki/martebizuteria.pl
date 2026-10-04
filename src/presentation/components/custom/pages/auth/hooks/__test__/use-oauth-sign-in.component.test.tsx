import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"
import { StubBroadcastChannel } from "~/src/platform/testing/mocks/broadcast-channel"

const { signInSocial, toastError, toastSuccess } = vi.hoisted(() => ({
  signInSocial: vi.fn<() => Promise<{ error: { code: string } | null }>>(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({ getBaseURL: () => "https://marte.test" }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { signIn: { social: signInSocial } } }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useOAuthSignIn } from "~/src/presentation/components/custom/pages/auth/hooks/use-oauth-sign-in"

const SIGN_IN_PAGE = "/auth/sign-in?redirect=%2Fen-US%2Faccount%2Forders"

const ADMIN_CUSTOMERS_PAGE_KEY = [...USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE, { page: 1 }]

vi.stubGlobal("BroadcastChannel", StubBroadcastChannel)

const renderSignIn = (queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })) => {
  const router = createTestRouter(SIGN_IN_PAGE)

  return renderHook(() => useOAuthSignIn(), {
    wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
      <TestProviders queryClient={queryClient} router={router}>
        {children}
      </TestProviders>
    ),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useOAuthSignIn", () => {
  it("explains a structured rejection from the provider", async () => {
    const rejection = { code: "USER_ALREADY_EXISTS" }
    signInSocial.mockRejectedValue(rejection)
    const { result } = renderSignIn()

    await expect(result.current.mutateAsync("google")).rejects.toBe(rejection)

    expect(toastError).toHaveBeenCalledWith("Something went wrong", { description: "An account with this email already exists." })
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("brings the shopper back to the sign-in page they started from, so its guard can send them on", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const { result } = renderSignIn()

    await result.current.mutateAsync("google")

    expect(signInSocial).toHaveBeenCalledWith({ callbackURL: SIGN_IN_PAGE, provider: "google" })
  })

  it("passes the provider the caller chose", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const { result } = renderSignIn()

    await result.current.mutateAsync("github")

    expect(signInSocial).toHaveBeenCalledWith({ callbackURL: SIGN_IN_PAGE, provider: "github" })
  })

  it("welcomes the shopper back when the provider accepts the sign in", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const { result } = renderSignIn()

    await result.current.mutateAsync("google")

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Welcome back", { description: "You're signed in to your M'Arte account." })
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it("fails the mutation when the provider returns an error", async () => {
    signInSocial.mockResolvedValue({ error: { code: "USER_ALREADY_EXISTS" } })
    const { result } = renderSignIn()

    await expect(result.current.mutateAsync("google")).rejects.toThrow("OAUTH_SIGN_IN_FAILED")
  })

  it("explains the provider error in the shopper's language", async () => {
    signInSocial.mockResolvedValue({ error: { code: "USER_ALREADY_EXISTS" } })
    const { result } = renderSignIn()

    await expect(result.current.mutateAsync("google")).rejects.toThrow()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong", {
        description: "An account with this email already exists.",
      })
    })
  })

  it("falls back to the generic message for an error code it does not know", async () => {
    signInSocial.mockResolvedValue({ error: { code: "SOMETHING_NEW" } })
    const { result } = renderSignIn()

    await expect(result.current.mutateAsync("google")).rejects.toThrow()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong", { description: "Something went wrong. Please try again." })
    })
  })

  it("leaves the admin customer list to the realtime hub, which hears about every new account from the server", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const queryClient = new QueryClient()
    queryClient.setQueryData(ADMIN_CUSTOMERS_PAGE_KEY, { items: [] })
    const { result } = renderSignIn(queryClient)

    await result.current.mutateAsync("google")

    expect(queryClient.getQueryState(ADMIN_CUSTOMERS_PAGE_KEY)?.isInvalidated).toBe(false)
    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
  })
})
