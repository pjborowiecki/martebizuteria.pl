import { type JSX, useMemo } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import zod from "zod/v4"

import {
  ADMIN_NEWSLETTER_PAGE_SIZE,
  NEWSLETTER_QUERY_STALE_MS,
  NEWSLETTER_STATUSES,
  type NewsletterStatus,
} from "~/src/modules/newsletter/newsletter.constants"
import { getAdminNewsletterPageQuery } from "~/src/modules/newsletter/use-cases/get-admin-newsletter-page"
import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { MarketingTabs } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-tabs"
import { NewsletterSubscribersTableContent } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-table"

import { ROUTES } from "~/src/routes"

const FIRST_PAGE = 1

const subscribersSearchSchema = zod.object({
  status: zod.enum(NEWSLETTER_STATUSES).optional(),
})

const prefetchSubscribersQueries = async ({ context, deps }: SubscribersLoaderInput): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...getAdminNewsletterPageQuery({ page: FIRST_PAGE, pageSize: ADMIN_NEWSLETTER_PAGE_SIZE, status: deps.status }),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...getNewsletterStatsQuery(),
      staleTime: "static",
    }),
  ])
}

const SubscribersPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const { status } = Route.useSearch()
  const breadcrumbs = useMemo(() => [{ href: ROUTES.ADMIN, label: t("nav.dashboard") }], [t])
  const tabs = useMemo(() => <MarketingTabs active="subscribers" />, [])

  return (
    <>
      <AdminHeader
        breadcrumbs={breadcrumbs}
        description={t("marketing.subscribers.description")}
        tabs={tabs}
        title={t("marketing.subscribers.title")}
      />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <NewsletterSubscribersTableContent initialStatus={status} key={status ?? "all"} />
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/marketing/subscribers")({
  component: SubscribersPage,
  loader: prefetchSubscribersQueries,
  loaderDeps: ({ search }: { search: zod.output<typeof subscribersSearchSchema> }) => ({ status: search.status }),
  shouldReload: false,
  staleTime: NEWSLETTER_QUERY_STALE_MS,
  validateSearch: subscribersSearchSchema,
})

interface SubscribersLoaderInput {
  readonly context: { readonly queryClient: QueryClient }
  readonly deps: { readonly status: NewsletterStatus | undefined }
}
