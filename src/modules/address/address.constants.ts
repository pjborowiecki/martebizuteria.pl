export const ADDRESS_COLUMN_LENGTH = {
  address1: 512,
  address2: 512,
  city: 256,
  firstName: 256,
  lastName: 256,
  phone: 32,
  postalCode: 32,
  province: 256,
} as const

export const ADDRESS_QUERY_KEYS = {
  ALL: ["userAddresses"] as const,
} as const

export const ADDRESS_MUTATION_KEYS = {
  DELETE: ["address", "deleteUserAddress"] as const,
  SET_DEFAULT: ["address", "setDefaultUserAddress"] as const,
} as const
