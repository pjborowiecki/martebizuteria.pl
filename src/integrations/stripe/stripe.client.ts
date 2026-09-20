import { type Stripe, type StripeElementLocale, loadStripe } from "@stripe/stripe-js"

import { LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
const isAppLocale = (value: string): value is Locale => LOCALES.some((candidate) => candidate === value)
const toStripeLocale = (locale: string): StripeElementLocale => (isAppLocale(locale) ? locale : "auto")

// Defer Stripe.js until payment to avoid early iframe and telemetry work.
// Checkout Elements uses the locale set when Stripe.js loads.
export const getStripe = (locale?: string): Promise<Stripe | null> => {
  if (stripeRef.current === undefined) {
    if (publishableKey === undefined || publishableKey === "") {
      console.warn("VITE_STRIPE_PUBLISHABLE_KEY is missing. Stripe will not initialize.")
    }
    const elementsLocale = locale === undefined ? undefined : toStripeLocale(locale)
    stripeRef.current = loadStripe(
      publishableKey ?? "",
      elementsLocale === undefined
        ? undefined
        : {
            locale: elementsLocale,
          },
    )
  }
  return stripeRef.current
}
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripeRef: {
  current?: Promise<Stripe | null>
} = {}
