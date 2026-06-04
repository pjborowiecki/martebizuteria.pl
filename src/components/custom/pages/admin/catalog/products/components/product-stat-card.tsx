import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS
} from "~/src/components/custom/pages/admin/admin-layout.styles";
import type { ProductsListFilterPatch } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid";
import type { ProductStatCardConfig, ProductStatKey } from "~/src/components/custom/pages/admin/catalog/products/products-stats.config";

import type { Product } from "~/src/modules/product/product.types";

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

const PERCENT_SCALE = 100;
const ZERO_TOTAL = 0;

interface ProductStatCardProps {
  readonly activeCategoryFilter?: string;
  readonly activeCollectionFilter?: string;
  readonly activeInventoryFilter?: string;
  readonly activeStatusFilter?: string;
  readonly caption?: string;
  readonly config: ProductStatCardConfig;
  readonly displayValue?: string;
  readonly onFilter?: (patch?: ProductsListFilterPatch) => void;
  readonly valuesPending: boolean;
}

export function ProductStatCard({
  activeCategoryFilter,
  activeCollectionFilter,
  activeInventoryFilter,
  activeStatusFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending
}: Readonly<ProductStatCardProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const { filterInventoryLevel, filterStatus, gradient, icon: Icon, key } = config;
  const isFilterable = onFilter !== undefined && (filterStatus !== undefined || filterInventoryLevel !== undefined || key === "total");

  let isActive = false;
  if (key === "total") {
    isActive =
      activeStatusFilter === undefined &&
      activeInventoryFilter === undefined &&
      activeCategoryFilter === undefined &&
      activeCollectionFilter === undefined;
  } else if (filterInventoryLevel !== undefined) {
    isActive = activeInventoryFilter === filterInventoryLevel;
  } else if (filterStatus !== undefined) {
    isActive = activeStatusFilter === filterStatus;
  }

  const handleFilterClick = useCallback(() => {
    if (onFilter === undefined || valuesPending) {
      return;
    }

    if (key === "total") {
      onFilter();
      return;
    }

    if (filterInventoryLevel !== undefined) {
      onFilter(isActive ? { inventoryLevel: undefined } : { inventoryLevel: filterInventoryLevel });
      return;
    }

    if (filterStatus !== undefined) {
      onFilter(isActive ? { status: undefined } : { status: filterStatus });
    }
  }, [filterInventoryLevel, filterStatus, isActive, key, onFilter, valuesPending]);

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

export function buildProductStatCaption({
  key,
  stats,
  t,
  value
}: Readonly<{
  key: ProductStatKey;
  stats: Product["stats"];
  t: ReturnType<typeof useTranslations<"pages.admin.catalog.products.catalogList">>;
  value: number;
}>): string | undefined {
  if (key === "active" || key === "draft") {
    const percent = stats.total <= ZERO_TOTAL ? ZERO_TOTAL : Math.round((value / stats.total) * PERCENT_SCALE);
    return t("stats.shareCaption", { percent });
  }

  return undefined;
}

export function formatProductStatDisplayValue(_key: ProductStatKey, value: number): string {
  return value.toLocaleString();
}
