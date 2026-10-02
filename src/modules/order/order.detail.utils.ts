import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
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
import { parseOrderMetadata } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

export const resolveAdminOrderDispute = (metadata: string | null | undefined): Order["disputeMetadata"] | undefined =>
  orderZodSchemas.disputeMetadata.safeParse(parseOrderMetadata(metadata)["dispute"]).data

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
    line2: row.address2 ?? undefined,
    name: name === "" ? EMPTY_VALUE : name,
    phone: row.phone ?? undefined,
    postalCode: row.postalCode ?? undefined,
    province: row.province ?? undefined,
  }
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

export const resolveAdminOrderDetailAddresses = ({
  addresses,
  checkout,
}: AdminOrderAddressSources): Pick<Order["adminOrderDetail"], "billingAddress" | "billingSameAsShipping" | "shippingAddress"> => {
  const billingSnapshot = addresses.find((row) => row.type === "billing")
  const shippingSnapshot = addresses.find((row) => row.type === "shipping")
  const placedBeforeSnapshots = addresses.length === 0

  return {
    billingAddress: mapAdminOrderDetailAddress(billingSnapshot ?? checkout?.billingAddress),
    billingSameAsShipping: placedBeforeSnapshots
      ? checkout !== null && checkout.billingAddressId !== null && checkout.billingAddressId === checkout.shippingAddressId
      : billingSnapshot !== undefined && shippingSnapshot !== undefined && isSameAdminOrderAddress(billingSnapshot, shippingSnapshot),
    shippingAddress: mapAdminOrderDetailAddress(shippingSnapshot ?? checkout?.shippingAddress),
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

const resolveFulfillmentStepDone = (key: AdminOrderFulfillmentStepKey, snapshot: AdminOrderFulfillmentSnapshot): boolean => {
  if (key === "confirmed") {
    return snapshot.status !== "pending"
  }

  if (key === "processing") {
    return snapshot.fulfillmentStartedAt !== undefined || snapshot.shippedAt !== null || snapshot.deliveredAt !== null
  }

  if (key === "shipped") {
    return snapshot.shippedAt !== null || snapshot.deliveredAt !== null
  }

  return snapshot.deliveredAt !== null
}

const resolveFulfillmentStepAt = (key: AdminOrderFulfillmentStepKey, snapshot: AdminOrderFulfillmentSnapshot): Date | undefined => {
  if (key === "confirmed") {
    return snapshot.status === "pending" ? undefined : snapshot.createdAt
  }

  if (key === "processing") {
    return snapshot.fulfillmentStartedAt
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

  return ADMIN_ORDER_FULFILLMENT_STEPS.map((key) => ({
    at: resolveFulfillmentStepAt(key, snapshot),
    done: resolveFulfillmentStepDone(key, snapshot),
    key,
  }))
}

export const mapAdminOrderTimeline = (rows: readonly AdminOrderTimelineRow[]): readonly Order["adminOrderDetailTimelineEvent"][] =>
  rows.map((row) => ({
    actorName: row.actorName,
    at: row.createdAt,
    detail: row.detail === null || row.detail.trim() === "" ? undefined : row.detail,
    emailStatus: ADMIN_ORDER_TIMELINE_EMAIL_STATUS_BY_ACTION[row.action],
    id: row.id,
    kind: ADMIN_ORDER_TIMELINE_KIND_BY_ACTION[row.action] ?? ADMIN_ORDER_TIMELINE_KIND.ORDER,
    labelKey: ADMIN_ORDER_TIMELINE_LABEL_KEY_BY_ACTION[row.action] ?? row.action,
    severity: row.severity,
  }))

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

  if (snapshot.hasDispute) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.DISPUTED)
  }

  if (snapshot.paymentStatus === "refunded") {
    tags.push(ADMIN_ORDER_DETAIL_TAG.REFUNDED)
  } else if (snapshot.refundedAmount > 0) {
    tags.push(ADMIN_ORDER_DETAIL_TAG.PARTIALLY_REFUNDED)
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

interface AdminOrderTimelineRow {
  readonly action: string
  readonly actorName: string
  readonly createdAt: Date
  readonly detail: string | null
  readonly id: string
  readonly severity: AuditLogSeverity
}

export interface AdminOrderFulfillmentSnapshot {
  readonly canceledAt: Date | null
  readonly createdAt: Date
  readonly deliveredAt: Date | null
  readonly fulfillmentStartedAt: Date | undefined
  readonly shippedAt: Date | null
  readonly status: Order["select"]["status"]
}

interface AdminOrderTagSnapshot {
  readonly customerOrderCount: number
  readonly deliveryType: DeliveryMethodType | undefined
  readonly hasCustomerNote: boolean
  readonly hasDispute: boolean
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
