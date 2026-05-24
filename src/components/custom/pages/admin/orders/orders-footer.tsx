import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

interface OrdersFooterProps {
  readonly filteredCount: number;
  readonly totalCount: number;
}

export function OrdersFooter({ filteredCount, totalCount }: OrdersFooterProps): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-6 py-3">
      <p className="text-sm text-muted-foreground">{t("orders.pagination.showing", { count: filteredCount, total: totalCount })}</p>
      <div className="flex gap-2">
        <Button className="h-8 text-xs" disabled size="sm" variant="outline">
          {t("orders.pagination.previous")}
        </Button>
        <Button className="h-8 text-xs" size="sm" variant="outline">
          {t("orders.pagination.next")}
        </Button>
      </div>
    </div>
  );
}
