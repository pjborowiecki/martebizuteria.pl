import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const calls = vi.hoisted(() => ({
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { success: calls.toastSuccess } }))
vi.mock("qrcode", () => ({ default: { toString: () => Promise.resolve("<svg role='img' aria-label='qr'></svg>") } }))

import { Dialog, DialogContent } from "~/src/presentation/components/shadcn/dialog"

import { TwoFactorScanStep, readSetupKey } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-scan-step"

const TOTP_URI = "otpauth://totp/M'ARTE:anna@example.com?secret=JBSWY3DPEHPK3PXP&issuer=M'ARTE"

const renderStep = () => {
  const handlers = {
    onCancel: vi.fn<() => void>(),
    onSubmit: vi.fn<(code: string) => Promise<void>>(() => Promise.resolve()),
  }
  renderWithProviders(
    <Dialog open>
      <DialogContent>
        <TwoFactorScanStep onCancel={handlers.onCancel} onSubmit={handlers.onSubmit} totpUri={TOTP_URI} />
      </DialogContent>
    </Dialog>,
  )

  return handlers
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("readSetupKey", () => {
  it("reads the secret the authenticator app needs from the enrolment URI", () => {
    expect(readSetupKey(TOTP_URI)).toBe("JBSWY3DPEHPK3PXP")
  })

  it("offers no key for a URI that carries no secret", () => {
    expect(readSetupKey("otpauth://totp/M'ARTE:anna@example.com?issuer=M'ARTE")).toBe("")
  })

  it("offers no key for a value that is not a URI at all", () => {
    expect(readSetupKey("not a uri")).toBe("")
  })
})

describe("TwoFactorScanStep", () => {
  it("copies the setup key for a customer who cannot scan the code", async () => {
    const user = userEvent.setup()
    renderStep()

    await user.click(screen.getByRole("button", { name: "Copy setup key" }))

    await expect(navigator.clipboard.readText()).resolves.toBe("JBSWY3DPEHPK3PXP")
    expect(calls.toastSuccess).toHaveBeenCalledWith("Setup key copied")
  })

  it("hands the six digit code to the enrolment", async () => {
    const user = userEvent.setup()
    const handlers = renderStep()

    await user.type(screen.getByLabelText("Six-digit code"), "123456")
    await user.click(screen.getByRole("button", { name: "Verify and enable" }))

    await waitFor(() => {
      expect(handlers.onSubmit).toHaveBeenCalledWith("123456")
    })
  })
})
