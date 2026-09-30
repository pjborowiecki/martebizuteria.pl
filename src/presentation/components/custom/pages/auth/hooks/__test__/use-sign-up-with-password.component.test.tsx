import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

const { navigate, signUpEmail, syncQueryInvalidation, toastError, toastSuccess } = vi.hoisted(() => ({
  navigate: vi.fn(),
  signUpEmail: vi.fn<() => Promise<{ error: { code: string } | null }>>(),
  syncQueryInvalidation: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({ getBaseURL: () => "https://marte.test" }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signUp: { email: signUpEmail } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, useNavigate: () => navigate }
})

import { type SignUpFormValues } from "~/src/integrations/better-auth/auth.zod"

import { useSignUpWithPassword } from "~/src/presentation/components/custom/pages/auth/hooks/use-sign-up-with-password"

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders
    queryClient={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}
    router={createTestRouter()}
  >
    {children}
  </TestProviders>
)

const values: SignUpFormValues = {
  confirmPassword: "Sup3rSecret!",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  password: "Sup3rSecret!",
}

const renderSignUp = () => renderHook(() => useSignUpWithPassword(), { wrapper: Wrapper })

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useSignUpWithPassword", () => {
  it("explains a structured rejection without navigating or reporting success", async () => {
    const rejection = { code: "PASSWORD_TOO_SHORT" }
    signUpEmail.mockRejectedValue(rejection)
    const { result } = renderSignUp()

    await expect(result.current.mutateAsync(values)).rejects.toBe(rejection)

    expect(toastError).toHaveBeenCalledWith("Something went wrong", { description: "Password is too short." })
    expect(navigate).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(syncQueryInvalidation).toHaveBeenCalledOnce()
  })

  it("registers the full name and a localized verification callback", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const { result } = renderSignUp()

    await result.current.mutateAsync(values)

    expect(signUpEmail).toHaveBeenCalledWith({
      callbackURL: "/en-US/account/overview?verified=true",
      email: "anna@example.com",
      name: "Anna Kowalska",
      password: "Sup3rSecret!",
    })
  })

  it("does not send the password confirmation to the auth service", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const { result } = renderSignUp()

    await result.current.mutateAsync(values)

    expect(signUpEmail).not.toHaveBeenCalledWith(expect.objectContaining({ confirmPassword: "Sup3rSecret!" }))
  })

  it("trims the gap when only one name part is given", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const { result } = renderSignUp()

    await result.current.mutateAsync({ ...values, lastName: "" })

    expect(signUpEmail).toHaveBeenCalledWith(expect.objectContaining({ name: "Anna" }))
  })

  it("tells the shopper to check the inbox and sends them to sign in", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const { result } = renderSignUp()

    await result.current.mutateAsync(values)

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Almost there", {
        description: "If this address wasn't already registered, we've sent it a confirmation link. Please check your inbox.",
      })
    })
    expect(navigate).toHaveBeenCalledWith({ to: "/auth/sign-in" })
  })

  it("fails the mutation and explains a rejected sign up", async () => {
    signUpEmail.mockResolvedValue({ error: { code: "PASSWORD_TOO_SHORT" } })
    const { result } = renderSignUp()

    await expect(result.current.mutateAsync(values)).rejects.toThrow("SIGN_UP_FAILED")

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong", { description: "Password is too short." })
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not navigate away when the sign up fails", async () => {
    signUpEmail.mockResolvedValue({ error: { code: "USER_ALREADY_EXISTS" } })
    const { result } = renderSignUp()

    await expect(result.current.mutateAsync(values)).rejects.toThrow()

    expect(navigate).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("refreshes the admin customers list whichever way the sign up ends", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const { result } = renderSignUp()

    await result.current.mutateAsync(values)

    await waitFor(() => {
      expect(syncQueryInvalidation).toHaveBeenCalledOnce()
    })
  })
})
