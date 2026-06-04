import { type JSX, useCallback, useMemo } from "react";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";

import { productAttributeQueryOptions } from "~/src/modules/product-attribute/product-attribute.queries";

const NO_ACTIVE_FETCHES = 0;

export function AttributesRefreshAction(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const queryClient = useQueryClient();
  const attributesFetching = useIsFetching({ queryKey: productAttributeQueryOptions.adminProductAttributesQueryOptions().queryKey });
  const statsFetching = useIsFetching({ queryKey: productAttributeQueryOptions.productAttributeStatsQueryOptions().queryKey });
  const isRefreshing = attributesFetching > NO_ACTIVE_FETCHES || statsFetching > NO_ACTIVE_FETCHES;

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: productAttributeQueryOptions.adminProductAttributesQueryOptions().queryKey });
    void queryClient.invalidateQueries({ queryKey: productAttributeQueryOptions.productAttributeStatsQueryOptions().queryKey });
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
