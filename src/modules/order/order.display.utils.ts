import { z } from "zod"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
import { isValidLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_PAYMENT_UI_KEY } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"
export const parseOrderMetadata = (raw: string | null | undefined): Record<string, unknown> => {
  if (raw === null || raw === undefined || raw === "") {
    return {}
  }
  try {
    return metadataSchema.parse(JSON.parse(raw))
  } catch {
    return {}
  }
}
export const resolveOrderLocale = (metadata: string | null | undefined): Locale => {
  const rawLocale = parseOrderMetadata(metadata)["locale"]
  return typeof rawLocale === "string" && isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE
}
export const mergeDisputeMetadata = (currentMetadata: string | null | undefined, dispute: DisputeMetadata): string => {
  const metadata = {
    ...parseOrderMetadata(currentMetadata),
    dispute,
  }
  return JSON.stringify(metadata)
}
export const clearDisputeMetadata = (currentMetadata: string | null | undefined): string => {
  const { dispute: _removed, ...rest } = parseOrderMetadata(currentMetadata)
  return JSON.stringify(rest)
}
export const resolveAdminOrderPaymentUiKey = (paymentStatus: string | null | undefined): string => {
  if (paymentStatus === "succeeded") {
    return ADMIN_ORDER_PAYMENT_UI_KEY.PAID
  }
  if (paymentStatus === "refunded") {
    return ADMIN_ORDER_PAYMENT_UI_KEY.REFUNDED
  }
  return ADMIN_ORDER_PAYMENT_UI_KEY.AUTHORIZED
}
export const resolveAdminOrderFulfillmentUiKey = (
  orderStatus: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): string => {
  if (orderStatus === "pending") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING
  }
  if (fulfillmentStatus === "shipped") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED
  }
  if (fulfillmentStatus === "delivered") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED
  }
  if (fulfillmentStatus === "cancelled") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.RETURNED
  }
  return ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED
}
export const formatAdminOrderDate = (createdAt: Date | string, locale: string = DEFAULT_LOCALE): string => {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
export const toAdminOrderListItem = (row: AdminOrderListSourceRow): Order["adminListItem"] => {
  const customerName = row.customerName ?? row.email
  return {
    createdAt: row.createdAt,
    currencyCode: row.currencyCode,
    customerName,
    email: row.email,
    fulfillmentStatus: row.fulfillmentStatus,
    fulfillmentUiKey: resolveAdminOrderFulfillmentUiKey(row.status, row.fulfillmentStatus),
    id: row.id,
    initials: resolveAdminCustomerInitials(customerName),
    itemCount: row.itemCount ?? 0,
    paymentUiKey: resolveAdminOrderPaymentUiKey(row.paymentStatus),
    status: row.status,
    totalMinorUnits: row.total,
    userId: row.userId,
  }
}
export interface DisputeMetadata {
  amount: number
  id: string
  reason: string
  status: string
}
const metadataSchema = z.record(z.string(), z.unknown())
interface AdminOrderListSourceRow {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customerName: string | null
  readonly email: string
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly id: string
  readonly itemCount: number | null
  readonly paymentStatus: string | null
  readonly status: Order["select"]["status"]
  readonly total: number
  readonly userId: string | null
}
