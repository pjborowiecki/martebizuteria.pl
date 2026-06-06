import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { CategoryPill } from "~/src/components/custom/pages/admin/audit/audit-toolbar/category-pill";
import { SeverityPill } from "~/src/components/custom/pages/admin/audit/audit-toolbar/severity-pill";
import { useAuditDataGridContext } from "~/src/components/custom/pages/admin/audit/hooks/use-audit-data-grid";

import {
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_CATEGORY_FILTER,
  AUDIT_LOG_DATE_RANGE,
  AUDIT_LOG_SEVERITIES,
  type AuditLogCategoryFilter,
  type AuditLogDateRange
} from "~/src/modules/audit-log/audit-log.constants";

const AUDIT_CATEGORY_FILTERS = [AUDIT_LOG_CATEGORY_FILTER.ALL, ...AUDIT_LOG_CATEGORIES] as const;

const AUDIT_DATE_RANGES = [
  AUDIT_LOG_DATE_RANGE.ALL,
  AUDIT_LOG_DATE_RANGE.TODAY,
  AUDIT_LOG_DATE_RANGE.DAYS_7,
  AUDIT_LOG_DATE_RANGE.DAYS_30
] as const;

export function AuditCategoryFilter(): JSX.Element {
  const { activeCategoryFilter, applyAuditFilter } = useAuditDataGridContext();

  const handleSelect = useCallback(
    (category: AuditLogCategoryFilter) => {
      applyAuditFilter({ category });
    },
    [applyAuditFilter]
  );

  return (
    <div className="flex flex-wrap gap-1">
      {AUDIT_CATEGORY_FILTERS.map((category) => (
        <CategoryPill category={category} isActive={activeCategoryFilter === category} key={category} onSelect={handleSelect} />
      ))}
    </div>
  );
}

export function AuditSeverityFilter(): JSX.Element {
  const { activeSeverityFilter, applyAuditFilter } = useAuditDataGridContext();

  const handleToggle = useCallback(
    (severity: (typeof AUDIT_LOG_SEVERITIES)[number]) => {
      applyAuditFilter({ severity: activeSeverityFilter === severity ? undefined : severity });
    },
    [activeSeverityFilter, applyAuditFilter]
  );

  return (
    <div className="flex flex-wrap gap-1">
      {AUDIT_LOG_SEVERITIES.map((severity) => (
        <SeverityPill isActive={activeSeverityFilter === severity} key={severity} onToggle={handleToggle} severity={severity} />
      ))}
    </div>
  );
}

interface AuditDateRangeButtonProps {
  readonly dateRange: AuditLogDateRange;
  readonly isActive: boolean;
  readonly label: string;
  readonly onSelect: (dateRange: AuditLogDateRange) => void;
}

function AuditDateRangeButton({ dateRange, isActive, label, onSelect }: AuditDateRangeButtonProps): JSX.Element {
  const handleClick = useCallback(() => {
    onSelect(dateRange);
  }, [dateRange, onSelect]);

  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={handleClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function AuditDateRangeFilter(): JSX.Element {
  const t = useTranslations("pages.admin");
  const { activeDateRangeFilter, applyAuditFilter } = useAuditDataGridContext();

  const handleSelect = useCallback(
    (dateRange: AuditLogDateRange) => {
      applyAuditFilter({ dateRange });
    },
    [applyAuditFilter]
  );

  return (
    <div className="flex flex-wrap gap-1">
      {AUDIT_DATE_RANGES.map((dateRange) => (
        <AuditDateRangeButton
          dateRange={dateRange}
          isActive={activeDateRangeFilter === dateRange}
          key={dateRange}
          label={t(`audit.dateRange.${dateRange}`)}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
