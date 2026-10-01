export const PAYMENT_METHOD_QUERY_STALE_MS = 60_000

export const PAYMENT_METHOD_QUERY_KEYS = {
  SAVED: ["payment", "savedMethods"] as const,
} as const

export const PAYMENT_METHOD_MUTATION_KEYS = {
  DELETE: ["payment", "deleteSavedMethod"] as const,
} as const
