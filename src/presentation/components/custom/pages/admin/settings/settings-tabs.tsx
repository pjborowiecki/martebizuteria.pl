import { type JSX } from "react"

import { SETTINGS_TAB_DEFINITIONS, type SettingsTab } from "~/src/data/settings"

import { SettingsTabButton } from "~/src/presentation/components/custom/pages/admin/settings/settings-tab-button"

export const SettingsTabs = ({ activeTab, onTabChange }: SettingsTabsProps): JSX.Element => (
  <nav className="w-56 shrink-0 space-y-1">
    {SETTINGS_TAB_DEFINITIONS.map((tab) => (
      <SettingsTabButton isActive={activeTab === tab.key} key={tab.key} onSelect={onTabChange} tab={tab} />
    ))}
  </nav>
)

interface SettingsTabsProps {
  readonly activeTab: SettingsTab
  readonly onTabChange: (tab: SettingsTab) => void
}
