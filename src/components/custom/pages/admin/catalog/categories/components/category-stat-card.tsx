import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import { ADMIN_CARD_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import type {
  CategoryStatCardConfig,
  CategoryStatKey
} from "~/src/components/custom/pages/admin/catalog/categories/categories-stats.config";

import type { CATEGORY_STATUS } from "~/src/modules/category/category.constants";
import type { Category } from "~/src/modules/category/category.types";

const STAT_LABEL_CLASS = "text-[13px] leading-5 text-muted-foreground";
const STAT_VALUE_CLASS = "text-3xl leading-9 font-semibold tracking-tight tabular-nums";
const STAT_VALUE_SLOT_CLASS = "flex min-h-9 items-center";
const STAT_CAPTION_SLOT_CLASS = "flex min-h-4 items-center";
const STAT_CAPTION_CLASS = "text-xs text-muted-foreground/80";

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

interface CategoryStatCardProps {
  readonly activeFilter?: string;
  readonly caption?: string;
  readonly config: CategoryStatCardConfig;
  readonly displayValue?: string;
  readonly onFilter?: (status?: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS]) => void;
  readonly valuesPending: boolean;
}

export function CategoryStatCard({
  activeFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending
}: Readonly<CategoryStatCardProps>): JSX.Element {
  const t = useTranslations("admin");
  const { filterStatus, gradient, icon: Icon, key } = config;
  const isFilterable = onFilter !== undefined && (filterStatus !== undefined || key === "total");
  const isActive = key === "total" ? activeFilter === undefined : activeFilter === filterStatus;

  const handleFilterClick = useCallback(() => {
    if (onFilter === undefined || valuesPending) {
      return;
    }

    if (filterStatus === undefined) {
      onFilter();
      return;
    }

    onFilter(isActive ? undefined : filterStatus);
  }, [filterStatus, isActive, onFilter, valuesPending]);

  const cardClassName = cn(
    "h-full gap-0 py-0",
    ADMIN_CARD_CLASS,
    "bg-gradient-to-br from-transparent",
    gradient,
    isFilterable && !valuesPending && "hover:border-border/35",
    isFilterable && isActive && "border-border/50"
  );

  const content = (
    <CardContent className="flex h-full items-start justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <p className={STAT_LABEL_CLASS}>{t(`categories.stats.${key}.label`)}</p>
        <div className={STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <p className={STAT_VALUE_CLASS}>{displayValue}</p>}
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

const PERCENT_SCALE = 100;
const ZERO_TOTAL = 0;
const AVG_PRODUCTS_DECIMALS = 1;

function formatCategoryStatValue(key: CategoryStatKey, value: number): string {
  if (key === "avgProducts") {
    return value.toLocaleString(undefined, { maximumFractionDigits: AVG_PRODUCTS_DECIMALS });
  }

  return value.toLocaleString();
}

interface BuildCategoryStatCaptionInput {
  readonly key: CategoryStatKey;
  readonly stats: Category["stats"];
  readonly t: ReturnType<typeof useTranslations<"admin">>;
  readonly value: number;
}

export function buildCategoryStatCaption({ key, stats, t, value }: Readonly<BuildCategoryStatCaptionInput>): string | undefined {
  const sharePercent = key === "active" || key === "draft" ? statShare(value, stats.total) : undefined;

  if (sharePercent !== undefined) {
    return t("categories.stats.shareCaption", { percent: sharePercent });
  }

  if (key === "avgProducts") {
    return t("categories.stats.avgProducts.caption", {
      count: Math.round(stats.avgProducts * stats.total).toLocaleString()
    });
  }

  return undefined;
}

function statShare(part: number, total: number): number {
  if (total <= ZERO_TOTAL) {
    return ZERO_TOTAL;
  }

  return Math.round((part / total) * PERCENT_SCALE);
}

export function formatCategoryStatDisplayValue(key: CategoryStatKey, value: number): string {
  return formatCategoryStatValue(key, value);
}
