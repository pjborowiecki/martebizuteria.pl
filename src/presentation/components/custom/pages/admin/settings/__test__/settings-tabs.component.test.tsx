import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SETTINGS_TAB_DEFINITIONS, type SettingsTab } from "~/src/data/settings"

import { SettingsTabButton } from "~/src/presentation/components/custom/pages/admin/settings/settings-tab-button"
import { SettingsTabs } from "~/src/presentation/components/custom/pages/admin/settings/settings-tabs"

const [generalTab] = SETTINGS_TAB_DEFINITIONS

if (generalTab === undefined) {
  throw new Error("SETTINGS_TAB_DEFINITIONS is empty")
}

const selectMock = () => vi.fn<(key: SettingsTab) => void>()

afterEach(() => {
  cleanup()
})

describe("SettingsTabButton", () => {
  it("labels the button with the translated tab name", () => {
    renderWithProviders(<SettingsTabButton isActive={false} onSelect={selectMock()} tab={generalTab} />)

    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument()
  })

  it("hands its own tab key to the selection callback", async () => {
    const onSelect = selectMock()
    renderWithProviders(<SettingsTabButton isActive={false} onSelect={onSelect} tab={generalTab} />)

    await userEvent.click(screen.getByRole("button", { name: "General" }))

    expect(onSelect).toHaveBeenCalledWith("general")
  })

  it("marks the active tab with the selected background", () => {
    renderWithProviders(<SettingsTabButton isActive onSelect={selectMock()} tab={generalTab} />)

    expect(screen.getByRole("button", { name: "General" })).toHaveClass("bg-secondary")
  })

  it("leaves an inactive tab muted instead of selected", () => {
    renderWithProviders(<SettingsTabButton isActive={false} onSelect={selectMock()} tab={generalTab} />)

    const button = screen.getByRole("button", { name: "General" })

    expect(button).not.toHaveClass("bg-secondary")
    expect(button).toHaveClass("text-muted-foreground")
  })
})

describe("SettingsTabs", () => {
  it("renders one button per configured tab, in order", () => {
    renderWithProviders(<SettingsTabs activeTab="general" onTabChange={selectMock()} />)

    const names = screen.getAllByRole("button").map((button) => button.textContent)

    expect(names).toStrictEqual(["General", "Account", "Shipping", "Appearance", "Security", "Localization"])
  })

  it("reports the tab the user picked rather than the active one", async () => {
    const onTabChange = selectMock()
    renderWithProviders(<SettingsTabs activeTab="general" onTabChange={onTabChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Shipping" }))

    expect(onTabChange).toHaveBeenCalledWith("shipping")
  })

  it("highlights only the active tab", () => {
    renderWithProviders(<SettingsTabs activeTab="security" onTabChange={selectMock()} />)

    expect(screen.getByRole("button", { name: "Security" })).toHaveClass("bg-secondary")
    expect(screen.getByRole("button", { name: "General" })).not.toHaveClass("bg-secondary")
  })
})
