import { createSchemaFactory } from "drizzle-zod"
import zod from "zod/v4"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { dateColumnFilterField, idField, numericColumnFilterField, pageField, pageSizeField } from "~/src/modules/_core/utils/zod-fields"
import { ADMIN_CUSTOMER_DETAIL_TAGS, ADMIN_CUSTOMER_FORM_FIELD_MAX, ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: zod,
})

const userSelectSchema = createSelectSchema(user)

const userInsertSchema = createInsertSchema(user)

const userUpdateSchema = createUpdateSchema(user)

const adminCustomerDetailOrderSchema = zod.object({
  currencyCode: zod.string(),
  date: zod.string(),
  fulfillment: zod.string(),
  id: zod.string(),
  itemTitles: zod.array(zod.string()),
  payment: zod.string(),
  total: zod.string(),
  totalMinor: zod.number(),
})

const adminCustomerCategoryBreakdownSchema = zod.object({
  amount: zod.number(),
  category: zod.string(),
})

const adminCustomerMonthlySpendingSchema = zod.object({
  amount: zod.number(),
  month: zod.string(),
})

const adminCustomerDetailTimelineEventSchema = zod.discriminatedUnion("kind", [
  zod.object({
    date: zod.string(),
    kind: zod.literal("account_created"),
  }),
  zod.object({
    date: zod.string(),
    kind: zod.literal("order_placed"),
    orderId: zod.string(),
    total: zod.string(),
  }),
  zod.object({
    date: zod.string(),
    kind: zod.literal("signed_in"),
  }),
  zod.object({
    date: zod.string(),
    kind: zod.literal("signed_out"),
  }),
  zod.object({
    date: zod.string(),
    kind: zod.literal("cart_item_added"),
    productTitle: zod.string(),
    quantity: zod.number().optional(),
  }),
  zod.object({
    date: zod.string(),
    itemCount: zod.number(),
    kind: zod.literal("cart_abandoned"),
  }),
  zod.object({
    date: zod.string(),
    kind: zod.literal("page_viewed"),
    path: zod.string(),
  }),
])

const adminCustomerAddressFormSchema = zod.object({
  address1: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE),
  address2: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE).optional(),
  city: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.CITY),
  countryCode: zod.union([zod.literal(""), zod.string().length(ADMIN_CUSTOMER_FORM_FIELD_MAX.COUNTRY_CODE)]),
  postalCode: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.POSTAL_CODE).optional(),
  province: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.PROVINCE).optional(),
})

const adminCustomerFormValuesSchema = zod.object({
  address: adminCustomerAddressFormSchema.optional(),
  customTags: zod.array(zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAG)).max(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT),
  notes: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.NOTES).optional(),
  phone: zod.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.PHONE).optional(),
})

const adminCustomerDetailTagSchema = zod.enum([
  ADMIN_CUSTOMER_DETAIL_TAGS.ADMIN,
  ADMIN_CUSTOMER_DETAIL_TAGS.BANNED,
  ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER,
  ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING,
  ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED,
])

const adminCustomersFiltersSchema = zod.object({
  averageOrderValue: numericColumnFilterField.optional(),
  banned: zod.boolean().optional(),
  createdAt: dateColumnFilterField.optional(),
  emailVerified: zod.boolean().optional(),
  lastOrderAt: dateColumnFilterField.optional(),
  role: zod.enum(ROLES).optional(),
  search: zod.string().optional(),
  statFilter: zod.enum(ADMIN_CUSTOMER_STAT_FILTER).optional(),
  totalSpent: numericColumnFilterField.optional(),
})

const adminUserMetadataSchema = zod.object({
  notes: zod.string().optional(),
  tags: zod.array(zod.string()).optional(),
})

const adminCustomerDetailSchema = userSelectSchema.extend({
  address: zod.string().optional(),
  addressForm: adminCustomerAddressFormSchema.optional(),
  averageOrderValue: zod.number(),
  categoryBreakdown: zod.array(adminCustomerCategoryBreakdownSchema),
  customTags: zod.array(zod.string()),
  initials: zod.string(),
  isReturning: zod.boolean(),
  joinDate: zod.string(),
  lastActive: zod.string().optional(),
  lastOrderAt: zod.date().optional(),
  monthlySpending: zod.array(adminCustomerMonthlySpendingSchema),
  notes: zod.string().optional(),
  orderCount: zod.number(),
  orders: zod.array(adminCustomerDetailOrderSchema),
  preferredCategory: zod.string().optional(),
  preferredCollection: zod.string().optional(),
  returningRate: zod.number(),
  roleBadgeKey: zod.enum(["roleAdmin", "roleCustomer", "returning"]),
  tags: zod.array(adminCustomerDetailTagSchema),
  timeline: zod.array(adminCustomerDetailTimelineEventSchema),
  totalSpent: zod.number(),
})

const adminCustomerDetailInputSchema = zod.object({
  id: idField,
  locale: zod.string().optional(),
})

const adminCustomerListItemSchema = userSelectSchema.extend({
  averageOrderValue: zod.number(),
  city: zod.string().optional(),
  countryCode: zod.string().optional(),
  lastOrderAt: zod.date().optional(),
  orderCount: zod.number(),
  province: zod.string().nullish(),
  totalSpent: zod.number(),
})

const adminCustomerStatsSchema = zod.object({
  averageLtv: zod.number(),
  averageProductsPerOrder: zod.number(),
  returningRate: zod.number(),
  total: zod.number(),
})

const adminCustomersPageInputSchema = adminCustomersFiltersSchema.extend({
  page: pageField.optional(),
  pageSize: pageSizeField.optional(),
})

const deleteCustomerInputSchema = zod.object({
  userId: zod.string().nonempty(),
})

const updateAdminCustomerInputSchema = zod.object({
  id: zod.string().nonempty(),
  values: adminCustomerFormValuesSchema,
})

export const userZodSchemas = {
  adminCustomerAddressForm: adminCustomerAddressFormSchema,
  adminCustomerDetail: adminCustomerDetailSchema,
  adminCustomerDetailInput: adminCustomerDetailInputSchema,
  adminCustomerDetailOrder: adminCustomerDetailOrderSchema,
  adminCustomerDetailTimelineEvent: adminCustomerDetailTimelineEventSchema,
  adminCustomerFormValues: adminCustomerFormValuesSchema,
  adminCustomerListItem: adminCustomerListItemSchema,
  adminCustomerStats: adminCustomerStatsSchema,
  adminCustomersExportInput: adminCustomersFiltersSchema,
  adminCustomersPageInput: adminCustomersPageInputSchema,
  adminUserMetadata: adminUserMetadataSchema,
  deleteCustomerInput: deleteCustomerInputSchema,
  insert: userInsertSchema,
  select: userSelectSchema,
  update: userUpdateSchema,
  updateAdminCustomerInput: updateAdminCustomerInputSchema,
}
