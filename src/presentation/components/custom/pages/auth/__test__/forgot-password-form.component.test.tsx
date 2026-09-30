import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface ResetRequest {
  readonly email: string
  readonly fetchOptions: {
    readonly onError: (context: { error: unknown }) => void
    readonly onSuccess: () => void
  }
  readonly redirectTo: string
}

const auth = vi.hoisted(() => {
  const requests: ResetRequest[] = []
  const outcome: { current: "error" | "success" } = { current: "success" }

  return {
    outcome,
    requestPasswordReset: vi.fn((input: ResetRequest) => {
      requests.push(input)

      if (outcome.current === "success") {
        input.fetchOptions.onSuccess()
      } else {
        input.fetchOptions.onError({ error: new Error("FORBIDDEN") })
      }

      return Promise.resolve(undefined)
    }),
    requests,
  }
})

const toasts = vi.hoisted(() => ({
  error: vi.fn<(title: string, options: { description: string }) => void>(),
  success: vi.fn<(title: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path.replace(/^\//u, "")}`,
  getBaseURL: () => "https://marte.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: { requestPasswordReset: auth.requestPasswordReset },
}))

import { ForgotPasswordForm } from "~/src/presentation/components/custom/pages/auth/forgot-password-form"

const emailField = (): HTMLElement => screen.getByLabelText(/Email address/u)

const submit = (): HTMLElement => screen.getByRole("button", { name: /Send reset link/u })

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  auth.requests.length = 0
  auth.outcome.current = "success"
})

describe("ForgotPasswordForm", () => {
  it("renders the email field and the submit action", () => {
    renderWithProviders(<ForgotPasswordForm />)

    expect(emailField()).toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it("refuses to send a reset link for an invalid address", async () => {
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(emailField(), "not-an-email")
    await userEvent.click(submit())

    expect(auth.requestPasswordReset).not.toHaveBeenCalled()
  })

  it("shows the translated validation message for an invalid address", async () => {
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(emailField(), "not-an-email")
    await userEvent.click(submit())

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument()
  })

  it("requests the reset for the address that was entered", async () => {
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(emailField(), "ada@example.test")
    await userEvent.click(submit())

    await waitFor(() => {
      expect(auth.requests[0]?.email).toBe("ada@example.test")
    })
  })

  it("points the reset link back at the localized reset page", async () => {
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(emailField(), "ada@example.test")
    await userEvent.click(submit())

    await waitFor(() => {
      expect(auth.requests[0]?.redirectTo).toContain("/reset-password")
    })
  })

  it("confirms the sent link and replaces the form with the inbox notice", async () => {
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(emailField(), "ada@example.test")
    await userEvent.click(submit())

    expect(await screen.findByText("We've sent a password reset link to your email. Please check your inbox.")).toBeInTheDocument()
    expect(toasts.success).toHaveBeenCalledWith("Check your inbox", {
      description: "If an account exists for this address, a secure link to reset your password is on its way.",
    })
  })

  it("keeps the form in place and reports the failure", async () => {
    auth.outcome.current = "error"
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(emailField(), "ada@example.test")
    await userEvent.click(submit())

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description: "You don't have permission to do this." })
    })
    expect(emailField()).toBeInTheDocument()
  })
})
