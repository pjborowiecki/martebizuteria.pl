import { COUNTRY_CODE_LENGTH } from "~/src/modules/address/address.zod"

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
  email: "email",
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
  averageOrderValue: 220,
  banned: 130,
  createdAt: 180,
  customer: 280,
  email: 240,
  emailVerified: 180,
  lastOrderAt: 180,
  location: 240,
  orderCount: 130,
  phone: 140,
  recordId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  role: 110,
  stripeCustomerId: 300,
  totalSpent: 150,
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
  COUNTRY_CODE: COUNTRY_CODE_LENGTH,
  CUSTOM_TAG: 50,
  CUSTOM_TAGS_COUNT: 20,
  NOTES: 4000,
  ORDER_NUMBER: 32,
  PHONE: 32,
  POSTAL_CODE: 32,
  PROVINCE: 256,
} as const

export const TEAM_CANDIDATE_SEARCH_MIN_LENGTH = 3

export const TEAM_CANDIDATE_SEARCH_MAX_LENGTH = 320

export const TEAM_CANDIDATE_LIMIT = 8

export const TEAM_STAT_FILTER = {
  GOOGLE: "google",
  TWO_FACTOR_OFF: "twoFactorOff",
  TWO_FACTOR_ON: "twoFactorOn",
} as const

export type TeamStatFilter = (typeof TEAM_STAT_FILTER)[keyof typeof TEAM_STAT_FILTER]

export const ADMIN_TEAM_PAGE_SIZE = 25

export const TEAM_TABLE_COLUMN_ID = {
  actions: "actions",
  email: "email",
  lastSignIn: "lastSignIn",
  name: "name",
  signInMethods: "signInMethods",
  twoFactor: "twoFactor",
} as const

export const TEAM_TABLE_COLUMN_SIZE = {
  actions: 48,
  email: 260,
  lastSignIn: 200,
  name: 240,
  signInMethods: 200,
  twoFactor: 140,
} as const

export const TEAM_TABLE_COLUMN_PINNING = {
  end: [TEAM_TABLE_COLUMN_ID.actions],
  start: [TEAM_TABLE_COLUMN_ID.name],
}

export const TEAM_ERROR = {
  ACCOUNT_BANNED: "TEAM_ACCOUNT_BANNED",
  ALREADY_ADMIN: "TEAM_ALREADY_ADMIN",
  EMAIL_NOT_VERIFIED: "TEAM_EMAIL_NOT_VERIFIED",
  LAST_ADMIN: "TEAM_LAST_ADMIN",
  NOT_ADMIN: "TEAM_NOT_ADMIN",
  NOT_FOUND: "TEAM_ACCOUNT_NOT_FOUND",
  OWN_ACCESS: "TEAM_OWN_ACCESS",
} as const

export const CUSTOMER_EMAIL_CHANGE_ERROR = {
  ADDRESS_TAKEN: "CUSTOMER_EMAIL_CHANGE_ADDRESS_TAKEN",
  ADMIN_ACCOUNT: "CUSTOMER_EMAIL_CHANGE_ADMIN_ACCOUNT",
  EMAIL_NOT_SENT: "CUSTOMER_EMAIL_CHANGE_EMAIL_NOT_SENT",
  NOT_FOUND: "CUSTOMER_EMAIL_CHANGE_ACCOUNT_NOT_FOUND",
  NOT_VERIFIED: "CUSTOMER_EMAIL_CHANGE_NOT_VERIFIED",
  TOO_MANY_ATTEMPTS: "CUSTOMER_EMAIL_CHANGE_TOO_MANY_ATTEMPTS",
  UNCHANGED: "CUSTOMER_EMAIL_CHANGE_UNCHANGED",
} as const

export const CUSTOMER_EMAIL_CHANGE_ATTEMPTS = {
  KEY_PREFIX: "customer-email-change:",
  MAX: 5,
  WINDOW_SECONDS: 3600,
} as const

export const USER_ERROR_CODES = {
  CANNOT_DELETE_ADMIN: "CANNOT_DELETE_ADMIN",
  CANNOT_DELETE_SELF: "CANNOT_DELETE_SELF",
  NOT_FOUND: "USER_NOT_FOUND",
  STRIPE_CUSTOMER_NOT_DELETED: "STRIPE_CUSTOMER_NOT_DELETED",
} as const

export const CUSTOMER_ACCOUNT_NAME_MAX_LENGTH = 120

export const CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH = 32

export const USER_QUERY_KEYS = {
  ADMIN: {
    CUSTOMERS: ["admin", "users", "customers"] as const,
    CUSTOMERS_PAGE: ["admin", "users", "customers", "page"] as const,
    CUSTOMER_BY_ID: ["admin", "users", "customers", "detail"] as const,
    CUSTOMER_STATS: ["admin", "users", "customers", "stats"] as const,
    TEAM: ["admin", "users", "team"] as const,
    TEAM_CANDIDATES: ["admin", "users", "team", "candidates"] as const,
  },
  CUSTOMER: {
    PROFILE: ["customer-account", "profile"] as const,
  },
} as const

export const USER_MUTATION_KEYS = {
  DELETE_CUSTOMER: ["user", "deleteCustomer"] as const,
  GRANT_ADMIN_ACCESS: ["user", "grantAdminAccess"] as const,
  REQUEST_CUSTOMER_EMAIL_CHANGE: ["user", "requestCustomerEmailChange"] as const,
  REVOKE_ADMIN_ACCESS: ["user", "revokeAdminAccess"] as const,
  UPDATE_CUSTOMER: ["user", "updateCustomer"] as const,
  UPDATE_CUSTOMER_PHONE: ["customer-account", "updateCustomerPhone"] as const,
  UPDATE_DISPLAY_PREFERENCE: ["user", "updateDisplayPreference"] as const,
} as const
