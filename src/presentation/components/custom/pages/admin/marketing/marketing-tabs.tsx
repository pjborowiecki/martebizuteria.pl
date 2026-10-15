import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { AdminHeaderTabLink, AdminHeaderTabs } from "~/src/presentation/components/custom/pages/admin/admin-header-tabs"

import { ROUTES } from "~/src/routes"

export const MarketingTabs = ({ active }: Readonly<{ active: "newsletters" | "subscribers" }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.tabs")

  return (
    <AdminHeaderTabs>
      <AdminHeaderTabLink href={ROUTES.ADMIN_MARKETING} isActive={active === "newsletters"} label={t("newsletters")} />
      <AdminHeaderTabLink href={ROUTES.ADMIN_NEWSLETTER_SUBSCRIBERS} isActive={active === "subscribers"} label={t("subscribers")} />
    </AdminHeaderTabs>
  )
}
