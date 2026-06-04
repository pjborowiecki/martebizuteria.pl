import { STORE_CURRENCY_CODE, type SupportedCurrencyCode } from "~/src/constants/_constants/currency";

import { getMinPriceMinorUnits } from "~/src/lib/_utils/currency";

export const STRIPE_API_VERSION = "2026-05-27.dahlia" as const;

export const CHECKOUT_PAYMENT_METHOD_ORDER = ["card", "blik", "p24"] as const;

const STRIPE_CURRENCY_BY_CODE = {
  PLN: "pln"
} as const satisfies Record<SupportedCurrencyCode, string>;

/** Stripe API currency code (lowercase ISO 4217). */
export const STRIPE_CURRENCY = STRIPE_CURRENCY_BY_CODE[STORE_CURRENCY_CODE];

/** Minimum sell price in minor units for the store currency (Stripe floor). */
export const STRIPE_MIN_PRICE_CENTS = getMinPriceMinorUnits(STORE_CURRENCY_CODE);

export const STRIPE_WEBHOOK_EVENTS = {
  CHARGE_DISPUTE_CLOSED: "charge.dispute.closed",
  CHARGE_DISPUTE_CREATED: "charge.dispute.created",
  CHARGE_REFUNDED: "charge.refunded",
  CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED: "checkout.session.async_payment_failed",
  CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED: "checkout.session.async_payment_succeeded",
  CHECKOUT_SESSION_COMPLETED: "checkout.session.completed",
  CHECKOUT_SESSION_EXPIRED: "checkout.session.expired",
  PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed"
} as const;
