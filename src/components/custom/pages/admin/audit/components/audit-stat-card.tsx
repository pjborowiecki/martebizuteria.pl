import { type JSX, useCallback } from "react";

import { useFormatter, useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS
} from "~/src/components/custom/pages/admin/admin-layout.styles";
import type { AuditStatCardConfig, AuditStatKey } from "~/src/components/custom/pages/admin/audit/audit-stats.config";

import type { AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants";

const STAT_LABEL_CLASS = "text-[13px] leading-5 text-muted-foreground";
const STAT_VALUE_CLASS = "text-3xl leading-9 font-semibold tracking-tight tabular-nums";
const STAT_VALUE_SLOT_CLASS = "flex min-h-9 items-center";
const STAT_CAPTION_SLOT_CLASS = "flex min-h-4 items-center";
const STAT_CAPTION_CLASS = "text-xs text-muted-foreground/80";
const ZERO_DISPLAY_VALUE = 0;

function renderStatCaptionSlot({
  caption,
  valuesPending
}: Readonly<{ caption?: string; valuesPending: boolean }>): JSX.Element | undefined {
  if (valuesPending) {
    return <Skeleton className="h-3 w-28" />;
  }

  if (caption === undefined) {
    return undefined;
  }

  return <p className={STAT_CAPTION_CLASS}>{caption}</p>;
}

interface AuditStatCardProps {
  readonly activeSeverityFilter?: AuditLogSeverity;
  readonly activeTodayFilter?: boolean;
  readonly caption?: string;
  readonly config: AuditStatCardConfig;
  readonly displayValue?: number;
  readonly onFilter?: (severity?: AuditLogSeverity) => void;
  readonly onTodayFilter?: () => void;
  readonly valuesPending: boolean;
}

function resolveStatLabelKey(
  key: AuditStatKey
): "audit.stats.errors" | "audit.stats.today" | "audit.stats.totalEvents" | "audit.stats.warnings" {
  switch (key) {
    case "errors": {
      return "audit.stats.errors";
    }
    case "today": {
      return "audit.stats.today";
    }
    case "total": {
      return "audit.stats.totalEvents";
    }
    case "warnings": {
      return "audit.stats.warnings";
    }
    default: {
      return "audit.stats.totalEvents";
    }
  }
}

export function AuditStatCard({
  activeSeverityFilter,
  activeTodayFilter = false,
  caption,
  config,
  displayValue,
  onFilter,
  onTodayFilter,
  valuesPending
}: Readonly<AuditStatCardProps>): JSX.Element {
  const t = useTranslations("pages.admin");
  const format = useFormatter();
  const { filterSeverity, gradient, icon: Icon, key } = config;
  const isFilterable =
    (onFilter !== undefined && (filterSeverity !== undefined || key === "total")) || (onTodayFilter !== undefined && key === "today");
  let isActive = false;
  if (key === "total") {
    isActive = activeSeverityFilter === undefined && !activeTodayFilter;
  } else if (key === "today") {
    isActive = activeTodayFilter;
  } else {
    isActive = filterSeverity !== undefined && activeSeverityFilter === filterSeverity;
  }

  const handleFilterClick = useCallback(() => {
    if (valuesPending) {
      return;
    }

    if (key === "today") {
      onTodayFilter?.();
      return;
    }

    if (onFilter === undefined) {
      return;
    }

    if (key === "total") {
      onFilter();
      return;
    }

    if (filterSeverity === undefined) {
      return;
    }

    if (isActive) {
      onFilter();
      return;
    }

    onFilter(filterSeverity);
  }, [filterSeverity, isActive, key, onFilter, onTodayFilter, valuesPending]);

  const cardClassName = cn(
    "h-full gap-0 py-0",
    ADMIN_CARD_CLASS,
    "bg-gradient-to-br from-transparent",
    gradient,
    isFilterable && !valuesPending && ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
    isFilterable && isActive && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS
  );

  const content = (
    <CardContent className="flex h-full items-start justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <p className={STAT_LABEL_CLASS}>{t(resolveStatLabelKey(key))}</p>
        <div className={STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className={STAT_VALUE_CLASS}>{format.number(displayValue ?? ZERO_DISPLAY_VALUE)}</p>
          )}
        </div>
        <div className={STAT_CAPTION_SLOT_CLASS}>{renderStatCaptionSlot({ caption, valuesPending })}</div>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  );

  if (!isFilterable) {
    return <Card className={cardClassName}>{content}</Card>;
  }

  return (
    <Card className={cardClassName}>
      <button
        type="button"
        aria-pressed={isActive}
        aria-busy={valuesPending}
        disabled={valuesPending}
        className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        onClick={handleFilterClick}
      >
        {content}
      </button>
    </Card>
  );
}
