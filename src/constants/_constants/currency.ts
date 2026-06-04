/** ISO 4217 codes the storefront and admin accept today (extend as you add regions). */
export const SUPPORTED_CURRENCY_CODES = ["PLN"] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

/** Default settlement currency for catalog, checkout, and Stripe. */
export const STORE_CURRENCY_CODE: SupportedCurrencyCode = "PLN";
