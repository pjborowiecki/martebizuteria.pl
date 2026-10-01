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

export const ADMIN_DISCOUNT_TABLE_COLUMN_ID = {
  actions: "actions",
  code: "code",
  endsAt: "endsAt",
  select: "select",
  status: "status",
  type: "type",
  usage: "usage",
  value: "value",
} as const

export const DISCOUNT_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled",
  EXHAUSTED: "exhausted",
  EXPIRED: "expired",
  SCHEDULED: "scheduled",
} as const

export type DiscountStatus = (typeof DISCOUNT_STATUS)[keyof typeof DISCOUNT_STATUS]

export const DISCOUNT_STATUS_BADGE_STYLES: Record<DiscountStatus, DiscountBadgeStyle> = {
  active: { className: "bg-emerald-600 hover:bg-emerald-700", variant: "default" },
  disabled: { variant: "secondary" },
  exhausted: { variant: "secondary" },
  expired: { variant: "destructive" },
  scheduled: { className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400", variant: "outline" },
}

export interface DiscountBadgeStyle {
  readonly className?: string
  readonly variant: "default" | "destructive" | "outline" | "secondary"
}
