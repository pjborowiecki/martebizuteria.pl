import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface DialogProps {
  readonly open: boolean
  readonly variant?: string
}

vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/change-password-dialog", () => ({
  ChangePasswordDialog: ({ open, variant }: DialogProps): JSX.Element | null =>
    open ? (
      <div data-variant={variant} role="dialog">
        change password
      </div>
    ) : null,
}))
vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/set-password-dialog", () => ({
  SetPasswordDialog: ({ open, variant }: DialogProps): JSX.Element | null =>
    open ? (
      <div data-variant={variant} role="dialog">
        set password
      </div>
    ) : null,
}))

const { SettingsPasswordCard } = await import("~/src/presentation/components/custom/pages/admin/settings/security/settings-password-card")

afterEach(cleanup)

describe("SettingsPasswordCard", () => {
  it("opens the admin-styled change-password dialog for an account with a password", async () => {
    renderWithProviders(<SettingsPasswordCard hasPassword />)

    expect(screen.getByText(/Change the password you sign in with/u)).toBeInTheDocument()

    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: "Change password" }))

    expect(screen.getByRole("dialog")).toHaveTextContent("change password")
    expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "default")
  })

  it("offers to set a first password to an account that signs in with Google only", async () => {
    renderWithProviders(<SettingsPasswordCard hasPassword={false} />)

    expect(screen.getByText(/have no password yet/u)).toBeInTheDocument()

    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: "Set password" }))

    expect(screen.getByRole("dialog")).toHaveTextContent("set password")
    expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "default")
  })
})
