import { type JSX, useMemo } from "react";

import { useTranslations } from "use-intl";

import { AdminDateColumnFilter, type AdminDateColumnFilterLabels } from "~/src/components/custom/pages/admin/lib/admin-date-column-filter";
import { ordersDataGrid } from "~/src/components/custom/pages/admin/orders/utils/orders-data-grid";

interface OrdersDateColumnFilterProps {
  readonly ariaLabelKey: "filter.createdAt";
  readonly columnId: string;
  readonly labelKey: "columns.date";
}

export function OrdersDateColumnFilter({ ariaLabelKey, columnId, labelKey }: Readonly<OrdersDateColumnFilterProps>): JSX.Element {
  const t = useTranslations("pages.admin.orders");
  const { table } = ordersDataGrid.useDataGrid();

  const labels = useMemo(
    (): AdminDateColumnFilterLabels => ({
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
      today: t("filter.date.today")
    }),
    [t]
  );

  return <AdminDateColumnFilter ariaLabel={t(ariaLabelKey)} columnId={columnId} label={t(labelKey)} labels={labels} table={table} />;
}
