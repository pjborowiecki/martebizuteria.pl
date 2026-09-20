import { type JSX, useMemo } from "react"

import { useTranslations } from "use-intl"

import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants"

import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"
import { AdminDateColumnFilter } from "~/src/presentation/components/custom/pages/admin/lib/admin-date-column-filter"

export const ProductsCreatedAtColumnFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const { table } = productsDataGrid.useDataGrid()
  const labels = useMemo(
    () => ({
      apply: t("filter.date.apply"),
      clear: t("filter.date.clear"),
      clearDate: t("filter.date.clearDate"),
      date: t("filter.date.date"),
      endDate: t("filter.date.endDate"),
      operator: t("filter.date.operator"),
      operatorAfter: t("filter.date.operatorAfter"),
      operatorBefore: t("filter.date.operatorBefore"),
      operatorBetween: t("filter.date.operatorBetween"),
      operatorOn: t("filter.date.operatorOn"),
      placeholder: t("filter.date.placeholder"),
      startDate: t("filter.date.startDate"),
      today: t("filter.date.today"),
    }),
    [t],
  )
  return (
    <AdminDateColumnFilter
      ariaLabel={t("filter.createdAt")}
      columnId={PRODUCT_TABLE_COLUMN_ID.createdAt}
      label={t("columns.createdAt")}
      labels={labels}
      table={table}
    />
  )
}
