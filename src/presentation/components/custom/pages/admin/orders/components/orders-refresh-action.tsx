import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { adminOrderStatsQueryOptions } from "~/src/modules/order/use-cases/get-admin-order-stats"

import { syncQueryInvalidation } from "~/src/lib/query-client-sync"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
export const OrdersRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const queryClient = useQueryClient()
  const ordersFetching = useIsFetching({
    queryKey: ORDER_QUERY_KEYS.ADMIN.PAGE,
  })
  const statsFetching = useIsFetching({
    queryKey: adminOrderStatsQueryOptions().queryKey,
  })
  const isRefreshing = ordersFetching > 0 || statsFetching > 0
  const handleRefresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, ORDER_QUERY_KEYS.ADMIN.ORDERS)
  }, [queryClient])
  const button = useMemo(
    () => (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={t("actions.refresh")}
        aria-busy={isRefreshing}
        disabled={isRefreshing}
        onClick={handleRefresh}
      >
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} strokeWidth={1.5} />
      </Button>
    ),
    [handleRefresh, isRefreshing, t],
  )
  return <DataGridIconTooltip label={t("actions.refresh")} trigger={button} />
}
