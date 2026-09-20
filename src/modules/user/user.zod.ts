import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { ADMIN_CUSTOMER_DETAIL_TAGS, ADMIN_CUSTOMER_FORM_FIELD_MAX } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

const userSelectSchema = createSelectSchema(user)

const adminCustomerDetailOrderSchema = z.object({
  currencyCode: z.string(),
  date: z.string(),
  fulfillment: z.string(),
  id: z.string(),
  itemTitles: z.array(z.string()),
  payment: z.string(),
  total: z.string(),
  totalMinor: z.number(),
})

const adminCustomerCategoryBreakdownSchema = z.object({
  amount: z.number(),
  category: z.string(),
})

const adminCustomerMonthlySpendingSchema = z.object({
  amount: z.number(),
  month: z.string(),
})

const adminCustomerDetailTimelineEventSchema = z.discriminatedUnion("kind", [
  z.object({
    date: z.string(),
    kind: z.literal("account_created"),
  }),
  z.object({
    date: z.string(),
    kind: z.literal("order_placed"),
    orderId: z.string(),
    total: z.string(),
  }),
  z.object({
    date: z.string(),
    kind: z.literal("signed_in"),
  }),
  z.object({
    date: z.string(),
    kind: z.literal("signed_out"),
  }),
  z.object({
    date: z.string(),
    kind: z.literal("cart_item_added"),
    productTitle: z.string(),
    quantity: z.number().optional(),
  }),
  z.object({
    date: z.string(),
    itemCount: z.number(),
    kind: z.literal("cart_abandoned"),
  }),
  z.object({
    date: z.string(),
    kind: z.literal("page_viewed"),
    path: z.string(),
  }),
])

const adminCustomerAddressFormSchema = z.object({
  address1: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE),
  address2: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE).optional(),
  city: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.CITY),
  countryCode: z.union([z.literal(""), z.string().length(ADMIN_CUSTOMER_FORM_FIELD_MAX.COUNTRY_CODE)]),
  postalCode: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.POSTAL_CODE).optional(),
  province: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.PROVINCE).optional(),
})

const adminCustomerFormValuesSchema = z.object({
  address: adminCustomerAddressFormSchema.optional(),
  customTags: z.array(z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAG)).max(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT),
  notes: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.NOTES).optional(),
  phone: z.string().max(ADMIN_CUSTOMER_FORM_FIELD_MAX.PHONE).optional(),
})

const adminCustomerDetailTagSchema = z.enum([
  ADMIN_CUSTOMER_DETAIL_TAGS.ADMIN,
  ADMIN_CUSTOMER_DETAIL_TAGS.BANNED,
  ADMIN_CUSTOMER_DETAIL_TAGS.CUSTOMER,
  ADMIN_CUSTOMER_DETAIL_TAGS.RETURNING,
  ADMIN_CUSTOMER_DETAIL_TAGS.VERIFIED,
])

export const userZodSchemas = {
  adminCustomerAddressForm: adminCustomerAddressFormSchema,
  adminCustomerDetail: userSelectSchema.extend({
    address: z.string().optional(),
    addressForm: adminCustomerAddressFormSchema.optional(),
    averageOrderValue: z.number(),
    categoryBreakdown: z.array(adminCustomerCategoryBreakdownSchema),
    customTags: z.array(z.string()),
    initials: z.string(),
    isReturning: z.boolean(),
    joinDate: z.string(),
    lastActive: z.string().optional(),
    lastOrderAt: z.date().optional(),
    monthlySpending: z.array(adminCustomerMonthlySpendingSchema),
    notes: z.string().optional(),
    orderCount: z.number(),
    orders: z.array(adminCustomerDetailOrderSchema),
    preferredCategory: z.string().optional(),
    preferredCollection: z.string().optional(),
    returningRate: z.number(),
    roleBadgeKey: z.enum(["roleAdmin", "roleCustomer", "returning"]),
    tags: z.array(adminCustomerDetailTagSchema),
    timeline: z.array(adminCustomerDetailTimelineEventSchema),
    totalSpent: z.number(),
  }),
  adminCustomerDetailOrder: adminCustomerDetailOrderSchema,
  adminCustomerDetailTimelineEvent: adminCustomerDetailTimelineEventSchema,
  adminCustomerFormValues: adminCustomerFormValuesSchema,
  adminCustomerListItem: userSelectSchema.extend({
    averageOrderValue: z.number(),
    city: z.string().optional(),
    countryCode: z.string().optional(),
    lastOrderAt: z.date().optional(),
    orderCount: z.number(),
    province: z.string().nullish(),
    totalSpent: z.number(),
  }),
  adminCustomerStats: z.object({
    averageLtv: z.number(),
    averageProductsPerOrder: z.number(),
    returningRate: z.number(),
    total: z.number(),
  }),
  deleteCustomerInput: z.object({
    userId: z.string().nonempty(),
  }),
  insert: createInsertSchema(user),
  select: userSelectSchema,
  update: createUpdateSchema(user),
  updateAdminCustomerInput: z.object({
    id: z.string().nonempty(),
    values: adminCustomerFormValuesSchema,
  }),
}
