import type { Order } from "~/src/modules/order/order.types";

const CANCELLED_ORDER_STATUSES = ["cancelled", "refunded"] as const;
const OPEN_ORDER_STATUSES = ["pending", "processing"] as const;
const FULFILLABLE_FULFILLMENT_STATUSES = ["not_fulfilled", "partially_fulfilled"] as const;
const SHIPPABLE_FULFILLMENT_STATUSES = ["fulfilled", "partially_fulfilled"] as const;
const TERMINAL_FULFILLMENT_STATUSES = ["shipped", "delivered", "cancelled"] as const;

type OrderActionSnapshot = Pick<Order["adminListItem"], "fulfillmentStatus" | "paymentUiKey" | "status">;

function isCancelledOrderStatus(status: Order["select"]["status"]): boolean {
  return (CANCELLED_ORDER_STATUSES as readonly string[]).includes(status);
}

export function canFulfillAdminOrder({ fulfillmentStatus, status }: OrderActionSnapshot): boolean {
  if (isCancelledOrderStatus(status)) {
    return false;
  }

  return (FULFILLABLE_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus);
}

export function canMarkAdminOrderShipped({ fulfillmentStatus, status }: OrderActionSnapshot): boolean {
  if (isCancelledOrderStatus(status)) {
    return false;
  }

  if ((TERMINAL_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)) {
    return false;
  }

  return (SHIPPABLE_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus);
}

export function canCancelAdminOrder({ status }: Pick<OrderActionSnapshot, "status">): boolean {
  return (OPEN_ORDER_STATUSES as readonly string[]).includes(status);
}

export function canRefundAdminOrder({ paymentUiKey, status }: Pick<OrderActionSnapshot, "paymentUiKey" | "status">): boolean {
  return paymentUiKey === "paid" && status !== "refunded" && status !== "cancelled";
}

export function canPrintAdminOrderInvoice({ status }: Pick<OrderActionSnapshot, "status">): boolean {
  return status !== "cancelled";
}
