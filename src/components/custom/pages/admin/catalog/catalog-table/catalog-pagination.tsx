import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

export function CatalogPagination(): JSX.Element {
  const t = useTranslations("pages.admin.catalog");

  return (
    <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
      <p className="text-sm text-muted-foreground">{t("pagination.showing")}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
          {t("pagination.previous")}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}
