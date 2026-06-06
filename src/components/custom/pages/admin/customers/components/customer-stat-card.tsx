import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { formatPrice } from "~/src/lib/_utils/currency";
import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS
} from "~/src/components/custom/pages/admin/admin-layout.styles";
import type { CustomerStatCardConfig, CustomerStatKey } from "~/src/components/custom/pages/admin/customers/customers-stats.config";

import { DEFAULT_ADMIN_CUSTOMER_CURRENCY, type AdminCustomerStatFilter } from "~/src/modules/user/user.constants";

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

interface CustomerStatCardProps {
  readonly activeFilter?: AdminCustomerStatFilter;
  readonly caption?: string;
  readonly config: CustomerStatCardConfig;
  readonly displayValue?: string;
  readonly onFilter?: (filter?: AdminCustomerStatFilter) => void;
  readonly valuesPending: boolean;
}

export function CustomerStatCard({
  activeFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending
}: Readonly<CustomerStatCardProps>): JSX.Element {
  const t = useTranslations("pages.admin.customers");
  const { filter, gradient, icon: Icon, key } = config;
  const isFilterable = onFilter !== undefined && filter !== undefined;
  const isActive = filter !== undefined && activeFilter === filter;

  const handleFilterClick = useCallback(() => {
    if (onFilter === undefined || valuesPending || filter === undefined) {
      return;
    }

    onFilter(isActive ? undefined : filter);
  }, [filter, isActive, onFilter, valuesPending]);

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
        {(valuesPending || caption !== undefined) && (
          <div className={STAT_CAPTION_SLOT_CLASS}>{renderStatCaptionSlot({ caption, valuesPending })}</div>
        )}
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

interface BuildCustomerStatCaptionInput {
  readonly key: CustomerStatKey;
  readonly t: ReturnType<typeof useTranslations<"pages.admin.customers">>;
}

export function buildCustomerStatCaption({ key, t }: Readonly<BuildCustomerStatCaptionInput>): string | undefined {
  if (key === "averageLtv" || key === "returningRate") {
    return t(`stats.${key}.caption`);
  }

  return undefined;
}

const ONE_DECIMAL_PLACE = 1;

export function formatCustomerStatDisplayValue(key: CustomerStatKey, value: number, locale: string): string {
  if (key === "averageLtv") {
    return formatPrice(value, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale);
  }

  if (key === "averageProductsPerOrder") {
    return value.toLocaleString(locale, {
      maximumFractionDigits: ONE_DECIMAL_PLACE,
      minimumFractionDigits: ONE_DECIMAL_PLACE
    });
  }

  if (key === "returningRate") {
    return `${value}%`;
  }

  return value.toLocaleString(locale);
}
