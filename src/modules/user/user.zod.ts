import zod from "zod/v4"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { emailSchema } from "~/src/integrations/better-auth/auth.zod"
import { isTimeZone, toFormatLocale } from "~/src/integrations/use-intl/i18n.display"

import { dateColumnFilterField, idField, numericColumnFilterField, pageField, pageSizeField } from "~/src/modules/_core/utils/zod-fields"
import {
  ADMIN_CUSTOMER_DETAIL_TAGS,
  ADMIN_CUSTOMER_FORM_FIELD_MAX,
  ADMIN_CUSTOMER_STAT_FILTER,
  CUSTOMER_ACCOUNT_NAME_MAX_LENGTH,
  CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH,
  CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH,
  CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH,
  TEAM_CANDIDATE_SEARCH_MAX_LENGTH,
  TEAM_CANDIDATE_SEARCH_MIN_LENGTH,
} from "~/src/modules/user/user.constants"

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
    orderNumber: zod.string(),
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
  zod.object({
    date: zod.string(),
    from: zod.string().optional(),
    kind: zod.literal("email_changed"),
    to: zod.string().optional(),
  }),
])

const adminCustomerEmailChangeSchema = zod.object({ from: zod.string(), to: zod.string() })

const adminCustomerEmailHistoryEntrySchema = zod.object({
  addedOn: zod.string(),
  email: zod.string(),
  replacedOn: zod.string().optional(),
})

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

const adminCustomerDetailSchema = zod.object({
  address: zod.string().optional(),
  addressForm: adminCustomerAddressFormSchema.optional(),
  averageOrderValue: zod.number(),
  categoryBreakdown: zod.array(adminCustomerCategoryBreakdownSchema),
  customTags: zod.array(zod.string()),
  emailHistory: zod.array(adminCustomerEmailHistoryEntrySchema),
  initials: zod.string(),
  isReturning: zod.boolean(),
  joinDate: zod.string(),
  lastActive: zod.string().optional(),
  lastOrderAt: zod.date().optional(),
  monthlySpending: zod.array(adminCustomerMonthlySpendingSchema),
  notes: zod.string().optional(),
  orderCount: zod.number(),
  preferredCategory: zod.string().optional(),
  preferredCollection: zod.string().optional(),
  returningRate: zod.number(),
  roleBadgeKey: zod.enum(["roleAdmin", "roleCustomer", "returning"]),
  signedInOrderCount: zod.number(),
  tags: zod.array(adminCustomerDetailTagSchema),
  timeline: zod.array(adminCustomerDetailTimelineEventSchema),
  totalSpent: zod.number(),
})

const adminCustomerDetailInputSchema = zod.object({
  id: idField,
  locale: zod.string().optional(),
})

