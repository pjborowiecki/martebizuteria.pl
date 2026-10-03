import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const calls = vi.hoisted(() => ({
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { success: calls.toastSuccess } }))

import { Dialog, DialogContent } from "~/src/presentation/components/shadcn/dialog"

import { TwoFactorBackupStep } from "~/src/presentation/components/custom/pages/account/profile/sections/two-factor-backup-step"

const BACKUP_CODES = ["AAAA-1111", "BBBB-2222", "CCCC-3333"]

const renderStep = () => {
  const onAcknowledge = vi.fn<() => void>()
  renderWithProviders(
    <Dialog open>
      <DialogContent>
        <TwoFactorBackupStep backupCodes={BACKUP_CODES} onAcknowledge={onAcknowledge} />
      </DialogContent>
    </Dialog>,
  )

  return { onAcknowledge }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("TwoFactorBackupStep", () => {
  it("lists every recovery code once", () => {
    renderStep()

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual(BACKUP_CODES)
  })

  it("copies the recovery codes one per line", async () => {
    const user = userEvent.setup()
    renderStep()

    await user.click(screen.getByRole("button", { name: "Copy recovery codes" }))

    await expect(navigator.clipboard.readText()).resolves.toBe("AAAA-1111\nBBBB-2222\nCCCC-3333")
    expect(calls.toastSuccess).toHaveBeenCalledWith("Recovery codes copied")
  })

  it("finishes once the customer says the codes are saved", async () => {
    const user = userEvent.setup()
    const { onAcknowledge } = renderStep()

    await user.click(screen.getByRole("button", { name: "I have saved these codes" }))

    expect(onAcknowledge).toHaveBeenCalledOnce()
  })
})
