export const ADDRESS_QUERY_KEYS = {
  ALL: ["userAddresses"] as const,
} as const

export const ADDRESS_MUTATION_KEYS = {
  DELETE: ["address", "deleteUserAddress"] as const,
  SET_DEFAULT: ["address", "setDefaultUserAddress"] as const,
} as const
