export const CHECKOUT_PAYMENT_METHOD_ORDER = ["card", "blik", "p24"] as const;

export const STRIPE_CURRENCY = "pln" as const;

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
