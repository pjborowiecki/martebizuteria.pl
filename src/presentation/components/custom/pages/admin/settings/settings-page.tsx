import { type JSX, useState } from "react"

import { type SettingsTab } from "~/src/data/settings"

import { ADMIN_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { SettingsGeneral } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/settings-general"
import { SettingsPlaceholder } from "~/src/presentation/components/custom/pages/admin/settings/settings-placeholder"
import { SettingsTabs } from "~/src/presentation/components/custom/pages/admin/settings/settings-tabs"

export const SettingsPage = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")

  return (
    <div className={ADMIN_PAGE_BODY_CLASS}>
      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "general" ? <SettingsGeneral /> : <SettingsPlaceholder activeTab={activeTab} />}
      </div>
    </div>
  )
}
