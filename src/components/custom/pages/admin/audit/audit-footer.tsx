import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

interface AuditFooterProps {
  readonly filteredCount: number;
  readonly totalCount: number;
}

export function AuditFooter({ filteredCount, totalCount }: AuditFooterProps): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/40 bg-background px-6 py-2">
      <p className="text-xs text-muted-foreground">{t("audit.pagination.showing", { count: filteredCount, total: totalCount })}</p>
      <div className="flex gap-2">
        <Button className="h-7 text-xs" disabled size="sm" variant="outline">
          {t("audit.pagination.previous")}
        </Button>
        <Button className="h-7 text-xs" size="sm" variant="outline">
          {t("audit.pagination.next")}
        </Button>
      </div>
    </div>
  );
}
