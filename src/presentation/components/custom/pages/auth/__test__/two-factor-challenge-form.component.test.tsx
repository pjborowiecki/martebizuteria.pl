import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { navigate, verifyBackupCode, verifyTotp } = vi.hoisted(() => ({
  navigate: vi.fn(),
  verifyBackupCode: vi.fn<(input: { code: string; trustDevice: boolean }) => Promise<{ error: unknown }>>(),
  verifyTotp: vi.fn<(input: { code: string; trustDevice: boolean }) => Promise<{ error: unknown }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: { twoFactor: { verifyBackupCode, verifyTotp } },
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getCurrentSession: () => Promise.resolve({ user: { id: "user-1", role: "customer" } }),
}))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { TwoFactorChallengeForm } from "~/src/presentation/components/custom/pages/auth/two-factor-challenge-form"

const onCancel = vi.fn<() => void>()

beforeEach(() => {
  vi.clearAllMocks()
  verifyTotp.mockResolvedValue({ error: null })
  verifyBackupCode.mockResolvedValue({ error: null })
})

afterEach(cleanup)

describe("TwoFactorChallengeForm", () => {
  it("asks for the authenticator code", () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    expect(screen.getByRole("heading", { name: "Two-step verification" })).toBeInTheDocument()
    expect(screen.getByLabelText("Authentication code")).toBeInTheDocument()
  })

  it("verifies a six-digit code and lands the customer in their account", async () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "123456" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: false })
    })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledOnce()
    })
  })

  it("keeps the submit button disabled until six digits are entered", () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "12345" } })

    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled()
  })

  it("strips anything that is not a digit from the code", () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "1a2b3c" } })

    expect(screen.getByLabelText("Authentication code")).toHaveValue("123")
  })

  it("passes the trust-device choice through", async () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.click(screen.getByRole("checkbox", { name: "Trust this device for 60 days" }))
    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "123456" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: true })
    })
  })

  it("offers a recovery code as a way in when the app is unavailable", () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.click(screen.getByRole("button", { name: "Use a recovery code instead" }))

    expect(screen.getByLabelText("Recovery code")).toBeInTheDocument()
    expect(screen.queryByLabelText("Authentication code")).not.toBeInTheDocument()
  })

  it("verifies a recovery code through the backup endpoint", async () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "Use a recovery code instead" }))

    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: "AAAA-1111" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(verifyBackupCode).toHaveBeenCalledWith({ code: "AAAA-1111", trustDevice: false })
    })
    expect(verifyTotp).not.toHaveBeenCalled()
  })

  it("clears the field and stays put when the code is rejected", async () => {
    verifyTotp.mockResolvedValue({ error: { message: "INVALID_CODE" } })
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "000000" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Authentication code")).toHaveValue("")
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it("lets the customer go back to the password form", () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }))

    expect(onCancel).toHaveBeenCalledOnce()
  })
})
