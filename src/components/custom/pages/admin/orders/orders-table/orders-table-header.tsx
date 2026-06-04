import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

const HEADER_CLASS = "text-xs font-medium uppercase tracking-wider text-muted-foreground/60";

export function OrdersTableHeader(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className={`w-12 pl-6 ${HEADER_CLASS}`}>
          <input aria-label={t("a11y.selectAll")} className="size-4 rounded border-border accent-foreground" type="checkbox" />
        </TableHead>
        <TableHead className={HEADER_CLASS}>{t("orders.columns.order")}</TableHead>
        <TableHead className={HEADER_CLASS}>{t("orders.columns.customer")}</TableHead>
        <TableHead className={HEADER_CLASS}>{t("orders.columns.date")}</TableHead>
        <TableHead className={`text-center ${HEADER_CLASS}`}>{t("orders.columns.items")}</TableHead>
        <TableHead className={`text-right ${HEADER_CLASS}`}>{t("orders.columns.total")}</TableHead>
        <TableHead className={HEADER_CLASS}>{t("orders.columns.payment")}</TableHead>
        <TableHead className={HEADER_CLASS}>{t("orders.columns.fulfillment")}</TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}
