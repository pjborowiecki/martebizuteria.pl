export const DELIVERY_METHOD = {
  COURIER: "courier",
  IN_STORE: "in_store",
  LOCKER: "locker",
} as const

export const DELIVERY_METHODS = [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.LOCKER, DELIVERY_METHOD.IN_STORE] as const

export type DeliveryMethodType = (typeof DELIVERY_METHODS)[number]

export const DELIVERY_METHOD_QUERY_KEYS = {
  ALL: ["deliveryMethods"] as const,
} as const
