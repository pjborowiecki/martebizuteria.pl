import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { STORE_INFO_DEFAULTS, TOGGLE_SETTING_KEYS } from "~/src/data/settings"

import { PreferenceToggle } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/preference-toggle"
import { PreferencesCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/preferences-card"
import { SettingsGeneral } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/settings-general"
import { StoreInfoCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/store-info-card"

afterEach(() => {
  cleanup()
})

describe("PreferenceToggle", () => {
  it.each([
    ["maintenance", "Maintenance mode", "Temporarily disable the storefront for visitors."],
    ["inventoryTracking", "Inventory tracking", "Automatically track stock levels for all products."],
    ["autoFulfillment", "Automatic fulfillment", "Automatically fulfill orders when payment is captured."],
    ["orderConfirmation", "Order confirmation emails", "Send a confirmation email when an order is placed."],
  ] as const)("labels and describes the %s preference", (settingKey, label, description) => {
    renderWithProviders(<PreferenceToggle settingKey={settingKey} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it("offers a switch for the preference", () => {
    renderWithProviders(<PreferenceToggle settingKey="maintenance" />)

    expect(screen.getByRole("switch")).toBeInTheDocument()
  })
})

describe("PreferencesCard", () => {
  it("heads the card with the preferences copy", () => {
    renderWithProviders(<PreferencesCard />)

    expect(screen.getByText("Preferences")).toBeInTheDocument()
    expect(screen.getByText("Configure how your store operates.")).toBeInTheDocument()
  })

  it("renders one switch per configured preference", () => {
    renderWithProviders(<PreferencesCard />)

    expect(screen.getAllByRole("switch")).toHaveLength(TOGGLE_SETTING_KEYS.length)
  })
})

describe("StoreInfoCard", () => {
  it("heads the card with the store information copy", () => {
    renderWithProviders(<StoreInfoCard />)

    expect(screen.getByText("Store Information")).toBeInTheDocument()
    expect(screen.getByText("Basic details about your store.")).toBeInTheDocument()
  })

  it("prefills the store name, contact email and description", () => {
    renderWithProviders(<StoreInfoCard />)

    expect(screen.getByLabelText("Store name")).toHaveValue(STORE_INFO_DEFAULTS.name)
    expect(screen.getByLabelText("Contact email")).toHaveValue(STORE_INFO_DEFAULTS.email)
    expect(screen.getByLabelText("Description")).toHaveValue(STORE_INFO_DEFAULTS.description)
  })

  it("offers a save action", () => {
    renderWithProviders(<StoreInfoCard />)

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })
})

describe("SettingsGeneral", () => {
  it("stacks the store information card above the preferences card", () => {
    renderWithProviders(<SettingsGeneral />)
    const headings = screen.getAllByText(/Store Information|Preferences/u).map((node) => node.textContent)

    expect(headings).toStrictEqual(["Store Information", "Preferences"])
  })
})
