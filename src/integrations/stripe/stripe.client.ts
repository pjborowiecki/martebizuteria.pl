import { loadStripe, type Stripe, type StripeElementLocale } from "@stripe/stripe-js";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripeRef: { current?: Promise<Stripe | null> } = {};

function isAppLocale(value: string): value is Locale {
  return CONSTANTS.LOCALES.some((candidate) => candidate === value);
}

// Every storefront locale is, by design, also a valid Stripe Elements locale, so
// the active locale is passed straight through; anything else falls back to
// Stripe's `auto` (browser) detection. The `return locale` here is a
// compile-time guard — if a future entry in `LOCALES` isn't a valid Stripe
// locale, `Locale` stops being assignable to `StripeElementLocale` and this file
// fails to type-check, forcing an explicit mapping decision.
function toStripeLocale(locale: string): StripeElementLocale {
  return isAppLocale(locale) ? locale : "auto";
}

/**
 * Lazily loads Stripe.js exactly once (memoised), the first time the payment step
 * needs it. Loading is deferred on purpose: Stripe.js injects a cross-origin
 * iframe and starts fraud-detection telemetry as soon as it boots, so pulling it
 * in earlier floods the network with `m.stripe.com` beacons and slows first
 * paint. The locale is fixed at load time (the Checkout Sessions Elements SDK has
 * no per-instance locale option), so the caller passes the active app locale and
 * we map it to a Stripe Elements locale here.
 */
export function getStripe(locale?: string): Promise<Stripe | null> {
  if (stripeRef.current === undefined) {
    if (publishableKey === undefined || publishableKey === "") {
      console.warn("VITE_STRIPE_PUBLISHABLE_KEY is missing. Stripe will not initialize.");
    }
    const elementsLocale = locale === undefined ? undefined : toStripeLocale(locale);
    stripeRef.current = loadStripe(publishableKey ?? "", elementsLocale === undefined ? undefined : { locale: elementsLocale });
  }
  return stripeRef.current;
}
