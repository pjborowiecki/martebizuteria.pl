import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ description, title }: Readonly<{ description?: string; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/settings/settings-page", () => ({
  SettingsPage: (): JSX.Element => <section data-testid="settings-page" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/admin.settings"

const renderSettingsPage = () => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the admin settings route registered no component")
  }

  return renderWithProviders(<Page />)
}

afterEach(cleanup)

describe("the admin settings page", () => {
  it("heads the page with the settings title and description", () => {
    renderSettingsPage()

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByText("Manage your store configuration and preferences.")).toBeInTheDocument()
  })

  it("renders the settings sections under the header", () => {
    renderSettingsPage()

    const header = screen.getByRole("banner")
    const settings = screen.getByTestId("settings-page")

    expect(header.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
