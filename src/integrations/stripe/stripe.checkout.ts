import type { StripeCheckoutElementsValue } from "@stripe/react-stripe-js/checkout";
import type { StripeCheckoutContact } from "@stripe/stripe-js";

import { stripeActions } from "~/src/integrations/stripe/stripe.actions";

import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";
import type { CartItem } from "~/src/stores/cart.store";

export interface CheckoutSession {
  amount: number;
  clientSecret: string;
  linesFingerprint: string;
  sessionId: string;
}

export function buildCheckoutLinesFingerprint(items: readonly { qty: number; variantId: string }[]): string {
  return items
    .map((item) => `${item.variantId}:${item.qty}`)
    .toSorted((left, right) => left.localeCompare(right))
    .join("|");
}

export function buildCheckoutContact(values: CheckoutFormSchema): StripeCheckoutContact {
  const useBilling = values.sameAsShipping === false;
  return {
    address: {
      city: useBilling ? (values.billingCity ?? "") : values.city,
      country: useBilling ? (values.billingCountryCode ?? "") : values.countryCode,
      line1: useBilling ? (values.billingAddress1 ?? "") : values.address1,
      postal_code: useBilling ? (values.billingPostalCode ?? "") : values.postalCode
    },
    name: useBilling
      ? `${values.billingFirstName ?? ""} ${values.billingLastName ?? ""}`.trim()
      : `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim()
  };
}

interface EnsureSessionArgs {
  amount: number;
  existing: CheckoutSession | undefined;
  items: CartItem[];
  values: CheckoutFormSchema;
}

export async function ensureCheckoutSession({ amount, existing, items, values }: EnsureSessionArgs): Promise<CheckoutSession> {
  const linesFingerprint = buildCheckoutLinesFingerprint(items);

  if (existing === undefined) {
    const created = await stripeActions.createCheckoutSessionFn({
      data: { checkoutValues: values, items }
    });
    return { amount, clientSecret: created.clientSecret, linesFingerprint, sessionId: created.sessionId };
  }

  if (existing.amount !== amount || existing.linesFingerprint !== linesFingerprint) {
    const updated = await stripeActions.updateCheckoutSessionFn({
      data: { checkoutValues: values, items, sessionId: existing.sessionId }
    });
    return { amount, clientSecret: updated.clientSecret, linesFingerprint, sessionId: updated.sessionId };
  }

  return existing;
}

interface ResetSessionArgs {
  amount: number;
  items: CartItem[];
  session: CheckoutSession;
  values: CheckoutFormSchema;
}

/**
 * Rebuilds the Checkout Session on a fresh PaymentIntent and expires the old
 * one server-side. Needed when an async/redirect method (BLIK, Przelewy24) was
 * started and abandoned: that leaves the PaymentIntent in `requires_action`, so
 * the session can no longer be confirmed (Stripe replies "already processed").
 * Expiring the previous session cancels the stranded PaymentIntent, so there is
 * no risk of a late double charge.
 */
export async function resetCheckoutSession({ amount, items, session, values }: ResetSessionArgs): Promise<CheckoutSession> {
  const updated = await stripeActions.updateCheckoutSessionFn({
    data: { checkoutValues: values, items, sessionId: session.sessionId }
  });
  const linesFingerprint = buildCheckoutLinesFingerprint(items);
  return { amount, clientSecret: updated.clientSecret, linesFingerprint, sessionId: updated.sessionId };
}

// Custom Checkout narrows confirm errors to a real decline (`paymentFailed`,
// retry in place) or a session/PaymentIntent-level problem (`code: null`, e.g.
// a stranded async attempt) where the only safe recovery is a fresh session.
const PAYMENT_FAILED_CODE = "paymentFailed";

export type ConfirmOutcome = { status: "success" } | { status: "error"; message: string; recoverable: boolean };

export async function confirmCheckoutSession({
  checkout,
  values
}: Readonly<{ checkout: StripeCheckoutElementsValue; values: CheckoutFormSchema }>): Promise<ConfirmOutcome> {
  const result = await checkout.confirm({
    billingAddress: buildCheckoutContact(values),
    redirect: "if_required"
  });

  if (result.type === "error") {
    return {
      message: result.error.message,
      recoverable: result.error.code !== PAYMENT_FAILED_CODE,
      status: "error"
    };
  }

  return { status: "success" };
}
