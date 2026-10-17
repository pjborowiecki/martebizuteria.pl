import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ description, tabs, title }: Readonly<{ description?: string; tabs?: ReactNode; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {tabs}
    </header>
  ),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SettingsCard, SettingsRow } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"

import { ROUTES } from "~/src/routes"

afterEach(cleanup)

describe("SettingsPageLayout", () => {
  it("heads every section with the settings title, description and one tab per section", () => {
    renderWithProviders(
      <SettingsPageLayout active="account">
        <p>section body</p>
      </SettingsPageLayout>,
    )

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByText("Your account, its security, the shop's details, its delivery and its team.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", ROUTES.ADMIN_SETTINGS_ACCOUNT)
    expect(screen.getByRole("link", { name: "Sign-in & security" })).toHaveAttribute("href", ROUTES.ADMIN_SETTINGS_SECURITY)
    expect(screen.getByRole("link", { name: "Store details" })).toHaveAttribute("href", ROUTES.ADMIN_SETTINGS_STORE)
    expect(screen.getByRole("link", { name: "Delivery" })).toHaveAttribute("href", ROUTES.ADMIN_SETTINGS_DELIVERY)
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("href", ROUTES.ADMIN_SETTINGS_TEAM)
    expect(screen.getByText("section body")).toBeInTheDocument()
  })

  it("marks the open section's tab", () => {
    renderWithProviders(
      <SettingsPageLayout active="security">
        <p>section body</p>
      </SettingsPageLayout>,
    )

    expect(screen.getByRole("link", { name: "Sign-in & security" }).className).toContain("font-medium")
    expect(screen.getByRole("link", { name: "My account" }).className).not.toContain("font-medium")
  })
})

describe("SettingsCard", () => {
  it("shows its title, description and action, and its rows under a divider", () => {
    renderWithProviders(
      <SettingsCard action={<button type="button">Act</button>} description="What this card is for" title="Card title">
        <SettingsRow action={<button type="button">Edit</button>} label="Row label">
          Row value
        </SettingsRow>
      </SettingsCard>,
    )

    expect(screen.getByRole("heading", { name: "Card title" })).toBeInTheDocument()
    expect(screen.getByText("What this card is for")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument()
    expect(screen.getByText("Row label")).toBeInTheDocument()
    expect(screen.getByText("Row value")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
  })

  it("renders no body for a card without rows and no value line for a row without a value", () => {
    const { container } = renderWithProviders(
      <>
        <SettingsCard description="Only a header" title="Lonely" />
        <SettingsRow label="Just a label" />
      </>,
    )

    expect(container.querySelectorAll(".border-t")).toHaveLength(0)
    expect(screen.getByText("Just a label").nextElementSibling).toBeNull()
  })
})
