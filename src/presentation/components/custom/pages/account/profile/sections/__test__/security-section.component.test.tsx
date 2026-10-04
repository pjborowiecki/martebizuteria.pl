import { type JSX } from "react"

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { accountState, changePassword, disableTwoFactor, enableTwoFactor, verifyTotp } = vi.hoisted(() => ({
  accountState: { twoFactorEnabled: false },
  changePassword: vi.fn<(input: { fetchOptions: { onSuccess: () => void } }) => Promise<unknown>>(),
  disableTwoFactor: vi.fn<(input: { password: string }) => Promise<{ error: unknown }>>(),
  enableTwoFactor: vi.fn<(input: { password: string }) => Promise<{ data: unknown; error: unknown }>>(),
  verifyTotp: vi.fn<(input: { code: string }) => Promise<{ error: unknown }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: {
    changePassword,
    twoFactor: { disable: disableTwoFactor, enable: enableTwoFactor, verifyTotp },
  },
}))
vi.mock("qrcode", () => ({ default: { toString: () => Promise.resolve("<svg role='img' aria-label='qr'></svg>") } }))

import { QueryClient, useQuery } from "@tanstack/react-query"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { SecuritySection } from "~/src/presentation/components/custom/pages/account/profile/sections/security-section"

const TOTP_URI = "otpauth://totp/M'ARTE:anna@example.com?secret=JBSWY3DPEHPK3PXP&issuer=M'ARTE"

const openTwoFactor = () => {
  fireEvent.click(screen.getByRole("button", { name: /Enable|Disable/u }))
}

const typePassword = (value: string) => {
  fireEvent.change(screen.getByLabelText("Password"), { target: { value } })
}

const submit = async (name: string): Promise<void> => {
  const button = await screen.findByRole("button", { name })
  await waitFor(() => {
    expect(button).toBeEnabled()
  })
  fireEvent.click(button)
}

beforeEach(() => {
  vi.clearAllMocks()
  accountState.twoFactorEnabled = false
  enableTwoFactor.mockResolvedValue({
    data: { backupCodes: ["AAAA-1111", "BBBB-2222"], method: "totp", totpURI: TOTP_URI },
    error: null,
  })
  verifyTotp.mockResolvedValue({ error: null })
  disableTwoFactor.mockResolvedValue({ error: null })
  changePassword.mockImplementation((input) => {
    input.fetchOptions.onSuccess()

    return Promise.resolve({ data: {}, error: null })
  })
})

afterEach(cleanup)

const renderSection = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
  renderWithProviders(<SecuritySection twoFactorEnabled={accountState.twoFactorEnabled} />, { queryClient })

  return { invalidateQueries }
}

const expectAccountReloaded = (invalidateQueries: ReturnType<typeof renderSection>["invalidateQueries"]): void => {
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEYS.CURRENT })
}

describe("SecuritySection", () => {
  it("heads the section with the translated security title", () => {
    renderSection()

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Login & Security")
  })

  it("describes both security rows", () => {
    renderSection()

    expect(screen.getByText("Change Password")).toBeInTheDocument()
    expect(screen.getByText("Two-Factor Authentication (2FA)")).toBeInTheDocument()
  })

  it("reports two-factor as off for an account without it", () => {
    renderSection()

    expect(screen.getByText("Off")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument()
  })

  it("reports two-factor as on and offers to turn it off", () => {
    accountState.twoFactorEnabled = true
    renderSection()

    expect(screen.getByText("On")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument()
  })
})

const openPassword = () => {
  fireEvent.click(screen.getByRole("button", { name: "Update" }))
}

describe("SecuritySection change password", () => {
  it("opens a dialog asking for the current and new password", async () => {
    renderSection()
    openPassword()

    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeInTheDocument()
    expect(screen.getByLabelText("Current password")).toBeInTheDocument()
    expect(screen.getByLabelText("New password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument()
  })

  it("sends the change to better-auth and signs other devices out by default", async () => {
    renderSection()
    openPassword()
    await screen.findByRole("heading", { name: "Change your password" })

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "OldPassword1!" } })
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "NewPassword1!" } })
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "NewPassword1!" } })
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledOnce()
    })
    expect(changePassword.mock.calls[0]?.[0]).toMatchObject({
      currentPassword: "OldPassword1!",
      newPassword: "NewPassword1!",
      revokeOtherSessions: true,
    })
  })

  it("refuses a new password that does not match its confirmation", async () => {
    renderSection()
    openPassword()
    await screen.findByRole("heading", { name: "Change your password" })

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "OldPassword1!" } })
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "NewPassword1!" } })
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Different1!" } })
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it("refuses reusing the current password as the new one", async () => {
    renderSection()
    openPassword()
    await screen.findByRole("heading", { name: "Change your password" })

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "SamePassword1!" } })
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "SamePassword1!" } })
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "SamePassword1!" } })
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))

    expect(await screen.findByText("Choose a password different from your current one.")).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })
})

