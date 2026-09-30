import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ROUTES } from "~/src/routes"

interface ResetRequest {
  readonly fetchOptions: {
    readonly onError: (context: { error: unknown }) => void
    readonly onSuccess: () => void
  }
  readonly newPassword: string
  readonly token: string
}

const auth = vi.hoisted(() => {
  const requests: ResetRequest[] = []
  const outcome: { current: "error" | "success" } = { current: "success" }

  return {
    outcome,
    requests,
    resetPassword: vi.fn((input: ResetRequest) => {
      requests.push(input)

      if (outcome.current === "success") {
        input.fetchOptions.onSuccess()
      } else {
        input.fetchOptions.onError({ error: new Error("VALIDATION") })
      }

      return Promise.resolve(undefined)
    }),
  }
})

const navigation = vi.hoisted(() => ({ navigate: vi.fn<(options: { to: string }) => void>() }))

const toasts = vi.hoisted(() => ({
  error: vi.fn<(title: string, options: { description: string }) => void>(),
  success: vi.fn<(title: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ resetPassword: auth.resetPassword }))
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return { ...actual, useNavigate: () => navigation.navigate }
})

import { ResetPasswordForm } from "~/src/presentation/components/custom/pages/auth/reset-password-form"

const VALID_PASSWORD = "Str0ng!Pass"

const passwordField = (): HTMLElement => screen.getByLabelText(/^Password/u)

const confirmField = (): HTMLElement => screen.getByLabelText(/^Confirm password/u)

const submit = (): HTMLElement => screen.getByRole("button", { name: /Reset password/u })

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  auth.requests.length = 0
  auth.outcome.current = "success"
})

describe("ResetPasswordForm", () => {
  it("renders both password fields", () => {
    renderWithProviders(<ResetPasswordForm token="reset-token" />)

    expect(passwordField()).toBeInTheDocument()
    expect(confirmField()).toBeInTheDocument()
  })

  it("refuses to submit when the passwords do not match", async () => {
    renderWithProviders(<ResetPasswordForm token="reset-token" />)

    await userEvent.type(passwordField(), VALID_PASSWORD)
    await userEvent.type(confirmField(), "Different1!")
    await userEvent.click(submit())

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })

  it("refuses to submit a password without an uppercase letter", async () => {
    renderWithProviders(<ResetPasswordForm token="reset-token" />)

    await userEvent.type(passwordField(), "weakpass!1")
    await userEvent.type(confirmField(), "weakpass!1")
    await userEvent.click(submit())

    expect(await screen.findByText("At least one uppercase letter")).toBeInTheDocument()
    expect(auth.resetPassword).not.toHaveBeenCalled()
  })

  it("sends the new password with the reset token", async () => {
    renderWithProviders(<ResetPasswordForm token="reset-token" />)

    await userEvent.type(passwordField(), VALID_PASSWORD)
    await userEvent.type(confirmField(), VALID_PASSWORD)
    await userEvent.click(submit())

    await waitFor(() => {
      expect(auth.requests[0]).toMatchObject({ newPassword: VALID_PASSWORD, token: "reset-token" })
    })
  })

  it("confirms the change and sends the visitor to sign in", async () => {
    renderWithProviders(<ResetPasswordForm token="reset-token" />)

    await userEvent.type(passwordField(), VALID_PASSWORD)
    await userEvent.type(confirmField(), VALID_PASSWORD)
    await userEvent.click(submit())

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Password updated", {
        description: "Your new password is set. You can now sign in with it.",
      })
    })
    expect(navigation.navigate).toHaveBeenCalledWith({ to: ROUTES.AUTH_SIGN_IN })
  })

  it("reports a failed reset without navigating away", async () => {
    auth.outcome.current = "error"
    renderWithProviders(<ResetPasswordForm token="reset-token" />)

    await userEvent.type(passwordField(), VALID_PASSWORD)
    await userEvent.type(confirmField(), VALID_PASSWORD)
    await userEvent.click(submit())

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description: "Please check the form and try again." })
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})
