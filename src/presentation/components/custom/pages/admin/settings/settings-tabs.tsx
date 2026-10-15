import { type JSX } from "react"

import { SETTINGS_TAB_DEFINITIONS, type SettingsTab } from "~/src/data/settings"

import { SettingsTabButton } from "~/src/presentation/components/custom/pages/admin/settings/settings-tab-button"

export const SettingsTabs = ({ activeTab, onTabChange }: SettingsTabsProps): JSX.Element => (
  <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:w-56 lg:shrink-0 lg:space-y-1 lg:overflow-visible lg:px-0">
    {SETTINGS_TAB_DEFINITIONS.map((tab) => (
      <SettingsTabButton isActive={activeTab === tab.key} key={tab.key} onSelect={onTabChange} tab={tab} />
    ))}
  </nav>
)

interface SettingsTabsProps {
  readonly activeTab: SettingsTab
  readonly onTabChange: (tab: SettingsTab) => void
}
