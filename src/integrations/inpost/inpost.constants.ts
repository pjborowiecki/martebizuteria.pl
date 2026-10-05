export const INPOST_QUERY_KEYS = {
  BY_CITY: ["inpost-points", "city"] as const,
} as const

export const INPOST_POINT_NAME_PATTERN = /^[\dA-Z][\w-]{2,31}$/iu
