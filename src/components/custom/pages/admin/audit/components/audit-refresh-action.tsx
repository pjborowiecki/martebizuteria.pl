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

export function AuditRefreshAction(): JSX.Element {
  const t = useTranslations("pages.admin");
  const queryClient = useQueryClient();
  const auditFetching = useIsFetching({ queryKey: CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.ALL });
  const isRefreshing = auditFetching > NO_ACTIVE_FETCHES;

  const handleRefresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.ALL);
  }, [queryClient]);

  const button = useMemo(
    () => (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={t("audit.toolbar.refresh")}
        aria-busy={isRefreshing}
        disabled={isRefreshing}
        onClick={handleRefresh}
      >
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} strokeWidth={1.5} />
      </Button>
    ),
    [handleRefresh, isRefreshing, t]
  );

  return <DataGridIconTooltip label={t("audit.toolbar.refresh")} trigger={button} />;
}
