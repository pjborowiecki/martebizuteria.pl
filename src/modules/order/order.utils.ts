import { type ColumnFiltersState } from "@tanstack/react-table"

import { INPOST_CANCELED_SHIPMENT_STATUS } from "~/src/integrations/inpost/inpost.constants"
import { formatInpostLockerAddress, inpostTrackingUrl, parseInpostLockerPoint } from "~/src/integrations/inpost/inpost.utils"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { type DisplayPreferences } from "~/src/integrations/use-intl/i18n.display"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"
import { isDateColumnFilterValue, isNumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { formatCountryName } from "~/src/modules/_core/utils/country-name"
import {
  type CalendarDate,
  type CalendarPeriod,
  normalizeCalendarDate,
  startOfCalendarDate,
  toCalendarDate,
} from "~/src/modules/_core/utils/datetime"
import { isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"
import { tryParseJsonRecord } from "~/src/modules/_core/utils/json"
import { vatFromGross } from "~/src/modules/_core/utils/tax"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditChangeMetadata } from "~/src/modules/audit-log/audit-log.types"
import { buildAuditChangeMetadata, describeAuditLogDetail, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.utils"
import { INPOST_COURIER_CODE } from "~/src/modules/courier/courier.constants"
import {
  ADMIN_DASHBOARD_MS_PER_DAY,
  ADMIN_ORDER_ADVANCED_STEPS,
  ADMIN_ORDER_CANCEL_BLOCKER,
  ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP,
  ADMIN_ORDER_FULFILLMENT_STEPS,
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_PREVIOUS_STEP,
  ADMIN_ORDER_REFUND_BLOCKER,
  ADMIN_ORDER_TABLE_COLUMN_ID,
  ADMIN_ORDER_TIMELINE_EMAIL_STATUS_BY_ACTION,
  ADMIN_ORDER_TIMELINE_KIND,
  ADMIN_ORDER_TIMELINE_KIND_BY_ACTION,
  ADMIN_ORDER_TIMELINE_LABEL_KEY_BY_ACTION,
  type AdminOrderAdvancedStep,
  type AdminOrderCancelBlocker,
  type AdminOrderFulfillmentUiKey,
  type AdminOrderPaymentUiKey,
  type AdminOrderRefundBlocker,
  CANCELLED_ORDER_STATUSES,
  type CustomerAccountOrderFilter,
  type CustomerAccountOrderStatus,
  DISPATCHED_FULFILLMENT_STATUSES,
  FULFILLABLE_FULFILLMENT_STATUSES,
  INPOST_DELIVERY_TYPES,
  OPEN_ORDER_STATUSES,
  SHIPPABLE_FULFILLMENT_STATUSES,
  isAdminOrderFulfillmentUiKey,
  isAdminOrderPaymentUiKey,
  isAdminOrderStatus,
} from "~/src/modules/order/order.constants"
import {
  type AdminDashboard,
  type AdminDashboardChartWindow,
  type AdminOrderAddressRow,
  type AdminOrderAddressSources,
  type AdminOrderCancelBlockerSnapshot,
  type AdminOrderColumnFilterHandler,
  type AdminOrderItemRow,
  type AdminOrderListSourceRow,
  type AdminOrderRefundBlockerSnapshot,
  type AdminOrderTimelineRow,
  type ChartWindowInput,
  type InpostDelivery,
  type InpostDeliverySource,
  type InpostShipmentSnapshot,
  type MeasuredFulfillmentTime,
  type Order,
  type OrderActionSnapshot,
  type OrderAddressLocality,
  type OrderAggregateRow,
  type OrderDestinationRow,
  type OrderLineFulfillmentTime,
  type OrderLockerSource,
  type OrderShippingAddressSources,
  type OrderStepEmailClaims,
  type OrderStepSnapshot,
  type OrderTotals,
  type OrderTotalsInput,
  type OrderTotalsLine,
  type OrderTrackingLinkSource,
  type ResendableOrderEmail,
} from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"

export const isInpostDelivery = (delivery: Readonly<InpostDeliverySource>): delivery is InpostDelivery =>
  delivery.courierCode === INPOST_COURIER_CODE &&
  delivery.type !== undefined &&
  (INPOST_DELIVERY_TYPES as readonly string[]).includes(delivery.type)

const isCancelledOrderStatus = (status: Order["select"]["status"]): boolean =>
  (CANCELLED_ORDER_STATUSES as readonly string[]).includes(status)

const isDispatchedFulfillmentStatus = (fulfillmentStatus: Order["select"]["fulfillmentStatus"]): boolean =>
  (DISPATCHED_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)

export const canFulfillAdminOrder = ({ fulfillmentStatus, status }: OrderActionSnapshot): boolean => {
  if (isCancelledOrderStatus(status)) {
    return false
  }

  return (FULFILLABLE_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)
}

export const canMarkAdminOrderShipped = ({ fulfillmentStatus, status }: OrderActionSnapshot): boolean => {
  if (isCancelledOrderStatus(status)) {
    return false
  }

  if ((TERMINAL_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)) {
    return false
  }

  return (SHIPPABLE_FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentStatus)
}

export const canMarkAdminOrderDelivered = ({
  fulfillmentStatus,
  status,
}: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): boolean => {
  if (isCancelledOrderStatus(status)) {
    return false
  }

  return fulfillmentStatus === "shipped"
}

export const canSetAdminOrderTrackingNumber = ({
  fulfillmentStatus,
  status,
}: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): boolean => !isCancelledOrderStatus(status) && fulfillmentStatus === "shipped"

export const resolveAdminOrderStepBack = ({
  fulfillmentStatus,
  status,
}: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): Order["stepBack"] | undefined => {
  if (isCancelledOrderStatus(status)) {
    return undefined
  }

  const from = ADMIN_ORDER_ADVANCED_STEPS.find((step) =>
    (ADMIN_ORDER_FULFILLMENT_STATUSES_BY_STEP[step] as readonly string[]).includes(fulfillmentStatus),
  )

  return from === undefined ? undefined : { from, to: ADMIN_ORDER_PREVIOUS_STEP[from] }
}

export const canCancelAdminOrder = ({ fulfillmentStatus, status }: Pick<OrderActionSnapshot, "fulfillmentStatus" | "status">): boolean =>
  (OPEN_ORDER_STATUSES as readonly string[]).includes(status) && !isDispatchedFulfillmentStatus(fulfillmentStatus)

export const cancelRefundsAdminOrderPayment = ({
  paymentUiKey,
  totalMinorUnits,
}: Pick<Order["adminListItem"], "paymentUiKey" | "totalMinorUnits">): boolean => paymentUiKey === "paid" && totalMinorUnits > 0

export const canRefundAdminOrder = ({ paymentUiKey, status }: Pick<OrderActionSnapshot, "paymentUiKey" | "status">): boolean =>
  paymentUiKey === "paid" && status !== "refunded" && status !== "cancelled"

export const refundRestocksByDefault = ({ fulfillmentStatus }: Pick<OrderActionSnapshot, "fulfillmentStatus">): boolean =>
  !isDispatchedFulfillmentStatus(fulfillmentStatus)

export const canRestockAdminOrder = ({ restockedAt, status }: Pick<Order["adminOrderDetail"], "restockedAt" | "status">): boolean =>
  status === "refunded" && restockedAt === undefined

export const resolveAdminOrderRefundBlocker = ({
  hasOpenDispute,
  totalMinorUnits,
}: AdminOrderRefundBlockerSnapshot): AdminOrderRefundBlocker | undefined => {
  if (totalMinorUnits <= 0) {
    return ADMIN_ORDER_REFUND_BLOCKER.NO_STRIPE_PAYMENT
  }

  if (hasOpenDispute) {
    return ADMIN_ORDER_REFUND_BLOCKER.OPEN_DISPUTE
  }

  return undefined
}

export const resolveAdminOrderCancelBlocker = ({
  hasOpenDispute,
  paymentUiKey,
  totalMinorUnits,
}: AdminOrderCancelBlockerSnapshot): AdminOrderCancelBlocker | undefined =>
  hasOpenDispute && cancelRefundsAdminOrderPayment({ paymentUiKey, totalMinorUnits }) ? ADMIN_ORDER_CANCEL_BLOCKER.OPEN_DISPUTE : undefined

export const canPrintAdminOrderSummary = ({ status }: Pick<OrderActionSnapshot, "status">): boolean => status !== "cancelled"

const holdsLiveInpostShipment = ({
  inpostShipmentId,
  inpostShipmentStatus,
}: Pick<InpostShipmentSnapshot, "inpostShipmentId" | "inpostShipmentStatus">): boolean =>
  inpostShipmentId !== undefined && inpostShipmentStatus !== INPOST_CANCELED_SHIPMENT_STATUS

export const canCreateAdminOrderInpostShipment = (snapshot: InpostShipmentSnapshot): boolean =>
  !holdsLiveInpostShipment(snapshot) &&
  isInpostDelivery({ courierCode: snapshot.courierCode, type: snapshot.deliveryType }) &&
  (OPEN_ORDER_STATUSES as readonly string[]).includes(snapshot.status) &&
  !isDispatchedFulfillmentStatus(snapshot.fulfillmentStatus)

const TERMINAL_FULFILLMENT_STATUSES = ["shipped", "delivered", "cancelled"] as const

const filledText = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

export const resolveOrderTrackingUrl = ({
  courierCode,
  deliveryType,
  trackingNumber,
  trackingUrl,
}: OrderTrackingLinkSource): string | undefined => {
  const number = filledText(trackingNumber)

  return (
    filledText(trackingUrl) ??
    (number !== undefined && isInpostDelivery({ courierCode, type: deliveryType }) ? inpostTrackingUrl(number) : undefined)
  )
}

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

export const formatAdminOrderDate = (createdAt: Date | string, { formatLocale, timeZone }: DisplayPreferences): string => {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)

  return date.toLocaleDateString(formatLocale, {
    day: "numeric",
    month: "short",
    timeZone,
    year: "numeric",
  })
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

export const parseAdminOrdersListFilters = (columnFilters: ColumnFiltersState): Order["adminListFilters"] =>
  columnFilters.reduce<Order["adminListFilters"]>((filters, { id, value }) => {
    const handler = ADMIN_ORDER_COLUMN_FILTER_HANDLERS[id]

    return handler === undefined ? filters : handler(filters, value)
  }, {})

const applyStatusFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminOrderStatus(value)
    ? {
        ...filters,
        status: value,
      }
    : filters

const applyPaymentFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminOrderPaymentUiKey(value)
    ? {
        ...filters,
        payment: value,
      }
    : filters

const applyFulfillmentFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  typeof value === "string" && isAdminOrderFulfillmentUiKey(value)
    ? {
        ...filters,
        fulfillment: value,
      }
    : filters

const applyTotalFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  isNumericColumnFilterValue(value)
    ? {
        ...filters,
        total: value,
      }
    : filters

const applyCreatedAtFilter: AdminOrderColumnFilterHandler = (filters, value) =>
  isDateColumnFilterValue(value)
    ? {
        ...filters,
        createdAt: value,
      }
    : filters

const ADMIN_ORDER_COLUMN_FILTER_HANDLERS: Partial<Record<string, AdminOrderColumnFilterHandler>> = {
  [ADMIN_ORDER_TABLE_COLUMN_ID.createdAt]: applyCreatedAtFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment]: applyFulfillmentFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.payment]: applyPaymentFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.status]: applyStatusFilter,
  [ADMIN_ORDER_TABLE_COLUMN_ID.total]: applyTotalFilter,
}

