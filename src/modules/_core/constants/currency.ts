export const SUPPORTED_CURRENCY_CODES = ["PLN"] as const

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number]

export const STORE_CURRENCY_CODE: SupportedCurrencyCode = "PLN"
