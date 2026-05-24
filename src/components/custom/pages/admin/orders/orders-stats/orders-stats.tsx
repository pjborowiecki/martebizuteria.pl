import type { JSX } from "react";

import { OrderStatCard } from "~/src/components/custom/pages/admin/orders/orders-stats/order-stat-card";

import { ORDER_STATS } from "~/src/data/orders-data";

export function OrdersStats(): JSX.Element {
  return (
    <div className="grid shrink-0 gap-5 sm:grid-cols-4">
      {ORDER_STATS.map((stat) => (
        <OrderStatCard key={stat.key} stat={stat} />
      ))}
    </div>
  );
}
