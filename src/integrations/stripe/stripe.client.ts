import { type Stripe, type StripeElementLocale, loadStripe } from "@stripe/stripe-js"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

const isAppLocale = (value: string): value is SupportedLocale => I18N.SUPPORTED_LOCALES.some((candidate) => candidate === value)

const STRIPE_LOCALES = {
  "en-US": "en",
  "pl-PL": "pl",
} as const satisfies Record<SupportedLocale, StripeElementLocale>

const toStripeLocale = (locale: string): StripeElementLocale => (isAppLocale(locale) ? STRIPE_LOCALES[locale] : "auto")

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
