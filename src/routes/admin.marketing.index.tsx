import { type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { cn } from "cn"
import { Plus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getAdminNewsletterCampaignsQuery } from "~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns"
import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_HEADER_PRIMARY_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { NewsletterCampaignsTable } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-campaigns-table"
import { NewsletterStats } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats"

import { ROUTES } from "~/src/routes"

const MarketingPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const breadcrumbs = useMemo(() => [{ href: ROUTES.ADMIN, label: t("nav.dashboard") }], [t])

  const actions = (
    <LocalizedLink className={cn(buttonVariants({ size: "sm" }), ADMIN_HEADER_PRIMARY_BUTTON_CLASS)} to={ROUTES.ADMIN_NEWSLETTER_NEW}>
      <Plus className="size-4" strokeWidth={1.5} />
      {t("marketing.actions.newCampaign")}
    </LocalizedLink>
  )

  return (
    <>
      <AdminHeader actions={actions} breadcrumbs={breadcrumbs} description={t("marketing.description")} title={t("marketing.title")} />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-8">
        <NewsletterStats />
        <NewsletterCampaignsTable />
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
