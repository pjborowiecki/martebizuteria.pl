import { type JSX, useMemo, useState } from "react";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { OrdersFooter } from "~/src/components/custom/pages/admin/orders/orders-footer";
import { OrdersStats } from "~/src/components/custom/pages/admin/orders/orders-stats/orders-stats";
import { OrdersTable } from "~/src/components/custom/pages/admin/orders/orders-table/orders-table";
import { OrdersToolbar } from "~/src/components/custom/pages/admin/orders/orders-toolbar/orders-toolbar";

import { type OrderTab, ORDERS } from "~/src/data/orders-data";

export function OrdersPage(): JSX.Element {
  const [tab, setTab] = useState<OrderTab>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let result = tab === "all" ? ORDERS : ORDERS.filter((o) => o.fulfillment === tab);
    if (query !== "") {
      const q = query.toLowerCase();
      result = result.filter((o) => {
        const searchable = `${o.id} ${o.customer} ${o.email} ${o.customerId} ${o.total}`.toLowerCase();
        return searchable.includes(q);
      });
    }
    return result;
  }, [tab, query]);

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-8">
      <OrdersStats />

      <Card className="border-border/40 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
        <CardContent className="flex flex-col p-0">
          <OrdersToolbar activeTab={tab} onQueryChange={setQuery} onTabChange={setTab} query={query} />
          <OrdersTable orders={filtered} />
          <OrdersFooter filteredCount={filtered.length} totalCount={ORDERS.length} />
        </CardContent>
      </Card>
    </div>
  );
}
