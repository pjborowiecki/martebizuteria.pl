import { type JSX, type ReactNode, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import {
  ADMIN_CATALOG_PAGE_BODY_CLASS,
  ADMIN_PAGE_BODY_CLASS,
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { type SettingsSection, SettingsTabs } from "~/src/presentation/components/custom/pages/admin/settings/settings-tabs"

export const SettingsPageLayout = ({ actions, active, body = "form", children }: Readonly<SettingsPageLayoutProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings")
  const tabs = useMemo(() => <SettingsTabs active={active} />, [active])

  return (
    <>
      <AdminHeader actions={actions} description={t("description")} tabs={tabs} title={t("title")} />
      {body === "grid" ? (
        <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>{children}</div>
      ) : (
        <div className={ADMIN_PAGE_BODY_CLASS}>
          <div className="flex w-full flex-col gap-5 sm:gap-6">{children}</div>
        </div>
      )}
    </>
  )
}

interface SettingsPageLayoutProps {
  readonly actions?: ReactNode
  readonly active: SettingsSection
  readonly body?: "form" | "grid"
  readonly children: ReactNode
}
