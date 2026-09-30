import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import {
  dateColumnFilterField,
  numericColumnFilterField,
  pageField,
  pageSizeField,
  searchTermField,
  uuidField,
} from "~/src/modules/_core/utils/zod-fields"
import {
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_STATUSES,
  ADMIN_ORDER_STAT_FILTER,
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

export const orderZodSchemas = {
  adminOrderIdInput: zod.object({
    orderId: uuidField,
  }),
  adminOrdersExportInput,
  adminOrdersPageInput,
  adminShipOrderInput: zod.object({
    orderId: uuidField,
    trackingNumber: zod.string().trim().max(ORDER_TRACKING_NUMBER_MAX_LENGTH).optional(),
    trackingUrl: zod.url().max(ORDER_TRACKING_URL_MAX_LENGTH).optional().or(zod.literal("")),
  }),
  disputeMetadata,
  insert: createInsertSchema(order),
  metadata: zod.record(zod.string(), zod.unknown()),
  select: createSelectSchema(order),
  update: createUpdateSchema(order),
}
