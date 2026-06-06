import { type ChangeEvent, type JSX, useCallback } from "react";

import { Search } from "lucide-react";
import { useTranslations } from "use-intl";

import { OrdersTabButton } from "~/src/components/custom/pages/admin/orders/orders-toolbar/orders-tab-button";

import { ORDER_TABS, type AdminOrderTab } from "~/src/modules/order/order.constants";

interface OrdersToolbarProps {
  readonly activeTab: AdminOrderTab;
  readonly onQueryChange: (query: string) => void;
  readonly onTabChange: (tab: AdminOrderTab) => void;
  readonly query: string;
}

export function OrdersToolbar({ activeTab, onQueryChange, onTabChange, query }: OrdersToolbarProps): JSX.Element {
  const t = useTranslations("pages.admin");

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onQueryChange(e.target.value);
    },
    [onQueryChange]
  );

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-3">
      <div className="flex gap-1">
        {ORDER_TABS.map((tab) => (
          <OrdersTabButton isActive={activeTab === tab} key={tab} onSelect={onTabChange} tab={tab} />
        ))}
      </div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
          strokeWidth={1.5}
        />
        <input
          aria-label={t("orders.searchPlaceholder")}
          className="h-9 w-64 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
          onChange={handleSearchChange}
          placeholder={t("orders.searchPlaceholder")}
          type="text"
          value={query}
        />
      </div>
    </div>
  );
}
