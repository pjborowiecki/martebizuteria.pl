import { type JSX } from "react"

import { PreferencesCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/preferences-card"
import { StoreInfoCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/store-info-card"

export const SettingsGeneral = (): JSX.Element => (
  <div className="min-w-0 flex-1 space-y-6">
    <StoreInfoCard />
    <PreferencesCard />
  </div>
)
