import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl"

import { adminProductAttributesQueryOptions } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { productAttributeStatsQueryOptions } from "~/src/modules/product-attribute/use-cases/get-product-attribute-stats"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
export const AttributesRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const queryClient = useQueryClient()
  const attributesFetching = useIsFetching({
    queryKey: adminProductAttributesQueryOptions().queryKey,
  })
  const statsFetching = useIsFetching({
    queryKey: productAttributeStatsQueryOptions().queryKey,
  })
  const isRefreshing = attributesFetching > 0 || statsFetching > 0
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: adminProductAttributesQueryOptions().queryKey,
    })
    void queryClient.invalidateQueries({
      queryKey: productAttributeStatsQueryOptions().queryKey,
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