const adminCustomerListItemSchema = zod.object({
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

const automaticDisplayPreferenceSchema = zod.literal("")

const formatLocaleSchema = zod.string().refine((value) => toFormatLocale(value) === value, { message: "Unsupported format locale" })

const timeZoneSchema = zod.string().refine((value) => isTimeZone(value), { message: "Unknown time zone" })

const formatLocalePreferenceSchema = zod.object({
  preference: zod.literal("formatLocale"),
  value: zod.union([automaticDisplayPreferenceSchema, formatLocaleSchema]),
})

const timeZonePreferenceSchema = zod.object({
  preference: zod.literal("timeZone"),
  value: zod.union([automaticDisplayPreferenceSchema, timeZoneSchema]),
})

const displayPreferenceInputSchema = zod.discriminatedUnion("preference", [formatLocalePreferenceSchema, timeZonePreferenceSchema])

const updateAdminCustomerInputSchema = zod.object({
  id: zod.string().nonempty(),
  values: adminCustomerFormValuesSchema,
})

const teamAccessInputSchema = zod.object({ userId: idField })

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

const customerEmailChangeFormSchema = zod.object({
  newEmail: emailSchema,
  orderNumber: zod
    .string()
    .trim()
    .regex(LETTER_OR_DIGIT, "orderNumberRequired")
    .max(ADMIN_CUSTOMER_FORM_FIELD_MAX.ORDER_NUMBER, "orderNumberMaxLength"),
  postalCode: zod
    .string()
    .trim()
    .regex(LETTER_OR_DIGIT, "postalCodeRequired")
    .max(ADMIN_CUSTOMER_FORM_FIELD_MAX.POSTAL_CODE, "postalCodeMaxLength"),
})

const customerEmailChangeInputSchema = customerEmailChangeFormSchema.extend({ userId: idField })

const teamCandidateSearchInputSchema = zod.object({
  search: zod.string().trim().min(TEAM_CANDIDATE_SEARCH_MIN_LENGTH).max(TEAM_CANDIDATE_SEARCH_MAX_LENGTH),
})

const cartItemAddedPayloadSchema = zod.object({
  kind: zod.literal("cart_item_added"),
  productTitle: zod.string().max(CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH),
  quantity: zod.number().int().positive(),
  variantId: zod.string().max(CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH),
  variantTitle: zod.string().max(CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH).optional(),
})

const cartAbandonedPayloadSchema = zod.object({
  itemCount: zod.number().int().nonnegative(),
  kind: zod.literal("cart_abandoned"),
  lineCount: zod.number().int().nonnegative(),
})

const pageViewedPayloadSchema = zod.object({
  kind: zod.literal("page_viewed"),
  path: zod.string().max(CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH),
})

const CLOSE_ACCOUNT_CONFIRMATION = "delete"

export const closeAccountFormSchema = (hasPassword: boolean) =>
  zod.object({
    confirmation: zod.string().refine((value) => value.trim().toLowerCase() === CLOSE_ACCOUNT_CONFIRMATION, "confirmationMismatch"),
    password: hasPassword ? zod.string().min(1, "passwordRequired") : zod.string(),
  })

export type CloseAccountFormValues = zod.infer<ReturnType<typeof closeAccountFormSchema>>

export const userZodSchemas = {
  adminCustomerAddressForm: adminCustomerAddressFormSchema,
  adminCustomerDetail: adminCustomerDetailSchema,
  adminCustomerDetailInput: adminCustomerDetailInputSchema,
  adminCustomerDetailTimelineEvent: adminCustomerDetailTimelineEventSchema,
  adminCustomerEmailChange: adminCustomerEmailChangeSchema,
  adminCustomerFormValues: adminCustomerFormValuesSchema,
  adminCustomerListItem: adminCustomerListItemSchema,
  adminCustomerStats: adminCustomerStatsSchema,
  adminCustomersExportInput: adminCustomersFiltersSchema,
  adminCustomersPageInput: adminCustomersPageInputSchema,
  adminUserMetadata: adminUserMetadataSchema,
  customerActivityRecordInput: zod.discriminatedUnion("kind", [
    cartItemAddedPayloadSchema,
    cartAbandonedPayloadSchema,
    pageViewedPayloadSchema,
  ]),
  customerEmailChangeForm: customerEmailChangeFormSchema,
  customerEmailChangeInput: customerEmailChangeInputSchema,
  customerPhoneInput: zod.object({
    phone: zod.string().trim().max(CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH),
  }),
  customerProfileForm: zod.object({
    name: zod.string().trim().min(1, "nameRequired").max(CUSTOMER_ACCOUNT_NAME_MAX_LENGTH, "nameMaxLength"),
    phone: zod.string().trim().max(CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH, "phoneMaxLength"),
  }),
  deleteCustomerInput: deleteCustomerInputSchema,
  displayPreferenceInput: displayPreferenceInputSchema,
  teamAccessInput: teamAccessInputSchema,
  teamCandidateSearchInput: teamCandidateSearchInputSchema,
  updateAdminCustomerInput: updateAdminCustomerInputSchema,
}
