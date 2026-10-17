import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"

export const DeliveryMethodsRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const queryClient = useQueryClient()
  const methodsFetching = useIsFetching({ queryKey: DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL })
  const freeDeliveryFetching = useIsFetching({ queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY })
  const isRefreshing = methodsFetching > 0 || freeDeliveryFetching > 0

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL })
    void queryClient.invalidateQueries({ queryKey: STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY })
  }, [queryClient])

  const button = useMemo(
    () => (
      <Button
        aria-busy={isRefreshing}
        aria-label={t("actions.refresh")}
        disabled={isRefreshing}
        onClick={handleRefresh}
        size="icon-lg"
        variant="outline"
      >
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} strokeWidth={1.5} />
      </Button>
    ),
    [handleRefresh, isRefreshing, t],
  )

  return <DataGridIconTooltip label={t("actions.refresh")} trigger={button} />
}
