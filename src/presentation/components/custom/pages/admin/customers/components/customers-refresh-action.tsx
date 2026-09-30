import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { getAdminCustomerStatsQuery } from "~/src/modules/user/use-cases/get-admin-customer-stats"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"

export const CustomersRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const queryClient = useQueryClient()
  const customersFetching = useIsFetching({
    queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE,
  })

  const statsFetching = useIsFetching({
    queryKey: getAdminCustomerStatsQuery().queryKey,
  })

  const isRefreshing = customersFetching > 0 || statsFetching > 0
  const handleRefresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS)
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
