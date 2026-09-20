import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl"

import { adminCategoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { categoryStatsQueryOptions } from "~/src/modules/product-category/use-cases/get-category-stats"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
export const CategoriesRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const queryClient = useQueryClient()
  const categoriesFetching = useIsFetching({
    queryKey: adminCategoriesQueryOptions().queryKey,
  })
  const statsFetching = useIsFetching({
    queryKey: categoryStatsQueryOptions().queryKey,
  })
  const isRefreshing = categoriesFetching > 0 || statsFetching > 0
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: adminCategoriesQueryOptions().queryKey,
    })
    void queryClient.invalidateQueries({
      queryKey: categoryStatsQueryOptions().queryKey,
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
