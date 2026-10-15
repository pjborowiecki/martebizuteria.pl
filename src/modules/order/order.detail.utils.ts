import { formatInpostLockerAddress, parseInpostLockerPoint } from "~/src/integrations/inpost/inpost.utils"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { tryParseJsonRecord } from "~/src/modules/_core/utils/json"
import { AUDIT_LOG_ACTION, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { describeAuditLogDetail } from "~/src/modules/audit-log/audit-log.detail.utils"
import { type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import {
  ADMIN_ORDER_DETAIL_RETURNING_MIN_ORDERS,
  ADMIN_ORDER_DETAIL_TAG,
  ADMIN_ORDER_FULFILLMENT_STEPS,
  ADMIN_ORDER_TIMELINE_EMAIL_STATUS_BY_ACTION,
  ADMIN_ORDER_TIMELINE_KIND,
  ADMIN_ORDER_TIMELINE_KIND_BY_ACTION,
  ADMIN_ORDER_TIMELINE_LABEL_KEY_BY_ACTION,
  type AdminOrderDetailTag,
  type AdminOrderFulfillmentStepKey,
} from "~/src/modules/order/order.constants"
import { parseOrderMetadata, resolveAdminOrderFulfillmentUiKey } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

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

const resolveFulfillmentStepAt = (key: AdminOrderFulfillmentStepKey, snapshot: AdminOrderFulfillmentSnapshot): Date | undefined => {
  if (key === "confirmed") {
    return snapshot.createdAt
  }

  if (key === "processing") {
    return snapshot.fulfillmentStartedAt ?? undefined
  }

  if (key === "shipped") {
    return snapshot.shippedAt ?? undefined
  }

  return snapshot.deliveredAt ?? undefined
}

export const buildAdminOrderFulfillmentSteps = (snapshot: AdminOrderFulfillmentSnapshot): Order["adminOrderDetail"]["fulfillmentSteps"] => {
  if (snapshot.canceledAt !== null) {
    return []
  }

  const reached = (ADMIN_ORDER_FULFILLMENT_STEPS as readonly string[]).indexOf(
    resolveAdminOrderFulfillmentUiKey(snapshot.status, snapshot.fulfillmentStatus),
  )

  return ADMIN_ORDER_FULFILLMENT_STEPS.map((key, index) => ({
    at: index <= reached ? resolveFulfillmentStepAt(key, snapshot) : undefined,
    done: index <= reached,
    key,
  }))
}

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

export const resolveAdminOrderDetailTags = (snapshot: AdminOrderTagSnapshot): readonly AdminOrderDetailTag[] => {
  const tags: AdminOrderDetailTag[] = []

  if (snapshot.userId === null) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.GUEST)
  } else if (snapshot.customerOrderCount >= ADMIN_ORDER_DETAIL_RETURNING_MIN_ORDERS) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.RETURNING)
  }

  if (snapshot.deliveryType === "locker") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.LOCKER)
  } else if (snapshot.deliveryType === "in_store") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.IN_STORE)
  }

  if (snapshot.lockerUnconfirmed) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.LOCKER_UNCONFIRMED)
  }

  if (snapshot.hasDispute) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.DISPUTED)
  }

  if (snapshot.paymentStatus === "refunded") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.REFUNDED)
  } else if (snapshot.refundedAmount > 0) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.PARTIALLY_REFUNDED)
  }

  if (snapshot.awaitsRestock) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.NOT_RESTOCKED)
  }

  if (snapshot.hasCustomerNote) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.NOTE)
  }

  return tags
}

export const resolveAdminOrderCustomerName = (name: string | null | undefined, email: string): string => {
  const trimmed = name?.trim()

  return trimmed === undefined || trimmed === "" ? email : trimmed
}

export const buildAdminOrderDetailCustomer = (snapshot: AdminOrderCustomerSnapshot): Order["adminOrderDetail"]["customer"] => {
  const name = resolveAdminOrderCustomerName(snapshot.name, snapshot.email)

  return {
    email: snapshot.email,
    initials: resolveAdminCustomerInitials(name),
    name,
    orderCount: snapshot.orderCount,
    phone: snapshot.phone ?? undefined,
    totalSpentMinorUnits: snapshot.totalSpent,
    userId: snapshot.userId ?? undefined,
  }
}

export const describeOrderLocker = ({ code, point }: Readonly<Order["locker"]>): readonly string[] =>
  point === undefined
    ? [code]
    : [code, ...(point.description === undefined ? [] : [point.description]), ...formatInpostLockerAddress(point)]

