import { type JSX, useCallback, useMemo } from "react"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { RefreshCw } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"

export const TeamRefreshAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team")
  const queryClient = useQueryClient()
  const isRefreshing = useIsFetching({ exact: true, queryKey: USER_QUERY_KEYS.ADMIN.TEAM }) > 0

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ exact: true, queryKey: USER_QUERY_KEYS.ADMIN.TEAM })
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
