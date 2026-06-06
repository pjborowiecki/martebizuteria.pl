import type { JSX } from "react";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { useOrdersList } from "~/src/components/custom/pages/admin/orders/hooks/use-orders-list";
import { OrdersFooter } from "~/src/components/custom/pages/admin/orders/orders-footer";
import { OrdersStats } from "~/src/components/custom/pages/admin/orders/orders-stats/orders-stats";
import { OrdersTable } from "~/src/components/custom/pages/admin/orders/orders-table/orders-table";
import { OrdersToolbar } from "~/src/components/custom/pages/admin/orders/orders-toolbar/orders-toolbar";

export function OrdersPage(): JSX.Element {
  const {
    activeTab,
    filteredCount,
    isLoading,
    onNextPage,
    onPreviousPage,
    onQueryChange,
    onTabChange,
    orders,
    page,
    pageCount,
    query,
    totalCount
  } = useOrdersList();

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-8">
      <OrdersStats />

      <Card className="border-border/40 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
        <CardContent className="flex flex-col p-0">
          <OrdersToolbar activeTab={activeTab} onQueryChange={onQueryChange} onTabChange={onTabChange} query={query} />
          <OrdersTable isLoading={isLoading} orders={orders} />
          <OrdersFooter
            filteredCount={filteredCount}
            onNextPage={onNextPage}
            onPreviousPage={onPreviousPage}
            page={page}
            pageCount={pageCount}
            totalCount={totalCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
