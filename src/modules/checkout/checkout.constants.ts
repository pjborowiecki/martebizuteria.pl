export const CHECKOUT_QUERY_KEYS = {
  SESSION_STATUS: ["checkout", "session-status"] as const,
} as const

export const COMPANY_NAME_MAX_LENGTH = 256

export const OPEN_CHECKOUTS_PER_CLIENT_ADDRESS_MAX = 5

export const OPEN_CHECKOUTS_PER_EMAIL_MAX = 3

const CHECKOUT_PAYMENT_METADATA_KEYS = [
  "checkoutId",
  "deployment",
  "discountCode",
  "discountTotal",
  "locale",
  "shippingTotal",
  "userId",
] as const

export type CheckoutPaymentMetadata = Record<(typeof CHECKOUT_PAYMENT_METADATA_KEYS)[number], string>
