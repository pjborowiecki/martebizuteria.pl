import { type JSX, useState } from "react"

import { type SettingsTab } from "~/src/data/settings-data"

import { SettingsGeneral } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/settings-general"
import { SettingsPlaceholder } from "~/src/presentation/components/custom/pages/admin/settings/settings-placeholder"
import { SettingsTabs } from "~/src/presentation/components/custom/pages/admin/settings/settings-tabs"
export const SettingsPage = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-8">
      <div className="flex gap-8">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "general" ? <SettingsGeneral /> : <SettingsPlaceholder activeTab={activeTab} />}
      </div>
    </div>
  )
}
