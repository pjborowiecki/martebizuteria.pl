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

export const DELIVERY_METHOD_STATUS = {
  ARCHIVED: "archived",
  HIDDEN: "hidden",
  OFFERED: "offered",
} as const

export const DELIVERY_METHOD_STATUSES = [
  DELIVERY_METHOD_STATUS.OFFERED,
  DELIVERY_METHOD_STATUS.HIDDEN,
  DELIVERY_METHOD_STATUS.ARCHIVED,
] as const

export type DeliveryMethodStatus = (typeof DELIVERY_METHOD_STATUSES)[number]

export const ADMIN_DELIVERY_METHODS_PAGE_SIZE = 25

export const DELIVERY_METHOD_TABLE_COLUMN_ID = {
  actions: "actions",
  carrier: "carrier",
  drag: "drag",
  editedAt: "editedAt",
  name: "name",
  nameEn: "name-en-US",
  namePl: "name-pl-PL",
  price: "price",
  status: "status",
  type: "type",
} as const

export const DELIVERY_METHOD_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [DELIVERY_METHOD_TABLE_COLUMN_ID.editedAt]: false,
  [DELIVERY_METHOD_TABLE_COLUMN_ID.nameEn]: false,
  [DELIVERY_METHOD_TABLE_COLUMN_ID.namePl]: false,
} as const

export const DELIVERY_METHOD_TABLE_COLUMN_SIZE = {
  actions: 48,
  carrier: 180,
  drag: 40,
  editedAt: 160,
  name: 240,
  price: 120,
  status: 160,
  type: 180,
} as const

export const DELIVERY_METHOD_TABLE_COLUMN_PINNING = {
  end: [DELIVERY_METHOD_TABLE_COLUMN_ID.actions],
  start: [DELIVERY_METHOD_TABLE_COLUMN_ID.drag, DELIVERY_METHOD_TABLE_COLUMN_ID.name],
}

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
