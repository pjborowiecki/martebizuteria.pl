import { type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Download, Plus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

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

  const actionButtons = useMemo(
    () => (
      <>
        <Button
          className="h-9 gap-2 border-sidebar-border bg-sidebar text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          size="sm"
          variant="outline"
        >
          <Download className="size-4" strokeWidth={1.5} />
          {t("coupons.actions.export")}
        </Button>
        <Button size="sm" className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90">
          <Plus className="size-4" strokeWidth={1.5} />
          {t("coupons.actions.createCoupon")}
        </Button>
      </>
    ),
    [t],
  )

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <AdminHeader title={t("coupons.title")} description={t("coupons.description")} breadcrumbs={bcList} actions={actionButtons} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
        <CouponStats />
        <CouponListTable />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
})
