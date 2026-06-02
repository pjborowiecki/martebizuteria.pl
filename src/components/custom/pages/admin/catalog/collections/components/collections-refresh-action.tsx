import { type JSX, useCallback, useMemo } from "react";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";

import { collectionQueryOptions } from "~/src/modules/collection/collection.queries";

const NO_ACTIVE_FETCHES = 0;

export function CollectionsRefreshAction(): JSX.Element {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();
  const collectionsFetching = useIsFetching({ queryKey: collectionQueryOptions.adminCollectionsQueryOptions().queryKey });
  const statsFetching = useIsFetching({ queryKey: collectionQueryOptions.collectionStatsQueryOptions().queryKey });
  const isRefreshing = collectionsFetching > NO_ACTIVE_FETCHES || statsFetching > NO_ACTIVE_FETCHES;

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: collectionQueryOptions.adminCollectionsQueryOptions().queryKey });
    void queryClient.invalidateQueries({ queryKey: collectionQueryOptions.collectionStatsQueryOptions().queryKey });
  }, [queryClient]);

  const button = useMemo(
    () => (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={t("collections.actions.refresh")}
        aria-busy={isRefreshing}
        disabled={isRefreshing}
        onClick={handleRefresh}
      >
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} strokeWidth={1.5} />
      </Button>
    ),
    [handleRefresh, isRefreshing, t]
  );

  return <DataGridIconTooltip label={t("collections.actions.refresh")} trigger={button} />;
}
