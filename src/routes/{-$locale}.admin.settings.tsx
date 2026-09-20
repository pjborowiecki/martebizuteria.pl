import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { SettingsPage } from "~/src/presentation/components/custom/pages/admin/settings/settings-page"
const AdminSettingsRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <>
      <AdminHeader description={t("settings.description")} title={t("settings.title")} />
      <SettingsPage />
    </>
  )
}
export const Route = createFileRoute("/{-$locale}/admin/settings")({
  component: AdminSettingsRoute,
})
