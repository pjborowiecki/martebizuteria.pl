import { type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { cn } from "cn"
import { Plus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getAdminNewsletterCampaignsQuery } from "~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns"
import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  ADMIN_CATALOG_DATAGRID_PAGE_CLASS,
  ADMIN_CATALOG_PAGE_BODY_CLASS,
  ADMIN_HEADER_PRIMARY_BUTTON_CLASS,
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { MarketingTabs } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-tabs"
import { NewsletterCampaignsTable } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-campaigns-table"
import { NewsletterStats } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats"

import { ROUTES } from "~/src/routes"

const MarketingPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const breadcrumbs = useMemo(() => [{ href: ROUTES.ADMIN, label: t("nav.dashboard") }], [t])
  const tabs = useMemo(() => <MarketingTabs active="newsletters" />, [])

  const actions = (
    <LocalizedLink className={cn(buttonVariants({ size: "sm" }), ADMIN_HEADER_PRIMARY_BUTTON_CLASS)} to={ROUTES.ADMIN_NEWSLETTER_NEW}>
      <Plus className="size-4" strokeWidth={1.5} />
      {t("marketing.actions.newCampaign")}
    </LocalizedLink>
  )

  return (
    <>
      <AdminHeader
        actions={actions}
        breadcrumbs={breadcrumbs}
        description={t("marketing.description")}
        tabs={tabs}
        title={t("marketing.title")}
      />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <NewsletterStats />
          <NewsletterCampaignsTable />
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/marketing/")({
  component: MarketingPage,
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.query(getNewsletterStatsQuery()), context.queryClient.query(getAdminNewsletterCampaignsQuery())])
  },
})
