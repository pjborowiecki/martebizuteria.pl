import type { JSX } from "react";

import { SettingsTabButton } from "~/src/components/custom/pages/admin/settings/settings-tab-button";

import { type SettingsTab, SETTINGS_TAB_DEFINITIONS } from "~/src/data/settings-data";

interface SettingsTabsProps {
  readonly activeTab: SettingsTab;
  readonly onTabChange: (tab: SettingsTab) => void;
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps): JSX.Element {
  return (
    <nav className="w-56 shrink-0 space-y-1">
      {SETTINGS_TAB_DEFINITIONS.map((tab) => (
        <SettingsTabButton isActive={activeTab === tab.key} key={tab.key} onSelect={onTabChange} tab={tab} />
      ))}
    </nav>
  );
}
