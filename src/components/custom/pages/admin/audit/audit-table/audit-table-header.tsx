import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

const HEADER_CLASS = "text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60";

export function AuditTableHeader(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_hsl(var(--border)/0.4)]">
      <TableRow className="hover:bg-transparent">
        <TableHead className={`w-[70px] pl-6 ${HEADER_CLASS}`}>{t("audit.columns.status")}</TableHead>
        <TableHead className={`w-[140px] ${HEADER_CLASS}`}>{t("audit.columns.event")}</TableHead>
        <TableHead className={`w-[90px] ${HEADER_CLASS}`}>{t("audit.columns.target")}</TableHead>
        <TableHead className={HEADER_CLASS}>{t("audit.columns.detail")}</TableHead>
        <TableHead className={`w-[90px] ${HEADER_CLASS}`}>{t("audit.columns.category")}</TableHead>
        <TableHead className={`w-[120px] ${HEADER_CLASS}`}>{t("audit.columns.actor")}</TableHead>
        <TableHead className={`w-[150px] ${HEADER_CLASS}`}>{t("audit.columns.timestamp")}</TableHead>
        <TableHead className={`w-[100px] pr-6 ${HEADER_CLASS}`}>{t("audit.columns.ip")}</TableHead>
      </TableRow>
    </TableHeader>
  );
}
