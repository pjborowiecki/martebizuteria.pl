import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl"

import { adminCollectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { collectionStatsQueryOptions } from "~/src/modules/product-collection/use-cases/get-collection-stats"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
export const CollectionsRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const queryClient = useQueryClient()
  const collectionsFetching = useIsFetching({
    queryKey: adminCollectionsQueryOptions().queryKey,
  })
  const statsFetching = useIsFetching({
    queryKey: collectionStatsQueryOptions().queryKey,
  })
  const isRefreshing = collectionsFetching > 0 || statsFetching > 0
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: adminCollectionsQueryOptions().queryKey,
    })
    void queryClient.invalidateQueries({
      queryKey: collectionStatsQueryOptions().queryKey,
    })
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
