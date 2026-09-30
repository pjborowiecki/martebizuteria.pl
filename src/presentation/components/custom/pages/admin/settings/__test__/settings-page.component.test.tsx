import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SettingsPage } from "~/src/presentation/components/custom/pages/admin/settings/settings-page"
import { SettingsPlaceholder } from "~/src/presentation/components/custom/pages/admin/settings/settings-placeholder"

afterEach(() => {
  cleanup()
})

describe("SettingsPlaceholder", () => {
  it("names the tab it stands in for and says the section is unfinished", () => {
    renderWithProviders(<SettingsPlaceholder activeTab="appearance" />)

    expect(screen.getByText("Appearance")).toBeInTheDocument()
    expect(screen.getByText("This section is coming soon.")).toBeInTheDocument()
  })

  it("renders the icon of the tab it stands in for", () => {
    const { container } = renderWithProviders(<SettingsPlaceholder activeTab="security" />)

    expect(container.querySelector("svg")).not.toBeNull()
  })
})

describe("SettingsPage", () => {
  it("opens on the general tab and shows the store information form", () => {
    renderWithProviders(<SettingsPage />)

    expect(screen.getByText("Store Information")).toBeInTheDocument()
    expect(screen.getByLabelText("Store name")).toHaveValue("M'ARTE")
  })

  it("replaces the general form with a placeholder once another tab is chosen", async () => {
    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole("button", { name: "Shipping" }))

    expect(screen.queryByText("Store Information")).not.toBeInTheDocument()
    expect(screen.getByText("This section is coming soon.")).toBeInTheDocument()
  })

  it("brings the general form back when the user returns to it", async () => {
    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole("button", { name: "Security" }))
    await userEvent.click(screen.getByRole("button", { name: "General" }))

    expect(screen.getByText("Store Information")).toBeInTheDocument()
    expect(screen.queryByText("This section is coming soon.")).not.toBeInTheDocument()
  })

  it("keeps the preference toggles on the general tab", () => {
    renderWithProviders(<SettingsPage />)

    expect(screen.getByText("Preferences")).toBeInTheDocument()
    expect(screen.getByText("Maintenance mode")).toBeInTheDocument()
  })
})