const NO_AMOUNT = 0

export const sumOrderLineSubtotal = (lines: readonly OrderTotalsLine[]): number =>
  lines.reduce((sum, line) => sum + line.price * line.qty, NO_AMOUNT)

export const computeOrderTotals = ({
  discountTotal = NO_AMOUNT,
  itemsSubtotal,
  shippingTotal,
  vatBasisPoints = STANDARD_VAT_BASIS_POINTS,
}: OrderTotalsInput): OrderTotals => {
  const cappedDiscount = Math.min(Math.max(discountTotal, NO_AMOUNT), itemsSubtotal + shippingTotal)
  const total = itemsSubtotal + shippingTotal - cappedDiscount

  return {
    discountTotal: cappedDiscount,
    shippingTotal,
    subtotal: itemsSubtotal,
    taxTotal: vatFromGross(total, vatBasisPoints),
    total,
    vatBasisPoints,
  }
}

const padDatePart = (value: number): string => String(value).padStart(DATE_PART_WIDTH, "0")

const toMonthKey = ({ month, year }: CalendarDate): string => `${String(year)}-${padDatePart(month)}`

const toDayKey = (date: CalendarDate): string => `${toMonthKey(date)}-${padDatePart(date.day)}`

const buildChartWindow = ({ count, dateAt, keyOf, timeZone }: ChartWindowInput): AdminDashboardChartWindow => {
  const periods = Array.from({ length: count }, (_, index) => {
    const date = dateAt(index)

    return { key: keyOf(date), start: startOfCalendarDate(date, timeZone) }
  })

  return {
    end: startOfCalendarDate(dateAt(count), timeZone),
    periods,
    start: startOfCalendarDate(dateAt(0), timeZone),
  }
}

