import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const calls = vi.hoisted(() => ({
  disable: vi.fn<(input: { password: string }) => Promise<{ error: unknown }>>(),
  enable: vi.fn<(input: { password: string }) => Promise<{ data: unknown; error: unknown }>>(),
  verifyTotp: vi.fn<(input: { code: string }) => Promise<{ error: unknown }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("qrcode", () => ({ default: { toString: () => Promise.resolve("<svg role='img' aria-label='qr'></svg>") } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: { twoFactor: { disable: calls.disable, enable: calls.enable, verifyTotp: calls.verifyTotp } },
}))
vi.mock(import("~/src/presentation/components/shadcn/dialog"), async (importOriginal) => {
  const actual = await importOriginal()
  const { Dialog: DialogPrimitive } = await import("@base-ui/react/dialog")

  return {
    ...actual,
    Dialog: ({ children, ...props }: Parameters<typeof actual.Dialog>[0]) => (
      <actual.Dialog {...props}>
        <DialogPrimitive.Trigger>Open from a trigger</DialogPrimitive.Trigger>
        {typeof children === "function" ? undefined : children}
      </actual.Dialog>
    ),
  }
})

import { TwoFactorDialog } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-dialog"

const TOTP_URI = "otpauth://totp/M'ARTE:anna@example.com?secret=JBSWY3DPEHPK3PXP&issuer=M'ARTE"

const renderDialog = (open = true) => {
  const handlers = { onEnabledChange: vi.fn<() => void>(), onOpenChange: vi.fn<(open: boolean) => void>() }
  renderWithProviders(
    <TwoFactorDialog enabled={false} onEnabledChange={handlers.onEnabledChange} onOpenChange={handlers.onOpenChange} open={open} />,
  )

  return handlers
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.enable.mockResolvedValue({ data: { backupCodes: ["AAAA-1111"], method: "totp", totpURI: TOTP_URI }, error: null })
})

afterEach(cleanup)

describe("TwoFactorDialog", () => {
  it("starts over from the password step after being closed half way through enrolment", async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.type(screen.getByLabelText("Password"), "OldPassword1!")
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await screen.findByRole("heading", { name: "Scan this with your authenticator app" })

    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(await screen.findByRole("heading", { name: "Enable two-factor authentication" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Setup key")).toBeNull()
  })

  it("tells its owner when a trigger asks to open it", async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog(false)

    await user.click(screen.getByRole("button", { name: "Open from a trigger" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
