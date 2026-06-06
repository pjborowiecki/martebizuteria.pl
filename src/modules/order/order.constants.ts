export const ADMIN_ORDERS_PAGE_SIZE = 25;

export const ORDER_QUERY_STALE_MS = 60_000;

export const ORDER_TABS = ["all", "pending", "unfulfilled", "shipped", "delivered"] as const;

export type AdminOrderTab = (typeof ORDER_TABS)[number];

export function isAdminOrderTab(value: string): value is AdminOrderTab {
  return (ORDER_TABS as readonly string[]).includes(value);
}

export const ADMIN_ORDER_TAB = {
  ALL: "all",
  DELIVERED: "delivered",
  PENDING: "pending",
  SHIPPED: "shipped",
  UNFULFILLED: "unfulfilled"
} as const satisfies Record<string, AdminOrderTab>;

export const ADMIN_ORDER_PAYMENT_UI_KEY = {
  AUTHORIZED: "authorized",
  PAID: "paid",
  REFUNDED: "refunded"
} as const;

export const ADMIN_ORDER_FULFILLMENT_UI_KEY = {
  DELIVERED: "delivered",
  PENDING: "pending",
  RETURNED: "returned",
  SHIPPED: "shipped",
  UNFULFILLED: "unfulfilled"
} as const;

export interface AdminOrderPaymentStyle {
  readonly className?: string;
  readonly variant: "default" | "destructive" | "outline" | "secondary";
}

export const PAYMENT_BADGE_STYLES: Record<string, AdminOrderPaymentStyle> = {
  authorized: { variant: "outline" },
  paid: { className: "bg-emerald-600 hover:bg-emerald-700", variant: "default" },
  refunded: { variant: "destructive" }
};

export const FULFILLMENT_DOT_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500",
  pending: "bg-amber-500",
  returned: "bg-red-400",
  shipped: "bg-blue-500",
  unfulfilled: "bg-muted-foreground/30"
};