const buildDayWindow = (first: CalendarDate, count: number, timeZone: string): AdminDashboardChartWindow =>
  buildChartWindow({ count, dateAt: (index) => normalizeCalendarDate({ ...first, day: first.day + index }), keyOf: toDayKey, timeZone })

export const resolveAdminDashboardDays = (referenceDate: Date, count: number, timeZone: string): AdminDashboardChartWindow => {
  const today = toCalendarDate(referenceDate, timeZone)

  return buildDayWindow({ ...today, day: today.day + 1 - count }, count, timeZone)
}

export const resolveAdminDashboardDateRange = (startDate: string, endDate: string, timeZone: string): AdminDashboardChartWindow => {
  const dayCount = (Date.parse(endDate) - Date.parse(startDate)) / ADMIN_DASHBOARD_MS_PER_DAY + 1

  return buildDayWindow(toCalendarDate(startDate, "UTC"), dayCount, timeZone)
}

export const resolveAdminDashboardMonths = (referenceDate: Date, count: number, timeZone: string): AdminDashboardChartWindow => {
  const { month, year } = toCalendarDate(referenceDate, timeZone)

  return buildChartWindow({
    count,
    dateAt: (index) => normalizeCalendarDate({ day: 1, month: month + 1 - count + index, year }),
    keyOf: toMonthKey,
    timeZone,
  })
}

