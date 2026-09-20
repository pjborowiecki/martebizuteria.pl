import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"
export const CatalogTableHeader = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog")
  const tAdmin = useTranslations("pages.admin")
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6">
          <input type="checkbox" aria-label={tAdmin("a11y.selectAll")} className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("columns.product")}</TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("columns.ref")}</TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("columns.category")}</TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("columns.collection")}</TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("columns.price")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("columns.stock")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("columns.status")}</TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  )
}
