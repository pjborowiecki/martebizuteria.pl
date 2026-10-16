import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_DISCOUNTS_PAGE_SIZE, DISCOUNT_QUERY_STALE_MS } from "~/src/modules/discount/discount.constants"
import { getDiscountStatsQuery } from "~/src/modules/discount/use-cases/get-admin-discount-stats"
import { getAdminDiscountsPageQuery } from "~/src/modules/discount/use-cases/get-admin-discounts-page"

import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { CouponsTableContent } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-table"
import {
  CouponsSheetProvider,
  useCouponsSheetState,
} from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet"

const prefetchCouponsQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...getAdminDiscountsPageQuery({
        page: 1,
        pageSize: ADMIN_DISCOUNTS_PAGE_SIZE,
      }),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...getDiscountStatsQuery(),
      staleTime: "static",
    }),
  ])
}

const CouponsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const sheetState = useCouponsSheetState()

  return (
    <CouponsSheetProvider value={sheetState}>
      <AdminHeader description={t("description")} title={t("title")} />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <CouponsTableContent />
      </div>
    </CouponsSheetProvider>
  )
}

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
  loader: ({ context }) => prefetchCouponsQueries(context),
  shouldReload: false,
  staleTime: DISCOUNT_QUERY_STALE_MS,
})
