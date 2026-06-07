import { type JSX, useCallback, useMemo } from "react";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { syncQueryInvalidation } from "~/src/lib/_utils/query-client-sync";
import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";

import { orderQueryOptions } from "~/src/modules/order/order.queries";

const NO_ACTIVE_FETCHES = 0;

export function OrdersRefreshAction(): JSX.Element {
  const t = useTranslations("pages.admin.orders");
  const queryClient = useQueryClient();
  const ordersFetching = useIsFetching({ queryKey: CONSTANTS.QUERY_KEYS.ORDER.ADMIN.PAGE });
  const statsFetching = useIsFetching({ queryKey: orderQueryOptions.adminOrderStatsQueryOptions().queryKey });
  const isRefreshing = ordersFetching > NO_ACTIVE_FETCHES || statsFetching > NO_ACTIVE_FETCHES;

  const handleRefresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, CONSTANTS.QUERY_KEYS.ORDER.ADMIN.ORDERS);
  }, [queryClient]);

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
    [handleRefresh, isRefreshing, t]
  );

  return <DataGridIconTooltip label={t("actions.refresh")} trigger={button} />;
}
