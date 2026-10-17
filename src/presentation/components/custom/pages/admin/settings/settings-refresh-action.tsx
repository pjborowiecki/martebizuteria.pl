import { type JSX, useCallback, useMemo } from "react"

import { type QueryKey, matchQuery, useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"

export const SettingsRefreshAction = ({ queryKeys }: Readonly<{ queryKeys: readonly QueryKey[] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings")
  const queryClient = useQueryClient()
  const isRefreshing = useIsFetching({ predicate: (query) => queryKeys.some((queryKey) => matchQuery({ queryKey }, query)) }) > 0

  const handleRefresh = useCallback(() => {
    for (const queryKey of queryKeys) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient, queryKeys])

  const button = useMemo(
    () => (
      <Button
        aria-busy={isRefreshing}
        aria-label={t("refresh")}
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

  return <DataGridIconTooltip label={t("refresh")} trigger={button} />
}
