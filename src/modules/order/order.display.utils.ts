import { z } from "zod";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { formatPrice } from "~/src/lib/_utils/currency";

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_PAYMENT_UI_KEY } from "~/src/modules/order/order.constants";
import type { Order } from "~/src/modules/order/order.types";
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils";

const ZERO_ITEMS = 0;
const GUEST_CUSTOMER_ID = "";

export interface DisputeMetadata {
  amount: number;
  id: string;
  reason: string;
  status: string;
}

const metadataSchema = z.record(z.string(), z.unknown());

export function parseOrderMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (raw === null || raw === undefined || raw === "") {
    return {};
  }

  try {
    return metadataSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function mergeDisputeMetadata(currentMetadata: string | null | undefined, dispute: DisputeMetadata): string {
  const metadata = { ...parseOrderMetadata(currentMetadata), dispute };
  return JSON.stringify(metadata);
}

export function clearDisputeMetadata(currentMetadata: string | null | undefined): string {
  const { dispute: _removed, ...rest } = parseOrderMetadata(currentMetadata);
  return JSON.stringify(rest);
}

export function resolveAdminOrderPaymentUiKey(paymentStatus: string | null | undefined): string {
  if (paymentStatus === "succeeded") {
    return ADMIN_ORDER_PAYMENT_UI_KEY.PAID;
  }

  if (paymentStatus === "refunded") {
    return ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED;
  }

  return ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED;
}

export function resolveAdminOrderFulfillmentUiKey(
  orderStatus: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"]
): string {
  if (orderStatus === "pending") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING;
  }

  if (fulfillmentStatus === "shipped") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED;
  }

  if (fulfillmentStatus === "delivered") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED;
  }

  if (fulfillmentStatus === "cancelled") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.RETURNED;
  }

  return ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED;
}

export function formatAdminOrderDate(createdAt: Date | string): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return date.toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

interface AdminOrderListSourceRow {
  readonly createdAt: Date;
  readonly currencyCode: string;
  readonly customerName: string | null;
  readonly email: string;
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"];
  readonly id: string;
  readonly itemCount: number | null;
  readonly paymentStatus: string | null;
  readonly status: Order["select"]["status"];
  readonly total: number;
  readonly userId: string | null;
}

export function toAdminOrderListItem(row: AdminOrderListSourceRow): Order["adminListItem"] {
  const customerName = row.customerName ?? row.email;
  const customerId = row.userId ?? GUEST_CUSTOMER_ID;

  return {
    customer: customerName,
    customerId,
    date: formatAdminOrderDate(row.createdAt),
    email: row.email,
    fulfillment: resolveAdminOrderFulfillmentUiKey(row.status, row.fulfillmentStatus),
    id: row.id,
    initials: resolveAdminCustomerInitials(customerName),
    items: row.itemCount ?? ZERO_ITEMS,
    payment: resolveAdminOrderPaymentUiKey(row.paymentStatus),
    total: formatPrice(row.total, row.currencyCode, DEFAULT_LOCALE)
  };
}
