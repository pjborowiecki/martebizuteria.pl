import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import { ADMIN_CARD_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import type {
  CollectionStatCardConfig,
  CollectionStatKey
} from "~/src/components/custom/pages/admin/catalog/collections/collections-stats.config";

import type { COLLECTION_STATUS } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

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

interface CollectionStatCardProps {
  readonly activeFilter?: string;
  readonly caption?: string;
  readonly config: CollectionStatCardConfig;
  readonly displayValue?: string;
  readonly onFilter?: (status?: (typeof COLLECTION_STATUS)[keyof typeof COLLECTION_STATUS]) => void;
  readonly valuesPending: boolean;
}

export function CollectionStatCard({
  activeFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending
}: Readonly<CollectionStatCardProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
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
        <p className={STAT_LABEL_CLASS}>{t(`stats.${key}.label`)}</p>
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

function formatCollectionStatValue(key: CollectionStatKey, value: number): string {
  if (key === "avgProducts") {
    return value.toLocaleString(undefined, { maximumFractionDigits: AVG_PRODUCTS_DECIMALS });
  }

  return value.toLocaleString();
}

function statShare(part: number, total: number): number {
  if (total <= ZERO_TOTAL) {
    return ZERO_TOTAL;
  }

  return Math.round((part / total) * PERCENT_SCALE);
}

interface BuildCollectionStatCaptionInput {
  readonly key: CollectionStatKey;
  readonly stats: Collection["stats"];
  readonly t: ReturnType<typeof useTranslations<"pages.admin.catalog.collections">>;
  readonly value: number;
}

export function buildCollectionStatCaption({ key, stats, t, value }: Readonly<BuildCollectionStatCaptionInput>): string | undefined {
  const sharePercent = key === "active" || key === "draft" ? statShare(value, stats.total) : undefined;

  if (sharePercent !== undefined) {
    return t("stats.shareCaption", { percent: sharePercent });
  }

  if (key === "avgProducts") {
    return t("stats.avgProducts.caption", {
      count: Math.round(stats.avgProducts * stats.total).toLocaleString()
    });
  }

  return undefined;
}

export function formatCollectionStatDisplayValue(key: CollectionStatKey, value: number): string {
  return formatCollectionStatValue(key, value);
}
