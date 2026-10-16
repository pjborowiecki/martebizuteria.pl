import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SettingsSignInMethodsCard } from "~/src/presentation/components/custom/pages/admin/settings/security/settings-sign-in-methods-card"

const row = (label: string): HTMLElement => {
  const element = screen.getByText(label).closest("[data-slot=settings-row]")
  if (!(element instanceof HTMLElement)) {
    throw new Error(`no settings row for ${label}`)
  }

  return element
}

afterEach(cleanup)

describe("SettingsSignInMethodsCard", () => {
  it("lists password sign-in as connected and Google as not connected", () => {
    renderWithProviders(<SettingsSignInMethodsCard hasGoogle={false} hasPassword />)

    expect(within(row("Email and password")).getByText("Connected")).toBeInTheDocument()
    expect(within(row("Google")).getByText("Not connected")).toBeInTheDocument()
    expect(screen.queryByText(/two-step verification/u)).not.toBeInTheDocument()
  })

  it("warns that Google sign-in skips the shop's code once Google is connected", () => {
    renderWithProviders(<SettingsSignInMethodsCard hasGoogle hasPassword={false} />)

    expect(within(row("Email and password")).getByText("Not connected")).toBeInTheDocument()
    expect(within(row("Google")).getByText("Connected")).toBeInTheDocument()
    expect(within(row("Google")).getByText(/keep two-step verification turned on/u)).toBeInTheDocument()
  })
})
