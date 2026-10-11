export const ORDER_WITHDRAWAL_PERIOD_DAYS = 14

export const ORDER_WITHDRAWAL_SCOPES = ["order", "items"] as const

export type OrderWithdrawalScope = (typeof ORDER_WITHDRAWAL_SCOPES)[number]

export const ORDER_WITHDRAWAL_SCOPE = {
  ITEMS: "items",
  ORDER: "order",
} as const satisfies Record<string, OrderWithdrawalScope>

export const ORDER_WITHDRAWAL_OUTCOME = {
  ALREADY_WITHDRAWN: "alreadyWithdrawn",
  CLOSED: "closed",
  NOT_FOUND: "notFound",
  RECORDED: "recorded",
} as const

export type OrderWithdrawalRejection = Exclude<
  (typeof ORDER_WITHDRAWAL_OUTCOME)[keyof typeof ORDER_WITHDRAWAL_OUTCOME],
  typeof ORDER_WITHDRAWAL_OUTCOME.RECORDED
>

export const WITHDRAWABLE_ORDER_STATUSES = ["processing", "completed"] as const

export const ORDER_WITHDRAWAL_NAME_MAX_LENGTH = 256

export const ORDER_WITHDRAWAL_TEXT_MAX_LENGTH = 2000

export const ORDER_WITHDRAWAL_ORDER_NUMBER_MAX_LENGTH = 32

export const ORDER_WITHDRAWAL_EMAIL_MAX_LENGTH = 320

export const ORDER_WITHDRAWAL_ITEMS_MAX_COUNT = 100

export const ORDER_WITHDRAWAL_QUERY_STALE_MS = 60_000

export const ORDER_WITHDRAWAL_QUERY_KEYS = {
  CUSTOMER_ORDER: ["order-withdrawal", "customerOrder"] as const,
} as const

export const ORDER_WITHDRAWAL_MUTATION_KEYS = {
  WITHDRAW_FROM_CUSTOMER_ORDER: ["order-withdrawal", "withdrawFromCustomerOrder"] as const,
  WITHDRAW_FROM_GUEST_ORDER: ["order-withdrawal", "withdrawFromGuestOrder"] as const,
} as const
