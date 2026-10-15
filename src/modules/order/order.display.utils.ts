import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import {
  ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP,
  ADMIN_ORDER_FULFILLMENT_STEPS,
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  type AdminOrderAdvancedStep,
  type AdminOrderFulfillmentUiKey,
  type AdminOrderPaymentUiKey,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

export const parseOrderMetadata = (raw: string | null | undefined): Record<string, unknown> => {
  if (raw === null || raw === undefined || raw === "") {
    return {}
  }

  try {
    return orderZodSchemas.metadata.parse(JSON.parse(raw))
  } catch {
    return {}
  }
}

export const resolveOrderLocale = (metadata: string | null | undefined): SupportedLocale => {
  const rawLocale = parseOrderMetadata(metadata)["locale"]

  return typeof rawLocale === "string" && isSupportedLocale(rawLocale) ? rawLocale : I18N.DEFAULT_LOCALE
}

export const mergeDisputeMetadata = (currentMetadata: string | null | undefined, dispute: Order["disputeMetadata"]): string => {
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

export const resolveAdminOrderDispute = (metadata: string | null | undefined): Order["disputeMetadata"] | undefined =>
  orderZodSchemas.disputeMetadata.safeParse(parseOrderMetadata(metadata)["dispute"]).data

export const resolveAdminOrderPaymentUiKey = (paymentStatus: string | null | undefined): AdminOrderPaymentUiKey => {
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
): AdminOrderFulfillmentUiKey => {
  if (orderStatus === "pending") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING
  }

  if (orderStatus === "cancelled") {
    return ADMIN_ORDER_FULFILLMENT_UI_KEY.CANCELLED
  }

  return (
    ADMIN_ORDER_FULFILLMENT_STEPS.find((step) =>
      (ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP[step] as readonly string[]).includes(fulfillmentStatus),
    ) ?? ADMIN_ORDER_FULFILLMENT_UI_KEY.CANCELLED
  )
}

export const formatAdminOrderDate = (createdAt: Date | string, locale: string = I18N.DEFAULT_LOCALE): string => {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const formatCountryName = (countryCode: string, locale: string): string => {
  try {
    return new Intl.DisplayNames([locale], { fallback: "none", type: "region" }).of(countryCode) ?? countryCode
  } catch {
    return countryCode
  }
}

const isFilledAddressPart = (part: string | null | undefined): part is string => part !== null && part !== undefined && part.trim() !== ""

export const formatOrderAddressLocality = (
  { city, countryCode, postalCode, province }: Readonly<OrderAddressLocality>,
  locale: string,
): string =>
  [[postalCode, city].filter((part) => isFilledAddressPart(part)).join(" "), province, formatCountryName(countryCode, locale)]
    .filter((part) => isFilledAddressPart(part))
    .join(", ")

export const resolveAdminOrderEmailedSteps = ({
  deliveredEmailAt,
  inProgressEmailAt,
  shippedEmailAt,
}: Readonly<OrderStepEmailClaims>): readonly AdminOrderAdvancedStep[] => {
  const claims = [
    ["processing", inProgressEmailAt],
    ["shipped", shippedEmailAt],
    ["delivered", deliveredEmailAt],
  ] as const

  return claims.filter(([, claimedAt]) => claimedAt !== null).map(([step]) => step)
}

export const toAdminOrderListItem = (row: AdminOrderListSourceRow): Order["adminListItem"] => {
  const customerName = row.customerName ?? row.email

  return {
    createdAt: row.createdAt,
    currencyCode: row.currencyCode,
    customerName,
    email: row.email,
    emailedSteps: resolveAdminOrderEmailedSteps(row),
    fulfillmentStatus: row.fulfillmentStatus,
    fulfillmentUiKey: resolveAdminOrderFulfillmentUiKey(row.status, row.fulfillmentStatus),
    hasOpenDispute: resolveAdminOrderDispute(row.metadata) !== undefined,
    id: row.id,
    initials: resolveAdminCustomerInitials(customerName),
    itemCount: row.itemCount ?? 0,
    orderNumber: row.orderNumber,
    paymentUiKey: resolveAdminOrderPaymentUiKey(row.paymentStatus),
    status: row.status,
    totalMinorUnits: row.total,
    userId: row.userId,
  }
}

interface OrderStepEmailClaims {
  readonly deliveredEmailAt: Date | null
  readonly inProgressEmailAt: Date | null
  readonly shippedEmailAt: Date | null
}

interface AdminOrderListSourceRow extends OrderStepEmailClaims {
  readonly createdAt: Date
  readonly currencyCode: string
  readonly customerName: string | null
  readonly email: string
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly id: string
  readonly itemCount: number | null
  readonly metadata: string | null
  readonly orderNumber: string
  readonly paymentStatus: string | null
  readonly status: Order["select"]["status"]
  readonly total: number
  readonly userId: string | null
}

interface OrderAddressLocality {
  readonly city: string
  readonly countryCode: string
  readonly postalCode: string | null | undefined
  readonly province: string | null | undefined
}
