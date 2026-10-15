import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { INPOST_PARCEL_MAX_WEIGHT_KG } from "~/src/integrations/inpost/inpost.constants"
import { inpostParcelTemplateSchema } from "~/src/integrations/inpost/inpost.zod"
import { CHECKOUT_SESSION_ID_MAX_LENGTH } from "~/src/integrations/stripe/stripe.constants"

import {
  MIN_FIELD_LENGTH,
  dateColumnFilterField,
  idField,
  numericColumnFilterField,
  pageField,
  pageSizeField,
  searchTermField,
  uuidField,
} from "~/src/modules/_core/utils/zod-fields"
import {
  ADMIN_ORDER_ADVANCED_STEPS,
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_STATUSES,
  ADMIN_ORDER_STAT_FILTER,
  ORDER_EMAIL_KIND,
  ORDER_TABS,
  ORDER_TRACKING_NUMBER_MAX_LENGTH,
  ORDER_TRACKING_URL_MAX_LENGTH,
} from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const adminOrdersExportInput = zod.object({
  createdAt: dateColumnFilterField.optional(),
  fulfillment: zod.enum(ADMIN_ORDER_FULFILLMENT_UI_KEY).optional(),
  payment: zod.enum(ADMIN_ORDER_PAYMENT_UI_KEY).optional(),
  search: searchTermField.optional(),
  statFilter: zod.enum(ADMIN_ORDER_STAT_FILTER).optional(),
  status: zod.enum(ADMIN_ORDER_STATUSES).optional(),
  tab: zod.enum(ORDER_TABS).optional(),
  total: numericColumnFilterField.optional(),
  userId: idField.optional(),
})

const adminOrdersPageInput = adminOrdersExportInput.extend({
  page: pageField.optional(),
  pageSize: pageSizeField.optional(),
})

const disputeMetadata = zod.object({
  amount: zod.number(),
  id: zod.string(),
  reason: zod.string(),
  status: zod.string(),
})

const minorUnits = zod.number().int().nonnegative()

const email = zod.discriminatedUnion("kind", [
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.CONFIRMATION) }),
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.NEW_ORDER) }),
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.IN_PROGRESS) }),
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.DELIVERED) }),
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.SHIPPED) }),
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.TRACKING), trackingNumber: zod.string().min(MIN_FIELD_LENGTH) }),
  zod.object({ kind: zod.literal(ORDER_EMAIL_KIND.CANCELLED), refundedAmount: minorUnits.optional() }),
  zod.object({ amount: minorUnits, fullyRefunded: zod.boolean(), kind: zod.literal(ORDER_EMAIL_KIND.REFUNDED), refundedTotal: minorUnits }),
])

export const orderZodSchemas = {
  adminCreateInpostShipmentInput: zod.object({
    orderId: uuidField,
    parcelTemplate: inpostParcelTemplateSchema,
    weightKg: zod.number().positive().max(INPOST_PARCEL_MAX_WEIGHT_KG).optional(),
  }),
  adminOrderIdInput: zod.object({
    orderId: uuidField,
  }),
  adminOrdersExportInput,
  adminOrdersPageInput,
  adminRefundOrderInput: zod.object({
    orderId: uuidField,
    restock: zod.boolean(),
  }),
  adminResendOrderEmailInput: zod.object({
    eventId: uuidField,
    orderId: uuidField,
  }),
  adminSetTrackingNumberInput: zod.object({
    orderId: uuidField,
    trackingNumber: zod.string().trim().min(MIN_FIELD_LENGTH).max(ORDER_TRACKING_NUMBER_MAX_LENGTH),
    trackingUrl: zod.url().max(ORDER_TRACKING_URL_MAX_LENGTH).optional(),
  }),
  adminShipOrderInput: zod.object({
    orderId: uuidField,
    trackingNumber: zod.string().trim().max(ORDER_TRACKING_NUMBER_MAX_LENGTH).optional(),
    trackingUrl: zod.url().max(ORDER_TRACKING_URL_MAX_LENGTH).optional().or(zod.literal("")),
  }),
  adminStepBackOrderInput: zod.object({
    fromStep: zod.enum(ADMIN_ORDER_ADVANCED_STEPS),
    orderId: uuidField,
  }),
  disputeMetadata,
  email,
  emailDelivery: zod.object({ idempotencyKey: zod.string().min(MIN_FIELD_LENGTH), orderEmail: email }),
  insert: createInsertSchema(order),
  metadata: zod.record(zod.string(), zod.unknown()),
  orderConfirmationInput: zod.object({
    sessionId: zod.string().trim().min(MIN_FIELD_LENGTH).max(CHECKOUT_SESSION_ID_MAX_LENGTH),
  }),
  select: createSelectSchema(order),
  update: createUpdateSchema(order),
}