describe("SecuritySection two-factor enrolment", () => {
  it("asks for the password before starting enrolment", async () => {
    renderSection()
    openTwoFactor()

    expect(await screen.findByRole("heading", { name: "Enable two-factor authentication" })).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
  })

  it("shows the QR code and the setup key once the password is accepted", async () => {
    renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")

    typePassword("OldPassword1!")
    await submit("Continue")

    expect(await screen.findByRole("heading", { name: "Scan this with your authenticator app" })).toBeInTheDocument()
    expect(screen.getByLabelText("Setup key")).toHaveValue("JBSWY3DPEHPK3PXP")
    expect(enableTwoFactor).toHaveBeenCalledWith({ password: "OldPassword1!" })
  })

  it("will not advance past the password step when the password is wrong", async () => {
    enableTwoFactor.mockResolvedValue({ data: null, error: { message: "INVALID_PASSWORD" } })
    renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")

    typePassword("WrongPassword1!")
    await submit("Continue")

    await waitFor(() => {
      expect(enableTwoFactor).toHaveBeenCalledOnce()
    })
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
  })

  it("shows the recovery codes only after the code is verified", async () => {
    renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")
    typePassword("OldPassword1!")
    await submit("Continue")
    await screen.findByLabelText("Six-digit code")

    fireEvent.change(screen.getByLabelText("Six-digit code"), { target: { value: "123456" } })
    await submit("Verify and enable")

    expect(await screen.findByRole("heading", { name: "Save your recovery codes" })).toBeInTheDocument()
    expect(screen.getByText("AAAA-1111")).toBeInTheDocument()
    expect(verifyTotp).toHaveBeenCalledWith({ code: "123456" })
  })

  it("keeps the code step open when the code is rejected", async () => {
    verifyTotp.mockResolvedValue({ error: { message: "INVALID_CODE" } })
    renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")
    typePassword("OldPassword1!")
    await submit("Continue")
    await screen.findByLabelText("Six-digit code")

    fireEvent.change(screen.getByLabelText("Six-digit code"), { target: { value: "000000" } })
    await submit("Verify and enable")

    await waitFor(() => {
      expect(verifyTotp).toHaveBeenCalledOnce()
    })
    expect(screen.getByLabelText("Six-digit code")).toBeInTheDocument()
  })

  it("rejects anything other than six digits in the code field", async () => {
    renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")
    typePassword("OldPassword1!")
    await submit("Continue")
    const codeField = await screen.findByLabelText("Six-digit code")

    fireEvent.change(codeField, { target: { value: "12ab34" } })

    expect(await screen.findByText("Enter the six digits from your authenticator app.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Verify and enable" })).toBeDisabled()
  })

  it("reloads the account, its session and the signed-in devices once enrolment finishes", async () => {
    const { invalidateQueries } = renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")
    typePassword("OldPassword1!")
    await submit("Continue")
    await screen.findByLabelText("Six-digit code")
    fireEvent.change(screen.getByLabelText("Six-digit code"), { target: { value: "123456" } })
    await submit("Verify and enable")

    await waitFor(() => {
      expectAccountReloaded(invalidateQueries)
    })
  })
})

describe("SecuritySection two-factor removal", () => {
  it("asks for the password and warns what is being given up", async () => {
    accountState.twoFactorEnabled = true
    renderSection()
    openTwoFactor()

    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).getByRole("heading", { name: "Turn off two-factor authentication" })).toBeInTheDocument()
    expect(within(dialog).getByText(/protected by your password alone/u)).toBeInTheDocument()
  })

  it("turns two-factor off and reloads the account, its session and the signed-in devices", async () => {
    accountState.twoFactorEnabled = true
    const { invalidateQueries } = renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")

    typePassword("OldPassword1!")
    await submit("Turn off 2FA")

    await waitFor(() => {
      expect(disableTwoFactor).toHaveBeenCalledWith({ password: "OldPassword1!" })
    })
    expectAccountReloaded(invalidateQueries)
  })

  it("leaves two-factor on when the password is wrong", async () => {
    accountState.twoFactorEnabled = true
    disableTwoFactor.mockResolvedValue({ error: { message: "INVALID_PASSWORD" } })
    const { invalidateQueries } = renderSection()
    openTwoFactor()
    await screen.findByLabelText("Password")

    typePassword("WrongPassword1!")
    await submit("Turn off 2FA")

    await waitFor(() => {
      expect(disableTwoFactor).toHaveBeenCalledOnce()
    })
    expect(screen.getByText("On")).toBeInTheDocument()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

const AccountSecurity = (): JSX.Element => {
  const { data } = useQuery({
    queryFn: () => Promise.resolve({ twoFactorEnabled: accountState.twoFactorEnabled }),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE,
  })

  return <SecuritySection twoFactorEnabled={data?.twoFactorEnabled === true} />
}

const renderAccountSecurity = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE, { twoFactorEnabled: accountState.twoFactorEnabled })

  return renderWithProviders(<AccountSecurity />, { queryClient })
}

describe("SecuritySection status after a change", () => {
  it("shows two-factor as on once the server confirms the enrolment", async () => {
    verifyTotp.mockImplementation(() => {
      accountState.twoFactorEnabled = true

      return Promise.resolve({ error: null })
    })
    renderAccountSecurity()
    openTwoFactor()
    await screen.findByLabelText("Password")
    typePassword("OldPassword1!")
    await submit("Continue")
    await screen.findByLabelText("Six-digit code")
    fireEvent.change(screen.getByLabelText("Six-digit code"), { target: { value: "123456" } })
    await submit("Verify and enable")
    fireEvent.click(await screen.findByRole("button", { name: "I have saved these codes" }))

    expect(await screen.findByText("On")).toBeInTheDocument()
  })

  it("shows two-factor as off once the server confirms the removal", async () => {
    accountState.twoFactorEnabled = true
    disableTwoFactor.mockImplementation(() => {
      accountState.twoFactorEnabled = false

      return Promise.resolve({ error: null })
    })
    renderAccountSecurity()
    openTwoFactor()
    await screen.findByLabelText("Password")
    typePassword("OldPassword1!")
    await submit("Turn off 2FA")

    expect(await screen.findByText("Off")).toBeInTheDocument()
  })
})
