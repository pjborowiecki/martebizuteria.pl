import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

interface TwoFactorDialogProps {
  readonly enabled: boolean
  readonly onEnabledChange: () => void
  readonly open: boolean
  readonly variant?: string
}

vi.mock("~/src/presentation/components/custom/pages/account/profile/sections/two-factor-dialog", () => ({
  TwoFactorDialog: ({ enabled, onEnabledChange, open, variant }: TwoFactorDialogProps): JSX.Element | null =>
    open ? (
      <div data-variant={variant} role="dialog">
        {enabled ? "turn off" : "turn on"}
        <button onClick={onEnabledChange} type="button">
          finish
        </button>
      </div>
    ) : null,
}))

const { SettingsTwoFactorCard } =
  await import("~/src/presentation/components/custom/pages/admin/settings/security/settings-two-factor-card")

const user = () => userEvent.setup({ delay: null })

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe("SettingsTwoFactorCard", () => {
  it("shows two-factor as on and opens the admin-styled dialog to turn it off", async () => {
    renderWithProviders(<SettingsTwoFactorCard enabled hasPassword />)

    expect(screen.getByText("On")).toBeInTheDocument()

    await user().click(screen.getByRole("button", { name: "Turn off" }))

    expect(screen.getByRole("dialog")).toHaveTextContent("turn off")
    expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "default")
  })

  it("shows two-factor as off and opens the dialog to turn it on", async () => {
    renderWithProviders(<SettingsTwoFactorCard enabled={false} hasPassword />)

    expect(screen.getByText("Off")).toBeInTheDocument()

    await user().click(screen.getByRole("button", { name: "Turn on" }))

    expect(screen.getByRole("dialog")).toHaveTextContent("turn on")
  })

  it("explains that every admin needs two-factor where the shop requires it", () => {
    vi.stubEnv("MODE", "production")
    renderWithProviders(<SettingsTwoFactorCard enabled hasPassword />)

    expect(screen.getByText(/Required for every admin in this shop/u)).toBeInTheDocument()
  })

  it("leaves the requirement out where the shop does not enforce it", () => {
    vi.stubEnv("MODE", "development")
    renderWithProviders(<SettingsTwoFactorCard enabled hasPassword />)

    expect(screen.queryByText(/Required for every admin in this shop/u)).not.toBeInTheDocument()
  })

  it("asks for a password first on an account without one", () => {
    vi.stubEnv("MODE", "development")
    renderWithProviders(<SettingsTwoFactorCard enabled={false} hasPassword={false} />)

    expect(screen.getByRole("button", { name: "Turn on" })).toBeDisabled()
    expect(screen.getByText(/Set a password first/u)).toBeInTheDocument()
  })

  it("reloads the account, its devices and the session once the change is made", async () => {
    const { queryClient } = renderWithProviders(<SettingsTwoFactorCard enabled={false} hasPassword />)
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")

    await user().click(screen.getByRole("button", { name: "Turn on" }))
    await user().click(screen.getByRole("button", { name: "finish" }))

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: USER_QUERY_KEYS.CUSTOMER.PROFILE })
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEYS.CUSTOMER.SESSIONS })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEYS.CURRENT })
  })
})
