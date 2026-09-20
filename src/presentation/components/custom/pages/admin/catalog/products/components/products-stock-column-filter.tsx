import { type JSX, useMemo } from "react"

import { useTranslations } from "use-intl"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { PRODUCT_TABLE_COLUMN_ID } from "~/src/modules/product/product.constants"

import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"
import { AdminNumericColumnFilter } from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter"

export const ProductsStockColumnFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const { table } = productsDataGrid.useDataGrid()
  const labels = useMemo(
    () => ({
      amount: t("filter.integer.amount"),
      apply: t("filter.numeric.apply"),
      clear: t("filter.numeric.clear"),
      endAmount: t("filter.integer.endAmount"),
      operator: t("filter.numeric.operator"),
      operatorBetween: t("filter.numeric.operatorBetween"),
      operatorEq: t("filter.numeric.operatorEq"),
      operatorGt: t("filter.numeric.operatorGt"),
      operatorGte: t("filter.numeric.operatorGte"),
      operatorLt: t("filter.numeric.operatorLt"),
      operatorLte: t("filter.numeric.operatorLte"),
      startAmount: t("filter.integer.startAmount"),
    }),
    [t],
  )
  return (
    <AdminNumericColumnFilter
      ariaLabel={t("filter.stock")}
      columnId={PRODUCT_TABLE_COLUMN_ID.stock}
      currencyCode={STORE_CURRENCY_CODE}
      inputMode="integer"
      label={t("columns.stock")}
      labels={labels}
      table={table}
    />
  )
}
