import { type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { getDiscountStatsQuery } from "~/src/modules/discount/use-cases/get-admin-discount-stats"
import { getAdminDiscountsPageQuery } from "~/src/modules/discount/use-cases/get-admin-discounts-page"

import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { CouponListTable } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-list-table"
import { CouponStats } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-stats"

import { ROUTES } from "~/src/routes"

const CouponsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const bcList = useMemo(
    () => [
      {
        href: ROUTES.ADMIN,
        label: t("nav.dashboard"),
      } satisfies {
        href: LocalizedTo
        label: string
      },
    ],
    [t],
  )

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <AdminHeader title={t("coupons.title")} description={t("coupons.description")} breadcrumbs={bcList} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
        <CouponStats />
        <CouponListTable />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({ ...getAdminDiscountsPageQuery({}), staleTime: "static" }),
      context.queryClient.query({ ...getDiscountStatsQuery(), staleTime: "static" }),
    ])
  },
})