export const buildAdminDashboardChartPoints = ({
  formatLocale,
  labelFormat,
  periods,
  rows,
  timeZone,
}: Readonly<{
  formatLocale: string
  labelFormat: Intl.DateTimeFormatOptions
  periods: readonly CalendarPeriod[]
  rows: readonly OrderAggregateRow[]
  timeZone: string
}>): AdminDashboard["chartPoint"][] => {
  const rowByPeriodKey = new Map(rows.map((row) => [row.periodKey, row]))

  return periods.map(({ key, start }) => {
    const point = {
      dateKey: key,
      label: start.toLocaleDateString(formatLocale, { ...labelFormat, timeZone }),
      orders: 0,
      revenue: 0,
    }
    const aggregate = rowByPeriodKey.get(key)

    return aggregate === undefined ? point : { ...point, orders: aggregate.orders, revenue: aggregate.revenue }
  })
}

export const isAdminDashboardCustomChartRangeValid = (startDate: string, endDate: string): boolean => {
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return false
  }

  return parseIsoDateToStartMs(startDate) <= parseIsoDateToEndMs(endDate)
}

const DATE_PART_WIDTH = 2

const filledOrUndefined = (value: string | null): string | undefined => {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

export const mapAdminOrderDetailAddress = (row: AdminOrderAddressRow | null | undefined): Order["adminOrderDetailAddress"] | undefined => {
  if (row === null || row === undefined) {
    return undefined
  }

  const name = [row.firstName, row.lastName]
    .filter((part) => part !== null && part.trim() !== "")
    .join(" ")
    .trim()

  return {
    city: row.city,
    countryCode: row.countryCode,
    line1: row.address1,
    line2: filledOrUndefined(row.address2),
    name: name === "" ? EMPTY_VALUE : name,
    phone: filledOrUndefined(row.phone),
    postalCode: filledOrUndefined(row.postalCode),
    province: filledOrUndefined(row.province),
  }
}

export const resolveOrderLocker = ({ deliveryType, lockerId, lockerPoint }: Readonly<OrderLockerSource>): Order["locker"] | undefined => {
  const code = filledOrUndefined(lockerId)

  return deliveryType === "locker" && code !== undefined ? { code, point: parseInpostLockerPoint(lockerPoint) } : undefined
}

const isSameAdminOrderAddress = (left: AdminOrderAddressRow, right: AdminOrderAddressRow): boolean =>
  left.address1 === right.address1 &&
  left.address2 === right.address2 &&
  left.city === right.city &&
  left.countryCode === right.countryCode &&
  left.firstName === right.firstName &&
  left.lastName === right.lastName &&
  left.phone === right.phone &&
  left.postalCode === right.postalCode &&
  left.province === right.province

export const resolveOrderShippingAddressRow = ({
  addresses,
  checkout,
}: Readonly<OrderShippingAddressSources>): AdminOrderAddressRow | undefined =>
  addresses.find((row) => row.type === "shipping") ?? checkout?.shippingAddress ?? undefined

export const resolveAdminOrderDetailAddresses = (
  sources: AdminOrderAddressSources,
): Pick<Order["adminOrderDetail"], "billingAddress" | "billingSameAsShipping" | "shippingAddress"> => {
  const { addresses, checkout } = sources
  const billingSnapshot = addresses.find((row) => row.type === "billing")
  const shippingSnapshot = addresses.find((row) => row.type === "shipping")
  const placedBeforeSnapshots = addresses.length === 0

  return {
    billingAddress: mapAdminOrderDetailAddress(billingSnapshot ?? checkout?.billingAddress),
    billingSameAsShipping: placedBeforeSnapshots
      ? checkout !== null && checkout.billingAddressId !== null && checkout.billingAddressId === checkout.shippingAddressId
      : billingSnapshot !== undefined && shippingSnapshot !== undefined && isSameAdminOrderAddress(billingSnapshot, shippingSnapshot),
    shippingAddress: mapAdminOrderDetailAddress(resolveOrderShippingAddressRow(sources)),
  }
}

export const mapAdminOrderDetailItem = (row: AdminOrderItemRow): Order["adminOrderDetailItem"] => ({
  id: row.id,
  imageUrl: row.thumbnail === null || row.thumbnail === "" ? undefined : row.thumbnail,
  productHandle: row.productHandle ?? undefined,
  quantity: row.quantity,
  sku: row.sku ?? undefined,
  title: row.title,
  totalMinorUnits: row.total,
  unitPriceMinorUnits: row.unitPrice,
  variantTitle: row.variantTitle ?? undefined,
})

const ORDER_EMAIL_OUTCOME_ACTIONS: ReadonlySet<string> = new Set([
  AUDIT_LOG_ACTION.EMAIL_DEFERRED,
  AUDIT_LOG_ACTION.EMAIL_FAILED,
  AUDIT_LOG_ACTION.EMAIL_SENT,
])

const parseOrderEmailDelivery = ({ action, metadata }: AdminOrderTimelineRow) =>
  ORDER_EMAIL_OUTCOME_ACTIONS.has(action) ? orderZodSchemas.emailDelivery.safeParse(parseOrderMetadata(metadata)).data : undefined

export const resolveResendableOrderEmails = (newestFirst: readonly AdminOrderTimelineRow[]): ReadonlyMap<string, ResendableOrderEmail> => {
  const settledKeys = new Set<string>()

  return new Map(
    newestFirst.flatMap((row) => {
      const delivery = parseOrderEmailDelivery(row)
      if (delivery === undefined || settledKeys.has(delivery.idempotencyKey)) {
        return []
      }
      settledKeys.add(delivery.idempotencyKey)

      return row.action === AUDIT_LOG_ACTION.EMAIL_SENT
        ? []
        : [[row.id, { detail: row.detail ?? undefined, email: delivery.orderEmail, idempotencyKey: delivery.idempotencyKey }] as const]
    }),
  )
}

export const mapAdminOrderTimeline = (newestFirst: readonly AdminOrderTimelineRow[]): readonly Order["adminOrderDetailTimelineEvent"][] => {
  const resendable = resolveResendableOrderEmails(newestFirst)

  return newestFirst.map((row) => ({
    actorName: row.actorName,
    at: row.createdAt,
    detail: describeAuditLogDetail({ action: row.action, detail: row.detail, metadata: tryParseJsonRecord(row.metadata) }),
    emailStatus: ADMIN_ORDER_TIMELINE_EMAIL_STATUS_BY_ACTION[row.action],
    id: row.id,
    kind: ADMIN_ORDER_TIMELINE_KIND_BY_ACTION[row.action] ?? ADMIN_ORDER_TIMELINE_KIND.ORDER,
    labelKey: ADMIN_ORDER_TIMELINE_LABEL_KEY_BY_ACTION[row.action] ?? row.action,
    resendable: resendable.has(row.id),
    severity: row.severity,
  }))
}

export const describeOrderLocker = ({ code, point }: Readonly<Order["locker"]>): readonly string[] =>
  point === undefined
    ? [code]
    : [code, ...(point.description === undefined ? [] : [point.description]), ...formatInpostLockerAddress(point)]

const describeOrderAddress = (address: Order["adminOrderDetailAddress"] | undefined): readonly (string | undefined)[] =>
  address === undefined
    ? []
    : [address.line1, address.line2, [address.postalCode, address.city].filter((part) => part !== undefined).join(" "), address.countryCode]

export const describeOrderDestination = (row: Readonly<OrderDestinationRow>, locale: string): string | undefined => {
  const locker = resolveOrderLocker({ deliveryType: row.deliveryMethod?.type, lockerId: row.lockerId, lockerPoint: row.lockerPoint })
  const lines =
    locker === undefined
      ? describeOrderAddress(mapAdminOrderDetailAddress(resolveOrderShippingAddressRow(row)))
      : describeOrderLocker(locker)
  const methodName = row.deliveryMethod === null ? undefined : resolveLocalizedString(row.deliveryMethod.names, locale)
  const parts = [methodName, lines.filter((line) => line !== undefined).join(", ")].filter(
    (part): part is string => part !== undefined && part !== "",
  )

  return parts.length === 0 ? undefined : parts.join(": ")
}

export const resolveAdminOrderDeliveryLocker = (delivery: Order["adminOrderDetail"]["delivery"]): Order["locker"] | undefined =>
  delivery?.type === "locker" && delivery.lockerId !== undefined ? { code: delivery.lockerId, point: delivery.lockerPoint } : undefined

export const resolveCustomerAccountOrderStatus = (
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): CustomerAccountOrderStatus => (status === "refunded" ? "refunded" : resolveAdminOrderFulfillmentUiKey(status, fulfillmentStatus))

export const matchesCustomerAccountOrderFilter = (
  filter: CustomerAccountOrderFilter,
  status: Order["select"]["status"],
  fulfillmentStatus: Order["select"]["fulfillmentStatus"],
): boolean => {
  if (filter === "all") {
    return true
  }

  return resolveCustomerAccountOrderStatus(status, fulfillmentStatus) === filter
}

const toOrderAuditChange = (
  metadata: AuditChangeMetadata<object, object> | undefined,
): {
  metadata?: Record<string, unknown>
} => (metadata === undefined ? {} : { metadata: toAuditMetadataRecord(metadata) })

export const buildOrderRefundAuditChange = (
  before: Order["auditSnapshot"],
  after: Order["auditSnapshot"],
): {
  metadata?: Record<string, unknown>
} => toOrderAuditChange(buildAuditChangeMetadata(before, after, ["orderStatus", "paymentStatus", "refundedAmount"]))

export const buildOrderStepBackAuditChange = (
  before: OrderStepSnapshot,
  after: OrderStepSnapshot,
): {
  metadata?: Record<string, unknown>
} => toOrderAuditChange(buildAuditChangeMetadata(before, after, ["fulfillmentStep", "orderStatus"]))

const measureFulfillmentTimeSegment = (segment: string): number[] => {
  const count = FULFILLMENT_TIME_COUNT_PATTERN.exec(segment)?.[0]
  const unit = FULFILLMENT_TIME_UNITS.find((candidate) => candidate.pattern.test(segment))
  if (count === undefined || unit === undefined) {
    return []
  }

  return [Number(count.replace(",", ".")) * unit.calendarDays]
}

const measureFulfillmentTimeInCalendarDays = (time: string): number | undefined => {
  const lengths = time.split(FULFILLMENT_TIME_SEGMENT_START).flatMap((segment) => measureFulfillmentTimeSegment(segment))

  return lengths.length === 0 ? undefined : Math.max(...lengths)
}

export const describeOrderFulfillmentTime = (
  lines: readonly OrderLineFulfillmentTime[],
  messages: typeof orderConfirmationMessages,
): string => {
  const { fallback, note } = messages.fulfillmentTime
  const stated = lines.map((line) => {
    const time = line.time ?? fallback

    return { calendarDays: measureFulfillmentTimeInCalendarDays(time), time, title: line.title }
  })
  const measured = stated.filter((line): line is MeasuredFulfillmentTime => line.calendarDays !== undefined)
  if (measured.length < stated.length) {
    return [...new Set(stated.map((line) => `${line.title}: ${line.time}`)), note].join("\n")
  }

  const [longest] = measured.toSorted((left, right) => right.calendarDays - left.calendarDays)

  return [longest === undefined ? fallback : longest.time, note].join("\n")
}

const HOURS_PER_DAY = 24

const BUSINESS_DAYS_PER_WEEK = 5

const CALENDAR_DAYS_PER_WEEK = 7

const CALENDAR_DAYS_PER_MONTH = 30

const FULFILLMENT_TIME_SEGMENT_START = /(?<![\d.,])(?=\d)/u

const FULFILLMENT_TIME_COUNT_PATTERN = /^\d+(?:[.,]\d+)?/u

const FULFILLMENT_TIME_UNITS = [
  { calendarDays: 1 / HOURS_PER_DAY, pattern: /godz|hour/iu },
  { calendarDays: CALENDAR_DAYS_PER_WEEK, pattern: /tydz|tyg|week/iu },
  { calendarDays: CALENDAR_DAYS_PER_MONTH, pattern: /mies|month/iu },
  { calendarDays: CALENDAR_DAYS_PER_WEEK / BUSINESS_DAYS_PER_WEEK, pattern: /robocz|business|working/iu },
  { calendarDays: 1, pattern: /dzie|dni|day/iu },
] as const
