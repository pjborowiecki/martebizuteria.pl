import { QUERY_KEY_ROOTS } from "~/src/modules/_core/constants/query-keys"

import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants"

export const ADMIN_CUSTOMER_QUERY_STALE_MS = 60_000

export const ADMIN_CUSTOMER_PAGE_SIZE = 25

export const ADMIN_CUSTOMER_DETAIL_ORDERS_LIMIT = 10

export const ADMIN_CUSTOMER_DETAIL_MONTHS = 12

export const ADMIN_CUSTOMER_DETAIL_TAGS = {
  ADMIN: "admin",
  BANNED: "banned",
  CUSTOMER: "customer",
  RETURNING: "returning",
  VERIFIED: "verified",
} as const

export type AdminCustomerDetailTag = (typeof ADMIN_CUSTOMER_DETAIL_TAGS)[keyof typeof ADMIN_CUSTOMER_DETAIL_TAGS]

export const ADMIN_CUSTOMER_ROLE_LABEL_KEYS = {
  admin: "roleAdmin",
  customer: "roleCustomer",
} as const

export const ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS = {
  no: "booleanNo",
  yes: "booleanYes",
} as const

export const ADMIN_CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_WIDTH_PX = 300

export const ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS = "completed" as const

export const ADMIN_CUSTOMER_ORDER_REVENUE_STATUSES = [ADMIN_CUSTOMER_COMPLETED_ORDER_STATUS] as const

export const ADMIN_CUSTOMER_ORDER_COUNTABLE_STATUSES = ["completed", "processing", "pending"] as const

export const ADMIN_CUSTOMER_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow",
} as const

export const ADMIN_CUSTOMER_TABLE_COLUMN_ID = {
  actions: "actions",
  averageOrderValue: "averageOrderValue",
  banned: "banned",
  createdAt: "createdAt",
  customer: "customer",
  emailVerified: "emailVerified",
  lastOrderAt: "lastOrderAt",
  location: "location",
  orderCount: "orderCount",
  phone: "phone",
  recordId: "recordId",
  role: "role",
  select: "select",
  stripeCustomerId: "stripeCustomerId",
  totalSpent: "totalSpent",
} as const

export const ADMIN_CUSTOMER_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId]: false,
  [ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId]: false,
} as const

export const ADMIN_CUSTOMER_TABLE_COLUMN_SIZE = {
  actions: 48,
  averageOrderValue: 200,
  banned: 120,
  createdAt: 160,
  customer: 280,
  emailVerified: 180,
  lastOrderAt: 160,
  location: 240,
  orderCount: 100,
  phone: 140,
  recordId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  role: 110,
  stripeCustomerId: ADMIN_CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_WIDTH_PX,
  totalSpent: 140,
} as const

export const ADMIN_CUSTOMER_TABLE_COLUMN_PINNING = {
  end: [ADMIN_CUSTOMER_TABLE_COLUMN_ID.orderCount, ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent, ADMIN_CUSTOMER_TABLE_COLUMN_ID.actions],
  start: [ADMIN_CUSTOMER_TABLE_COLUMN_ID.select, ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer, ADMIN_CUSTOMER_TABLE_COLUMN_ID.role],
}

export const ADMIN_CUSTOMER_MIN_REPEAT_ORDERS = 2

export const ADMIN_CUSTOMER_STAT_FILTER = {
  RETURNING: "returning",
  TOTAL: "total",
} as const

export type AdminCustomerStatFilter = (typeof ADMIN_CUSTOMER_STAT_FILTER)[keyof typeof ADMIN_CUSTOMER_STAT_FILTER]

export const DEFAULT_ADMIN_CUSTOMER_CURRENCY = "PLN"

export const ADMIN_CUSTOMER_FORM_FIELD_MAX = {
  ADDRESS_LINE: 512,
  CITY: 256,
  COUNTRY_CODE: 2,
  CUSTOM_TAG: 50,
  CUSTOM_TAGS_COUNT: 20,
  NOTES: 4000,
  PHONE: 32,
  POSTAL_CODE: 32,
  PROVINCE: 256,
} as const

export const USER_ERROR_CODES = {
  CANNOT_DELETE_ADMIN: "CANNOT_DELETE_ADMIN",
  CANNOT_DELETE_SELF: "CANNOT_DELETE_SELF",
  NOT_FOUND: "USER_NOT_FOUND",
} as const

export const USER_QUERY_KEYS = {
  ADMIN: {
    CUSTOMERS: [...QUERY_KEY_ROOTS.ADMIN, "users", "customers"] as const,
    CUSTOMERS_PAGE: [...QUERY_KEY_ROOTS.ADMIN, "users", "customers", "page"] as const,
    CUSTOMER_BY_ID: [...QUERY_KEY_ROOTS.ADMIN, "users", "customers", "detail"] as const,
    CUSTOMER_STATS: [...QUERY_KEY_ROOTS.ADMIN, "users", "customers", "stats"] as const,
  },
} as const
