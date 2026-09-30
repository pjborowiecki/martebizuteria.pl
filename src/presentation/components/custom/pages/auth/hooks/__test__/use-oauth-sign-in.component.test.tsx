import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

const { signInSocial, syncQueryInvalidation, toastError, toastSuccess } = vi.hoisted(() => ({
  signInSocial: vi.fn<() => Promise<{ error: { code: string } | null }>>(),
  syncQueryInvalidation: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({ getBaseURL: () => "https://marte.test" }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { signIn: { social: signInSocial } } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useOAuthSignIn } from "~/src/presentation/components/custom/pages/auth/hooks/use-oauth-sign-in"

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    {children}
  </TestProviders>
)

const renderSignIn = () => renderHook(() => useOAuthSignIn(), { wrapper: Wrapper })

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useOAuthSignIn", () => {
  it("explains a structured rejection from the provider and still refreshes customers", async () => {
    const rejection = { code: "USER_ALREADY_EXISTS" }
    signInSocial.mockRejectedValue(rejection)
    const { result } = renderSignIn()

    await expect(result.current.mutateAsync("google")).rejects.toBe(rejection)

    expect(toastError).toHaveBeenCalledWith("Something went wrong", { description: "An account with this email already exists." })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), USER_QUERY_KEYS.ADMIN.CUSTOMERS)
  })

  it("sends the shopper to the provider with a localized callback url", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const { result } = renderSignIn()

    await result.current.mutateAsync("google")

    expect(signInSocial).toHaveBeenCalledWith({ callbackURL: "/en-US/account/overview", provider: "google" })
  })

  it("passes the provider the caller chose", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const { result } = renderSignIn()

    await result.current.mutateAsync("github")

    expect(signInSocial).toHaveBeenCalledWith({ callbackURL: "/en-US/account/overview", provider: "github" })
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

  it("refreshes the admin customers list after a successful sign in", async () => {
    signInSocial.mockResolvedValue({ error: null })
    const { result } = renderSignIn()

    await result.current.mutateAsync("google")

    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), USER_QUERY_KEYS.ADMIN.CUSTOMERS)
    })
  })

  it("refreshes the admin customers list even after a failed sign in", async () => {
    signInSocial.mockResolvedValue({ error: { code: "BANNED_USER" } })
    const { result } = renderSignIn()

    await expect(result.current.mutateAsync("google")).rejects.toThrow()

    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledWith(expect.anything(), USER_QUERY_KEYS.ADMIN.CUSTOMERS)
    })
  })
})
