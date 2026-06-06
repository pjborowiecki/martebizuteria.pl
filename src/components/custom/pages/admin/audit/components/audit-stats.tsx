import { type JSX, useCallback } from "react";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useAuditDataGridContext } from "~/src/components/custom/pages/admin/audit/hooks/use-audit-data-grid";
import { StatItem } from "~/src/components/custom/pages/admin/audit/stat-item";

import { SEVERITY_DOT_COLORS } from "~/src/modules/audit-log/audit-log.constants";
import { auditLogQueryOptions } from "~/src/modules/audit-log/audit-log.queries";

const ZERO_COUNT = 0;

export function AuditStats(): JSX.Element {
  const t = useTranslations("pages.admin");
  const { activeSeverityFilter, applyAuditFilter } = useAuditDataGridContext();
  const { data } = useQuery(auditLogQueryOptions.adminAuditLogStatsQueryOptions());

  const total = data?.totalCount ?? ZERO_COUNT;
  const todayCount = data?.todayCount ?? ZERO_COUNT;
  const warningCount = data?.warningCount ?? ZERO_COUNT;
  const errorCount = data?.errorCount ?? ZERO_COUNT;

  const handleWarningClick = useCallback(() => {
    applyAuditFilter({ severity: activeSeverityFilter === "warning" ? undefined : "warning" });
  }, [activeSeverityFilter, applyAuditFilter]);

  const handleErrorClick = useCallback(() => {
    applyAuditFilter({ severity: activeSeverityFilter === "error" ? undefined : "error" });
  }, [activeSeverityFilter, applyAuditFilter]);

  return (
    <div className="flex shrink-0 items-center gap-6 border-b border-border/40 px-6 py-4">
      <StatItem label={t("audit.stats.totalEvents")} value={total} />
      <StatItem label={t("audit.stats.today")} value={todayCount} />
      <StatItem
        dotColor={SEVERITY_DOT_COLORS.warning}
        isActive={activeSeverityFilter === "warning"}
        label={t("audit.stats.warnings")}
        onClick={handleWarningClick}
        value={warningCount}
      />
      <StatItem
        dotColor={SEVERITY_DOT_COLORS.error}
        isActive={activeSeverityFilter === "error"}
        label={t("audit.stats.errors")}
        onClick={handleErrorClick}
        value={errorCount}
      />
    </div>
  );
}
