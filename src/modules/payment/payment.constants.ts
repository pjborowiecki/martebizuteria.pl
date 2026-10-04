export const PAYMENT_METHOD_QUERY_STALE_MS = 60_000

export const SAVED_CARDS_PAGE_LIMIT = 100

export const PAYMENT_METHOD_QUERY_KEYS = {
  SAVED: ["payment", "savedMethods"] as const,
} as const

export const PAYMENT_METHOD_MUTATION_KEYS = {
  CREATE_SETUP_INTENT: ["payment", "createSetupIntent"] as const,
  DELETE: ["payment", "deleteSavedMethod"] as const,
  REMOVE_DUPLICATES: ["payment", "removeDuplicateSavedCards"] as const,
} as const
