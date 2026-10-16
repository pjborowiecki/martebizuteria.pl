export const DELIVERY_METHOD = {
  COURIER: "courier",
  IN_STORE: "in_store",
  LOCKER: "locker",
} as const

export const DELIVERY_METHODS = [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.LOCKER, DELIVERY_METHOD.IN_STORE] as const

export type DeliveryMethodType = (typeof DELIVERY_METHODS)[number]

export const SINGLE_OFFER_DELIVERY_METHODS: ReadonlySet<DeliveryMethodType> = new Set([DELIVERY_METHOD.LOCKER, DELIVERY_METHOD.IN_STORE])

export const DELIVERY_COUNTRY_CODES: ReadonlySet<string> = new Set(["PL"])

export const DELIVERY_METHOD_NAME_MAX_LENGTH = 80

export const DELIVERY_METHOD_PRICE_MAX = 1_000_000

export const DELIVERY_METHOD_ERROR = {
  LAST_OFFERED: "DELIVERY_METHOD_LAST_OFFERED",
  LOCKER_NEEDS_INPOST: "DELIVERY_METHOD_LOCKER_NEEDS_INPOST",
  NOT_FOUND: "DELIVERY_METHOD_NOT_FOUND",
  TYPE_ALREADY_OFFERED: "DELIVERY_METHOD_TYPE_ALREADY_OFFERED",
} as const

export type DeliveryMethodError = (typeof DELIVERY_METHOD_ERROR)[keyof typeof DELIVERY_METHOD_ERROR]

export const DELIVERY_METHOD_QUERY_KEYS = {
  ADMIN: {
    ALL: ["admin", "delivery-methods"] as const,
  },
  ALL: ["deliveryMethods"] as const,
} as const

export const DELIVERY_METHOD_MUTATION_KEYS = {
  ARCHIVE: ["delivery-method", "archive"] as const,
  CREATE: ["delivery-method", "create"] as const,
  REORDER: ["delivery-method", "reorder"] as const,
  UPDATE: ["delivery-method", "update"] as const,
} as const
