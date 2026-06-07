import { type JSX, useMemo } from "react";

import { useTranslations } from "use-intl";

import { STORE_CURRENCY_CODE } from "~/src/constants/_constants/currency";

import { AdminNumericColumnFilter } from "~/src/components/custom/pages/admin/lib/admin-numeric-column-filter";
import { ordersDataGrid } from "~/src/components/custom/pages/admin/orders/utils/orders-data-grid";

interface OrdersNumericColumnFilterProps {
  readonly ariaLabelKey: "filter.total";
  readonly columnId: string;
  readonly labelKey: "columns.total";
}

export function OrdersNumericColumnFilter({ ariaLabelKey, columnId, labelKey }: Readonly<OrdersNumericColumnFilterProps>): JSX.Element {
  const tOrders = useTranslations("pages.admin.orders");
  const tCustomers = useTranslations("pages.admin.customers");
  const { table } = ordersDataGrid.useDataGrid();

  const labels = useMemo(
    () => ({
      amount: tCustomers("filter.numeric.amount"),
      apply: tCustomers("filter.numeric.apply"),
      clear: tCustomers("filter.numeric.clear"),
      endAmount: tCustomers("filter.numeric.endAmount"),
      operator: tCustomers("filter.numeric.operator"),
      operatorBetween: tCustomers("filter.numeric.operatorBetween"),
      operatorEq: tCustomers("filter.numeric.operatorEq"),
      operatorGt: tCustomers("filter.numeric.operatorGt"),
      operatorGte: tCustomers("filter.numeric.operatorGte"),
      operatorLt: tCustomers("filter.numeric.operatorLt"),
      operatorLte: tCustomers("filter.numeric.operatorLte"),
      startAmount: tCustomers("filter.numeric.startAmount")
    }),
    [tCustomers]
  );

  return (
    <AdminNumericColumnFilter
      ariaLabel={tOrders(ariaLabelKey)}
      columnId={columnId}
      currencyCode={STORE_CURRENCY_CODE}
      label={tOrders(labelKey)}
      labels={labels}
      table={table}
    />
  );
}
