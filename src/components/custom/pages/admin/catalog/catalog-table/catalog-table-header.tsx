import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

export function CatalogTableHeader(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6">
          <input type="checkbox" aria-label={t("a11y.selectAll")} className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("catalog.columns.product")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("catalog.columns.ref")}</TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("catalog.columns.category")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("catalog.columns.collection")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("catalog.columns.price")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("catalog.columns.stock")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("catalog.columns.status")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}
