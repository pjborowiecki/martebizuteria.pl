import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { AdminHeaderTabLink, AdminHeaderTabs } from "~/src/presentation/components/custom/pages/admin/admin-header-tabs"

import { ROUTES } from "~/src/routes"

export const SettingsTabs = ({ active }: Readonly<SettingsTabsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.tabs")

  return (
    <AdminHeaderTabs>
      <AdminHeaderTabLink href={ROUTES.ADMIN_SETTINGS_ACCOUNT} isActive={active === "account"} label={t("account")} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_SETTINGS_SECURITY} isActive={active === "security"} label={t("security")} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_SETTINGS_STORE} isActive={active === "store"} label={t("store")} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_SETTINGS_DELIVERY} isActive={active === "delivery"} label={t("delivery")} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_SETTINGS_TEAM} isActive={active === "team"} label={t("team")} />
    </AdminHeaderTabs>
  )
}

export type SettingsSection = "account" | "delivery" | "security" | "store" | "team"

interface SettingsTabsProps {
  readonly active: SettingsSection
}
