import { type JSX, useState } from "react"

import { type SettingsTab } from "~/src/data/settings"

import { ADMIN_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { SettingsGeneral } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/settings-general"
import { SettingsLocalization } from "~/src/presentation/components/custom/pages/admin/settings/settings-localization/settings-localization"
import { SettingsPlaceholder } from "~/src/presentation/components/custom/pages/admin/settings/settings-placeholder"
import { SettingsTabs } from "~/src/presentation/components/custom/pages/admin/settings/settings-tabs"

const SETTINGS_TAB_PANELS: Partial<Record<SettingsTab, () => JSX.Element>> = {
  general: SettingsGeneral,
  localization: SettingsLocalization,
}

export const SettingsPage = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const Panel = SETTINGS_TAB_PANELS[activeTab]

  return (
    <div className={ADMIN_PAGE_BODY_CLASS}>
      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {Panel === undefined ? <SettingsPlaceholder activeTab={activeTab} /> : <Panel />}
      </div>
    </div>
  )
}
