import { type JSX, type ReactNode, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { type SettingsSection, SettingsTabs } from "~/src/presentation/components/custom/pages/admin/settings/settings-tabs"

export const SettingsPageLayout = ({ active, children }: Readonly<SettingsPageLayoutProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings")
  const tabs = useMemo(() => <SettingsTabs active={active} />, [active])

  return (
    <>
      <AdminHeader description={t("description")} tabs={tabs} title={t("title")} />
      <div className={ADMIN_PAGE_BODY_CLASS}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">{children}</div>
      </div>
    </>
  )
}

interface SettingsPageLayoutProps {
  readonly active: SettingsSection
  readonly children: ReactNode
}
