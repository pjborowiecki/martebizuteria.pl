import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"
import { StubBroadcastChannel } from "~/src/platform/testing/mocks/broadcast-channel"

const { navigate, signUpEmail, toastError, toastSuccess } = vi.hoisted(() => ({
  navigate: vi.fn(),
  signUpEmail: vi.fn<() => Promise<{ error: { code: string } | null }>>(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({ getBaseURL: () => "https://marte.test" }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signUp: { email: signUpEmail } }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, useNavigate: () => navigate }
})

import { type SignUpFormValues } from "~/src/integrations/better-auth/auth.zod"

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useSignUpWithPassword } from "~/src/presentation/components/custom/pages/auth/hooks/use-sign-up-with-password"

const ADMIN_CUSTOMERS_PAGE_KEY = [...USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE, { page: 1 }]

vi.stubGlobal("BroadcastChannel", StubBroadcastChannel)

const values: SignUpFormValues = {
  confirmPassword: "Sup3rSecret!",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  password: "Sup3rSecret!",
}

const renderSignUp = (queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })) => {
  const router = createTestRouter()

  return renderHook(() => useSignUpWithPassword(), {
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

describe("useSignUpWithPassword", () => {
  it("explains a structured rejection without navigating or reporting success", async () => {
    const rejection = { code: "PASSWORD_TOO_SHORT" }
    signUpEmail.mockRejectedValue(rejection)
    const { result } = renderSignUp()

    await expect(result.current.mutateAsync(values)).rejects.toBe(rejection)

    expect(toastError).toHaveBeenCalledWith("Something went wrong", { description: "Password is too short." })
    expect(navigate).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
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

  it("tells the shopper to check the inbox, or sign in for a new link, and sends them to sign in", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const { result } = renderSignUp()

    await result.current.mutateAsync(values)

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Almost there", {
        description:
          "If this address wasn't already registered, we've sent it a confirmation link. If it doesn't arrive within a few minutes, sign in to request a new one.",
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

  it("explains that emails are unavailable and that no account was created", async () => {
    signUpEmail.mockResolvedValue({ error: { code: "EMAIL_DELIVERY_UNAVAILABLE" } })
    const { result } = renderSignUp()

    await expect(result.current.mutateAsync(values)).rejects.toThrow("SIGN_UP_FAILED")

    expect(toastError).toHaveBeenCalledWith("Something went wrong", {
      description: "We can't send emails at the moment, so nothing has been changed. Please try again in a few minutes.",
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not navigate away when the sign up fails", async () => {
    signUpEmail.mockResolvedValue({ error: { code: "USER_ALREADY_EXISTS" } })
    const { result } = renderSignUp()

    await expect(result.current.mutateAsync(values)).rejects.toThrow()

    expect(navigate).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("leaves the admin customer list to the realtime hub, which hears about every new account from the server", async () => {
    signUpEmail.mockResolvedValue({ error: null })
    const queryClient = new QueryClient()
    queryClient.setQueryData(ADMIN_CUSTOMERS_PAGE_KEY, { items: [] })
    const { result } = renderSignUp(queryClient)

    await result.current.mutateAsync(values)

    expect(queryClient.getQueryState(ADMIN_CUSTOMERS_PAGE_KEY)?.isInvalidated).toBe(false)
    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
  })
})
