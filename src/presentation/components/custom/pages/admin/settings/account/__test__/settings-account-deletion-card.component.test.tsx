import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SettingsAccountDeletionCard } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-account-deletion-card"

import { ROUTES } from "~/src/routes"

afterEach(cleanup)

describe("SettingsAccountDeletionCard", () => {
  it("explains that an admin account is closed only after another admin removes its access, and links to the team", () => {
    renderWithProviders(<SettingsAccountDeletionCard />)

    expect(screen.getByRole("heading", { name: "Delete account" })).toBeInTheDocument()
    expect(screen.getByText(/An admin account cannot be deleted/u)).toBeInTheDocument()
    expect(screen.getByText(/ask another admin to remove your admin access in Settings › Team/u)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Team" })).toHaveAttribute("href", ROUTES.ADMIN_SETTINGS_TEAM)
  })
})
