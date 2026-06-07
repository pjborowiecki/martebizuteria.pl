import type { JSX } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "use-intl";

import {
  formatOrderStatDisplayValue,
  OrderStatCard,
  resolveOrderStatValue
} from "~/src/components/custom/pages/admin/orders/components/order-stat-card";
import { useOrdersDataGridContext } from "~/src/components/custom/pages/admin/orders/hooks/use-orders-data-grid";
import { ORDER_STAT_CARDS } from "~/src/components/custom/pages/admin/orders/orders-stats.config";

import { orderQueryOptions } from "~/src/modules/order/order.queries";

export function OrdersStats(): JSX.Element {
  const locale = useLocale();
  const { data: stats, isFetching, isStale } = useSuspenseQuery(orderQueryOptions.adminOrderStatsQueryOptions());
  const valuesPending = isFetching && isStale;
  const { activeStatFilter, applyOrderStatFilter } = useOrdersDataGridContext();

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {ORDER_STAT_CARDS.map((config) => {
        const value = resolveOrderStatValue(stats, config.key);

        return (
          <OrderStatCard
            key={config.key}
            activeFilter={activeStatFilter}
            config={config}
            currencyCode={stats.currencyCode}
            displayValue={
              valuesPending ? undefined : formatOrderStatDisplayValue({ currencyCode: stats.currencyCode, key: config.key, locale, value })
            }
            onFilter={applyOrderStatFilter}
            valuesPending={valuesPending}
          />
        );
      })}
    </div>
  );
}
