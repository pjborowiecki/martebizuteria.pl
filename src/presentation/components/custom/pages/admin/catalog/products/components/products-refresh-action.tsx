import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"

import { syncQueryInvalidation } from "~/src/lib/query-client-sync"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
export const ProductsRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const queryClient = useQueryClient()
  const productsFetching = useIsFetching({
    queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL,
  })
  const isRefreshing = productsFetching > 0
  const handleRefresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, PRODUCT_QUERY_KEYS.ADMIN.ALL)
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
