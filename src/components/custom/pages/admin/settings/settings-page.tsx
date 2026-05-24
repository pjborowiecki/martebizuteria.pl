import { type JSX, useState } from "react";

import { SettingsGeneral } from "~/src/components/custom/pages/admin/settings/settings-general/settings-general";
import { SettingsPlaceholder } from "~/src/components/custom/pages/admin/settings/settings-placeholder";
import { SettingsTabs } from "~/src/components/custom/pages/admin/settings/settings-tabs";

import type { SettingsTab } from "~/src/data/settings-data";

export function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="flex-1 p-8">
      <div className="flex gap-8">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "general" ? <SettingsGeneral /> : <SettingsPlaceholder activeTab={activeTab} />}
      </div>
    </div>
  );
}
