import { type JSX, useCallback, useMemo } from "react";

import { ListFilter } from "lucide-react";
import { useTranslations } from "use-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { ordersDataGrid } from "~/src/components/custom/pages/admin/orders/utils/orders-data-grid";

import {
  ADMIN_ORDER_STATUSES,
  ADMIN_ORDER_STATUS_LABEL_KEYS,
  ADMIN_ORDER_TABLE_COLUMN_ID,
  isAdminOrderStatus
} from "~/src/modules/order/order.constants";

const ALL_VALUE = "all";
const TABLE_PAGE_INDEX_START = 0;

export function OrdersStatusFilter(): JSX.Element {
  const t = useTranslations("pages.admin.orders");
  const { table } = ordersDataGrid.useDataGrid();
  const column = table.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status);
  const rawFilter = column?.getFilterValue();
  const current = typeof rawFilter === "string" ? rawFilter : ALL_VALUE;

  const options = useMemo(() => {
    const statusOptions = ADMIN_ORDER_STATUSES.map((status) => ({
      label: t(ADMIN_ORDER_STATUS_LABEL_KEYS[status]),
      value: status
    }));

    return [{ label: t("filter.allStatuses"), value: ALL_VALUE }, ...statusOptions];
  }, [t]);

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return;
      }
      column?.setFilterValue(value === ALL_VALUE || !isAdminOrderStatus(value) ? undefined : value);
      table.setPageIndex(TABLE_PAGE_INDEX_START);
    },
    [column, table]
  );

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[180px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.status")}>
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
