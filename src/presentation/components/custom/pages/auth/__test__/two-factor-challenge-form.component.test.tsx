import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { redirectAfterAuth, toastError, verifyBackupCode, verifyTotp } = vi.hoisted(() => ({
  redirectAfterAuth: vi.fn<() => Promise<void>>(),
  toastError: vi.fn<(message: string) => void>(),
  verifyBackupCode: vi.fn<(input: { code: string; trustDevice: boolean }) => Promise<{ error: unknown }>>(),
  verifyTotp: vi.fn<(input: { code: string; trustDevice: boolean }) => Promise<{ error: unknown }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: { twoFactor: { verifyBackupCode, verifyTotp } },
}))
vi.mock("~/src/hooks/use-post-auth-redirect", () => ({ usePostAuthRedirect: () => redirectAfterAuth }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { TwoFactorChallengeForm } from "~/src/presentation/components/custom/pages/auth/two-factor-challenge-form"

import signInMessages from "~/messages/en-US/pages.auth.sign-in.json"

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

  it("verifies a six-digit code and hands the customer to the post-sign-in redirect", async () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "123456" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: false })
    })
    await waitFor(() => {
      expect(redirectAfterAuth).toHaveBeenCalledOnce()
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
    await waitFor(() => {
      expect(redirectAfterAuth).toHaveBeenCalledOnce()
    })
  })

  it("keeps Verify locked while the accepted code is taking the customer onwards", async () => {
    redirectAfterAuth.mockReturnValue(new Promise<void>(() => {}))
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "123456" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(redirectAfterAuth).toHaveBeenCalledOnce()
    })
    expect(screen.getByRole("button", { name: /Verify/u })).toBeDisabled()
  })

  it("clears the field and stays put when the code is rejected", async () => {
    verifyTotp.mockResolvedValue({ error: { message: "INVALID_CODE" } })
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Authentication code"), { target: { value: "000000" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Authentication code")).toHaveValue("")
    })
    expect(toastError).toHaveBeenCalledWith(signInMessages.twoFactor.wrongCode)
    expect(redirectAfterAuth).not.toHaveBeenCalled()
  })

  it("explains that a rejected recovery code works only once and lets the customer try another", async () => {
    verifyBackupCode.mockResolvedValue({ error: { message: "INVALID_BACKUP_CODE" } })
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "Use a recovery code instead" }))

    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: "AAAA-1111" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(signInMessages.twoFactor.wrongBackupCode)
    })
    expect(screen.getByLabelText("Recovery code")).toHaveValue("")
    expect(redirectAfterAuth).not.toHaveBeenCalled()
  })

  it("lets the customer go back to the password form", () => {
    renderWithProviders(<TwoFactorChallengeForm onCancel={onCancel} />)

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }))

    expect(onCancel).toHaveBeenCalledOnce()
  })
})
