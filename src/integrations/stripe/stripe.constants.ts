import { STORE_CURRENCY_CODE, type SupportedCurrencyCode } from "~/src/modules/_core/constants/currency"

export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const

export const CHECKOUT_PAYMENT_METHOD_ORDER = ["card", "blik", "p24"] as const

export const STRIPE_QUERY_KEYS = {
  JS: ["stripe", "js"] as const,
} as const

const STRIPE_CURRENCY_BY_CODE = {
  PLN: "pln",
} as const satisfies Record<SupportedCurrencyCode, string>

export const STRIPE_CURRENCY = STRIPE_CURRENCY_BY_CODE[STORE_CURRENCY_CODE]

export const STRIPE_COUPON_SOURCE = "marte_checkout"

export const STRIPE_CHECKOUT_LINE_ITEMS_MAX = 100

export const CHECKOUT_SHIPPING_LINE_ITEMS = 1

export const STRIPE_WEBHOOK_EVENTS = {
  CHARGE_DISPUTE_CLOSED: "charge.dispute.closed",
  CHARGE_DISPUTE_CREATED: "charge.dispute.created",
  CHARGE_REFUNDED: "charge.refunded",
  CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED: "checkout.session.async_payment_failed",
  CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED: "checkout.session.async_payment_succeeded",
  CHECKOUT_SESSION_COMPLETED: "checkout.session.completed",
  CHECKOUT_SESSION_EXPIRED: "checkout.session.expired",
  PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed",
} as const
