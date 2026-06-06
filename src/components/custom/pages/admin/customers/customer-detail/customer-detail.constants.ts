export const CUSTOMER_DETAIL_FULFILLMENT_BADGE_STYLES: Record<string, string> = {
  delivered: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  returned: "bg-red-500/10 text-red-500",
  shipped: "bg-blue-500/10 text-blue-600",
  unfulfilled: "bg-muted text-muted-foreground"
};

export const CUSTOMER_DETAIL_PAYMENT_BADGE_STYLES: Record<string, string> = {
  authorized: "bg-muted text-muted-foreground",
  paid: "bg-emerald-500/10 text-emerald-600",
  refunded: "bg-red-500/10 text-red-500"
};
