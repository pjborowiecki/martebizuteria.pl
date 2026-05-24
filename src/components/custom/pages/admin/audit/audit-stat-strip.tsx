import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { StatItem } from "~/src/components/custom/pages/admin/audit/stat-item";

import { AUDIT_EVENTS, SEVERITY_DOT_COLORS } from "~/src/data/audit-data";

const TODAY_MARKER = "Oct 25";

interface AuditStatStripProps {
  readonly onSeverityToggle: (severity: string) => void;
  readonly selectedSeverity: string | undefined;
}

export function AuditStatStrip({ onSeverityToggle, selectedSeverity }: AuditStatStripProps): JSX.Element {
  const t = useTranslations("admin");

  const total = AUDIT_EVENTS.length;
  const todayCount = AUDIT_EVENTS.filter((e) => e.timestamp.includes(TODAY_MARKER)).length;
  const warningCount = AUDIT_EVENTS.filter((e) => e.severity === "warning").length;
  const errorCount = AUDIT_EVENTS.filter((e) => e.severity === "error").length;

  const handleWarningClick = useCallback(() => {
    onSeverityToggle("warning");
  }, [onSeverityToggle]);
  const handleErrorClick = useCallback(() => {
    onSeverityToggle("error");
  }, [onSeverityToggle]);

  return (
    <div className="flex shrink-0 items-center gap-6 border-b border-border/40 px-6 py-4">
      <StatItem label={t("audit.stats.totalEvents")} value={total} />
      <StatItem label={t("audit.stats.today")} value={todayCount} />
      <StatItem
        dotColor={SEVERITY_DOT_COLORS.warning}
        isActive={selectedSeverity === "warning"}
        label={t("audit.stats.warnings")}
        onClick={handleWarningClick}
        value={warningCount}
      />
      <StatItem
        dotColor={SEVERITY_DOT_COLORS.error}
        isActive={selectedSeverity === "error"}
        label={t("audit.stats.errors")}
        onClick={handleErrorClick}
        value={errorCount}
      />
    </div>
  );
}
