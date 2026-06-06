import { type JSX, useCallback, useMemo } from "react";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { syncQueryInvalidation } from "~/src/lib/_utils/query-client-sync";
import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";

const NO_ACTIVE_FETCHES = 0;

export function ProductsRefreshAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const queryClient = useQueryClient();
  const productsFetching = useIsFetching({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL });
  const isRefreshing = productsFetching > NO_ACTIVE_FETCHES;

  const handleRefresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL);
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
