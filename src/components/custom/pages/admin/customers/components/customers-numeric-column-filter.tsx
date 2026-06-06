import { type JSX, useMemo } from "react";

import { useTranslations } from "use-intl";

import { customersDataGrid } from "~/src/components/custom/pages/admin/customers/utils/customers-data-grid";
import { AdminNumericColumnFilter } from "~/src/components/custom/pages/admin/lib/admin-numeric-column-filter";

import { DEFAULT_ADMIN_CUSTOMER_CURRENCY } from "~/src/modules/user/user.constants";

interface CustomersNumericColumnFilterProps {
  readonly ariaLabelKey: "filter.averageOrderValue" | "filter.totalSpent";
  readonly columnId: string;
  readonly labelKey: "columns.averageOrderValue" | "columns.spent";
}

/** Popover filter: operator + PLN amount for a numeric customer column (spent, average order value). */
export function CustomersNumericColumnFilter({
  ariaLabelKey,
  columnId,
  labelKey
}: Readonly<CustomersNumericColumnFilterProps>): JSX.Element {
  const t = useTranslations("pages.admin.customers");
  const { table } = customersDataGrid.useDataGrid();

  const labels = useMemo(
    () => ({
      amount: t("filter.numeric.amount"),
      apply: t("filter.numeric.apply"),
      clear: t("filter.numeric.clear"),
      endAmount: t("filter.numeric.endAmount"),
      operator: t("filter.numeric.operator"),
      operatorBetween: t("filter.numeric.operatorBetween"),
      operatorEq: t("filter.numeric.operatorEq"),
      operatorGt: t("filter.numeric.operatorGt"),
      operatorGte: t("filter.numeric.operatorGte"),
      operatorLt: t("filter.numeric.operatorLt"),
      operatorLte: t("filter.numeric.operatorLte"),
      startAmount: t("filter.numeric.startAmount")
    }),
    [t]
  );

  return (
    <AdminNumericColumnFilter
      ariaLabel={t(ariaLabelKey)}
      columnId={columnId}
      currencyCode={DEFAULT_ADMIN_CUSTOMER_CURRENCY}
      label={t(labelKey)}
      labels={labels}
      table={table}
    />
  );
}
