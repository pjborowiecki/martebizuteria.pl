import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants"

export const DISCOUNT_TYPES = ["percentage", "fixed_amount", "free_shipping"] as const

export type DiscountType = (typeof DISCOUNT_TYPES)[number]

export const DISCOUNT_TYPE = {
  FIXED_AMOUNT: "fixed_amount",
  FREE_SHIPPING: "free_shipping",
  PERCENTAGE: "percentage",
} as const satisfies Record<string, DiscountType>

export const DISCOUNT_PERCENTAGE_MAX = 100

export const DISCOUNT_CODE_MIN_LENGTH = 3

export const DISCOUNT_CODE_MAX_LENGTH = 32

export const DISCOUNT_DESCRIPTION_MAX_LENGTH = 512

export const ADMIN_DISCOUNTS_PAGE_SIZE = 25

export const DISCOUNT_QUERY_STALE_MS = 60_000

export const DISCOUNT_REJECTION = {
  ALREADY_USED: "alreadyUsed",
  EXHAUSTED: "exhausted",
  EXPIRED: "expired",
  HELD: "held",
  INACTIVE: "inactive",
  MIN_ORDER_NOT_MET: "minOrderNotMet",
  NOT_FOUND: "notFound",
  NOT_STARTED: "notStarted",
} as const

export type DiscountRejection = (typeof DISCOUNT_REJECTION)[keyof typeof DISCOUNT_REJECTION]

export const DISCOUNT_ERROR_CODES = {
  CODE_TAKEN: "DISCOUNT_CODE_TAKEN",
  NOT_FOUND: "DISCOUNT_NOT_FOUND",
} as const

export const DISCOUNT_QUERY_KEYS = {
  ADMIN: {
    ALL: ["admin", "discounts"] as const,
    PAGE: ["admin", "discounts", "page"] as const,
    STATS: ["admin", "discounts", "stats"] as const,
  },
  VALIDATION: ["discount", "validate"] as const,
} as const

export const DISCOUNT_MUTATION_KEYS = {
  CREATE: ["discount", "createDiscount"] as const,
  DELETE: ["discount", "deleteDiscounts"] as const,
  UPDATE: ["discount", "updateDiscount"] as const,
  VALIDATE: ["discount", "validateDiscountCode"] as const,
} as const

export const DISCOUNT_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled",
  EXHAUSTED: "exhausted",
  EXPIRED: "expired",
  SCHEDULED: "scheduled",
} as const

export type DiscountStatus = (typeof DISCOUNT_STATUS)[keyof typeof DISCOUNT_STATUS]

export const DISCOUNT_STATUSES = [
  DISCOUNT_STATUS.ACTIVE,
  DISCOUNT_STATUS.SCHEDULED,
  DISCOUNT_STATUS.EXPIRED,
  DISCOUNT_STATUS.EXHAUSTED,
  DISCOUNT_STATUS.DISABLED,
] as const

export const ADMIN_DISCOUNT_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow",
} as const

export const ADMIN_DISCOUNT_TABLE_COLUMN_ID = {
  actions: "actions",
  code: "code",
  createdAt: "createdAt",
  endsAt: "endsAt",
  minOrder: "minOrder",
  recordId: "recordId",
  select: "select",
  startsAt: "startsAt",
  status: "status",
  type: "type",
  usage: "usage",
  value: "value",
} as const

export const ADMIN_DISCOUNT_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [ADMIN_DISCOUNT_TABLE_COLUMN_ID.recordId]: false,
  [ADMIN_DISCOUNT_TABLE_COLUMN_ID.startsAt]: false,
} as const

export const ADMIN_DISCOUNT_TABLE_COLUMN_SIZE = {
  actions: 48,
  code: 210,
  createdAt: 140,
  endsAt: 140,
  minOrder: 180,
  recordId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  startsAt: 140,
  status: 130,
  type: 130,
  usage: 140,
  value: 110,
} as const

export const ADMIN_DISCOUNT_TABLE_COLUMN_PINNING = {
  end: [ADMIN_DISCOUNT_TABLE_COLUMN_ID.actions],
  start: [ADMIN_DISCOUNT_TABLE_COLUMN_ID.select, ADMIN_DISCOUNT_TABLE_COLUMN_ID.code],
}
