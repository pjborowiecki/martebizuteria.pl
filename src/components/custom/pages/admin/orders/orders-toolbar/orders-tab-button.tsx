import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import type { AdminOrderTab } from "~/src/modules/order/order.constants";

interface OrdersTabButtonProps {
  readonly isActive: boolean;
  readonly onSelect: (tab: AdminOrderTab) => void;
  readonly tab: AdminOrderTab;
}

export function OrdersTabButton({ isActive, onSelect, tab }: OrdersTabButtonProps): JSX.Element {
  const t = useTranslations("pages.admin");
  const handleClick = useCallback(() => {
    onSelect(tab);
  }, [onSelect, tab]);

  return (
    <button
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={handleClick}
      type="button"
    >
      {t(`orders.tabs.${tab}`)}
    </button>
  );
}
