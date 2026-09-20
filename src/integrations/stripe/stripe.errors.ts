export const getCheckoutErrorKey = (error: unknown): string => {
  const code = error instanceof Error ? error.message : ""
  return `errors.${CHECKOUT_ERRORS[code] ?? CHECKOUT_ERRORS[CHECKOUT_ERROR_CODES.UNKNOWN_ERROR]}`
}
export const CHECKOUT_ERROR_CODES = {
  INSUFFICIENT_INVENTORY: "INSUFFICIENT_INVENTORY",
  INVALID_PRICE: "INVALID_PRICE",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
} as const
export const CHECKOUT_ERRORS: Record<string, string> = {
  [CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY]: "insufficientInventory",
  [CHECKOUT_ERROR_CODES.INVALID_PRICE]: "invalidPrice",
  [CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND]: "productNotFound",
  [CHECKOUT_ERROR_CODES.UNKNOWN_ERROR]: "unknownError",
  [CHECKOUT_ERROR_CODES.VARIANT_NOT_FOUND]: "variantNotFound",
}
