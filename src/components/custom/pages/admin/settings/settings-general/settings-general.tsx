import type { JSX } from "react";

import { PreferencesCard } from "~/src/components/custom/pages/admin/settings/settings-general/preferences-card";
import { StoreInfoCard } from "~/src/components/custom/pages/admin/settings/settings-general/store-info-card";

export function SettingsGeneral(): JSX.Element {
  return (
    <div className="min-w-0 flex-1 space-y-6">
      <StoreInfoCard />
      <PreferencesCard />
    </div>
  );
}
