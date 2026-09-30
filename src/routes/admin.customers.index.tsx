import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { getAdminCustomerStatsQuery } from "~/src/modules/user/use-cases/get-admin-customer-stats"
import { getAdminCustomersPageQuery } from "~/src/modules/user/use-cases/get-admin-customers-page"
import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS } from "~/src/modules/user/user.constants"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CustomersTableContent } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-table"

const prefetchCustomersQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...getAdminCustomersPageQuery({
        page: 1,
        pageSize: ADMIN_CUSTOMER_PAGE_SIZE,
      }),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...getAdminCustomerStatsQuery(),
      staleTime: "static",
    }),
  ])
}

const CustomersIndexRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")

  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <CustomersTableContent />
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/customers/")({
  component: CustomersIndexRoute,
  loader: ({ context }) => prefetchCustomersQueries(context),
  shouldReload: false,
  staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  staticData: {
    namespaces: ["pages.admin.customers"],
  },
})