const describeOrderAddress = (address: Order["adminOrderDetailAddress"] | undefined): readonly (string | undefined)[] =>
  address === undefined
    ? []
    : [address.line1, address.line2, [address.postalCode, address.city].filter((part) => part !== undefined).join(" "), address.countryCode]

export const describeOrderDestination = (row: Readonly<OrderDestinationRow>): string | undefined => {
  const locker = resolveOrderLocker({ deliveryType: row.deliveryMethod?.type, lockerId: row.lockerId, lockerPoint: row.lockerPoint })
  const lines =
    locker === undefined
      ? describeOrderAddress(mapAdminOrderDetailAddress(resolveOrderShippingAddressRow(row)))
      : describeOrderLocker(locker)
  const parts = [row.deliveryMethod?.name, lines.filter((line) => line !== undefined).join(", ")].filter(
    (part): part is string => part !== undefined && part !== "",
  )

  return parts.length === 0 ? undefined : parts.join(": ")
}

export const resolveAdminOrderDeliveryLocker = (delivery: Order["adminOrderDetail"]["delivery"]): Order["locker"] | undefined =>
  delivery?.type === "locker" && delivery.lockerId !== undefined ? { code: delivery.lockerId, point: delivery.lockerPoint } : undefined

interface OrderDestinationRow extends OrderShippingAddressSources {
  readonly deliveryMethod: { readonly name: string; readonly type: DeliveryMethodType } | null
  readonly lockerId: string | null
  readonly lockerPoint: string | null
}

interface OrderLockerSource {
  readonly deliveryType: DeliveryMethodType | undefined
  readonly lockerId: string | null
  readonly lockerPoint: string | null
}

interface AdminOrderAddressRow {
  readonly address1: string
  readonly address2: string | null
  readonly city: string
  readonly countryCode: string
  readonly firstName: string | null
  readonly lastName: string | null
  readonly phone: string | null
  readonly postalCode: string | null
  readonly province: string | null
}

interface AdminOrderAddressSnapshotRow extends AdminOrderAddressRow {
  readonly type: "billing" | "shipping"
}

interface AdminOrderCheckoutAddresses {
  readonly billingAddress: AdminOrderAddressRow | null
  readonly billingAddressId: string | null
  readonly shippingAddress: AdminOrderAddressRow | null
  readonly shippingAddressId: string | null
}

interface AdminOrderAddressSources {
  readonly addresses: readonly AdminOrderAddressSnapshotRow[]
  readonly checkout: AdminOrderCheckoutAddresses | null
}

interface OrderShippingAddressSources {
  readonly addresses: readonly AdminOrderAddressSnapshotRow[]
  readonly checkout: Pick<AdminOrderCheckoutAddresses, "shippingAddress"> | null
}

interface AdminOrderItemRow {
  readonly id: string
  readonly productHandle: string | null
  readonly quantity: number
  readonly sku: string | null
  readonly thumbnail: string | null
  readonly title: string
  readonly total: number
  readonly unitPrice: number
  readonly variantTitle: string | null
}

interface ResendableOrderEmail {
  readonly detail: string | undefined
  readonly email: Order["email"]
  readonly idempotencyKey: string
}

interface AdminOrderTimelineRow {
  readonly action: string
  readonly actorName: string
  readonly createdAt: Date
  readonly detail: string | null
  readonly id: string
  readonly metadata: string | null
  readonly severity: AuditLogSeverity
}

export interface AdminOrderFulfillmentSnapshot {
  readonly canceledAt: Date | null
  readonly createdAt: Date
  readonly deliveredAt: Date | null
  readonly fulfillmentStartedAt: Date | null
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly shippedAt: Date | null
  readonly status: Order["select"]["status"]
}

interface AdminOrderTagSnapshot {
  readonly awaitsRestock: boolean
  readonly customerOrderCount: number
  readonly deliveryType: DeliveryMethodType | undefined
  readonly hasCustomerNote: boolean
  readonly hasDispute: boolean
  readonly lockerUnconfirmed: boolean
  readonly paymentStatus: string | undefined
  readonly refundedAmount: number
  readonly userId: string | null
}

interface AdminOrderCustomerSnapshot {
  readonly email: string
  readonly name: string | null | undefined
  readonly orderCount: number
  readonly phone: string | null | undefined
  readonly totalSpent: number
  readonly userId: string | null
}
