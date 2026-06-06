import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

const FIRST_PAGE = 1;

interface OrdersFooterProps {
  readonly filteredCount: number;
  readonly onNextPage: () => void;
  readonly onPreviousPage: () => void;
  readonly page: number;
  readonly pageCount: number;
  readonly totalCount: number;
}

export function OrdersFooter({ filteredCount, onNextPage, onPreviousPage, page, pageCount, totalCount }: OrdersFooterProps): JSX.Element {
  const t = useTranslations("pages.admin");
  const canGoPrevious = page > FIRST_PAGE;
  const canGoNext = page < pageCount;

  const handlePrevious = useCallback(() => {
    onPreviousPage();
  }, [onPreviousPage]);

  const handleNext = useCallback(() => {
    onNextPage();
  }, [onNextPage]);

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-6 py-3">
      <p className="text-sm text-muted-foreground">{t("orders.pagination.showing", { count: filteredCount, total: totalCount })}</p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("orders.pagination.page", { page: String(page), total: String(pageCount) })}
        </span>
        <div className="flex gap-2">
          <Button className="h-8 text-xs" disabled={!canGoPrevious} onClick={handlePrevious} size="sm" variant="outline">
            {t("orders.pagination.previous")}
          </Button>
          <Button className="h-8 text-xs" disabled={!canGoNext} onClick={handleNext} size="sm" variant="outline">
            {t("orders.pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
