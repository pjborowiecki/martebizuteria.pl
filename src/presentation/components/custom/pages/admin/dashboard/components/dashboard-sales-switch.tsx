import { type JSX, useCallback } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type SalesStatus, getAdminSalesStatusQuery, getSalesStatusQuery } from "~/src/modules/store-setting/use-cases/get-sales-status"
import { setSalesPausedMutation } from "~/src/modules/store-setting/use-cases/set-sales-paused"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Switch } from "~/src/presentation/components/shadcn/switch"

import {
  ADMIN_CARD_CONTENT_CLASS,
  ADMIN_DASHBOARD_CONTENT_CARD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

export const DashboardSalesSwitch = (): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.sales")
  const queryClient = useQueryClient()
  const {
    data: { salesPaused },
  } = useSuspenseQuery(getAdminSalesStatusQuery())
  const { isPending, mutate } = useMutation(setSalesPausedMutation)

  const showSalesStatus = useCallback(
    (status: SalesStatus) => {
      queryClient.setQueryData(getAdminSalesStatusQuery().queryKey, status)
      queryClient.setQueryData(getSalesStatusQuery().queryKey, status)
      if (status.salesPaused) {
        toast.success(t("toast.pausedTitle"), { description: t("toast.pausedDescription") })
      } else {
        toast.success(t("toast.resumedTitle"), { description: t("toast.resumedDescription") })
      }
    },
    [queryClient, t],
  )

  const reportFailure = useCallback(() => {
    toast.error(t("toast.errorTitle"), { description: t("toast.errorDescription") })
  }, [t])

  const changeSalesPaused = useCallback(
    (paused: boolean) => {
      mutate({ salesPaused: paused }, { onError: reportFailure, onSuccess: showSalesStatus })
    },
    [mutate, reportFailure, showSalesStatus],
  )

  return (
    <Card className={cn(ADMIN_DASHBOARD_CONTENT_CARD_CLASS, salesPaused && "border-amber-500/40 bg-amber-500/5")}>
      <CardContent className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", ADMIN_CARD_CONTENT_CLASS)}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold tracking-tight">{t("title")}</h2>
            <Badge
              className={cn("border-0 text-[10px]", salesPaused ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600")}
              variant="secondary"
            >
              {salesPaused ? t("statusPaused") : t("statusOpen")}
            </Badge>
          </div>
          <p className="text-[13px] text-muted-foreground">{salesPaused ? t("paused") : t("open")}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-3 text-[13px] font-medium">
          {t("switchLabel")}
          <Switch checked={salesPaused} disabled={isPending} onCheckedChange={changeSalesPaused} />
        </label>
      </CardContent>
    </Card>
  )
}
